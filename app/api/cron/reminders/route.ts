import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { db } from '@/db'
import { documents, vehicles, vehicleAccess, notificationPrefs, notifications } from '@/db/schema'
import { eq, and, gte, lt, isNull, inArray } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ExpiryReminder, { type ExpiryItem } from '@/emails/expiry-reminder'

const DAYS_BEFORE_VALUES = [30, 7, 1] as const

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  insurance: 'Assicurazione',
  revision: 'Revisione',
  maintenance: 'Manutenzione',
  tax: 'Bollo',
  registration: 'Immatricolazione',
  other: 'Documento',
}

function formatDateIT(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function getTargetDateStr(daysAhead: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

function getTodayBounds(): { start: Date; end: Date } {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

type DocEntry = {
  id: string
  vehicleId: string
  type: string
  title: string
  expiryDate: string | null
  daysAhead: number
  vehicleName: string
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${process.env.CRON_SECRET ?? ''}`
  const valid =
    authHeader.length === expected.length &&
    timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  if (!valid) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) console.warn('[cron/reminders] RESEND_API_KEY not set — email disabled')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cardoc.app'
  const { start: todayStart, end: todayEnd } = getTodayBounds()

  // Load all prefs
  const allPrefs = await db.select().from(notificationPrefs).where(isNull(notificationPrefs.vehicleId))
  if (allPrefs.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'no prefs configured' })
  }
  const prefsMap = new Map(allPrefs.map((p) => [p.userId, p]))

  // ── Step 1: collect all expiring docs across all daysAhead values ──────────

  // userId → DocEntry[]  (all docs this user should be notified about)
  const userDocMap = new Map<string, DocEntry[]>()

  for (const daysAhead of DAYS_BEFORE_VALUES) {
    const targetDateStr = getTargetDateStr(daysAhead)

    const expiringDocs = await db
      .select({
        id: documents.id,
        vehicleId: documents.vehicleId,
        type: documents.type,
        title: documents.title,
        expiryDate: documents.expiryDate,
      })
      .from(documents)
      .where(and(eq(documents.expiryDate, targetDateStr), eq(documents.isActive, true)))

    if (expiringDocs.length === 0) continue

    const vehicleIds = Array.from(new Set(expiringDocs.map((d) => d.vehicleId)))

    const vehicleRows = await db
      .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model, year: vehicles.year, responsibleUserId: vehicles.responsibleUserId })
      .from(vehicles)
      .where(inArray(vehicles.id, vehicleIds))
    const vehicleMap = new Map(vehicleRows.map((v) => [v.id, v]))

    const accessRows = await db
      .select({ vehicleId: vehicleAccess.vehicleId, userId: vehicleAccess.userId })
      .from(vehicleAccess)
      .where(inArray(vehicleAccess.vehicleId, vehicleIds))
    const vehicleUserMap = new Map<string, string[]>()
    for (const row of accessRows) {
      const existing = vehicleUserMap.get(row.vehicleId) ?? []
      existing.push(row.userId)
      vehicleUserMap.set(row.vehicleId, existing)
    }

    for (const doc of expiringDocs) {
      const vehicle = vehicleMap.get(doc.vehicleId)
      const userIds = vehicle?.responsibleUserId
        ? [vehicle.responsibleUserId]
        : (vehicleUserMap.get(doc.vehicleId) ?? [])

      const vehicleName = vehicle
        ? `${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}`
        : 'Veicolo'

      const entry: DocEntry = {
        id: doc.id,
        vehicleId: doc.vehicleId,
        type: doc.type,
        title: doc.title,
        expiryDate: doc.expiryDate,
        daysAhead,
        vehicleName,
      }

      for (const userId of userIds) {
        const prefs = prefsMap.get(userId)
        if (!prefs) continue
        const userDaysBefore = prefs.daysBefore ?? [30, 7, 1]
        if (!userDaysBefore.includes(daysAhead)) continue

        const existing = userDocMap.get(userId) ?? []
        existing.push(entry)
        userDocMap.set(userId, existing)
      }
    }
  }

  // ── Step 2: for each user send ONE digest email + in-app per doc ──────────

  let totalSent = 0
  let totalSkipped = 0

  for (const [userId, allDocs] of Array.from(userDocMap.entries())) {
    const prefs = prefsMap.get(userId)!

    // ── Email digest ─────────────────────────────────────────────────────────
    if (prefs.emailEnabled && resend) {
      // Filter out docs already emailed today
      const notYetEmailed: DocEntry[] = []
      for (const doc of allDocs) {
        const existing = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(
            eq(notifications.documentId, doc.id),
            eq(notifications.userId, userId),
            eq(notifications.channel, 'email'),
            gte(notifications.sentAt, todayStart),
            lt(notifications.sentAt, todayEnd),
          ))
          .limit(1)
        if (existing.length === 0) notYetEmailed.push(doc)
        else totalSkipped++
      }

      if (notYetEmailed.length > 0) {
        let userEmail: string | undefined
        let userName: string | undefined
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
          if (!error && data.user) {
            userEmail = data.user.email
            userName = data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? 'Utente'
          }
        } catch (err) {
          console.error(`[cron/reminders] Failed to fetch user ${userId}:`, err)
        }

        if (userEmail) {
          try {
            const items: ExpiryItem[] = notYetEmailed.map((doc) => ({
              vehicleName: doc.vehicleName,
              documentType: DOCUMENT_TYPE_LABELS[doc.type] ?? DOCUMENT_TYPE_LABELS.other,
              documentTitle: doc.title,
              expiryDate: doc.expiryDate ? formatDateIT(doc.expiryDate) : 'data sconosciuta',
              daysUntilExpiry: doc.daysAhead,
              appUrl: `${appUrl}/vehicles/${doc.vehicleId}/docs/${doc.id}`,
            }))

            const subject = items.length === 1
              ? `Scadenza ${items[0].documentType} — ${items[0].vehicleName}`
              : `carDoc — ${items.length} scadenze nei prossimi giorni`

            const html = await render(
              ExpiryReminder({ userName: userName ?? 'Utente', items, settingsUrl: `${appUrl}/settings` })
            )

            await resend.emails.send({
              from: 'carDoc <onboarding@resend.dev>',
              to: userEmail,
              subject,
              html,
            })

            // Insert notification record per doc
            for (const doc of notYetEmailed) {
              await db.insert(notifications).values({
                userId,
                documentId: doc.id,
                type: 'expiry_warning',
                channel: 'email',
              })
            }

            totalSent++
          } catch (err) {
            console.error(`[cron/reminders] Failed to send digest to user ${userId}:`, err)
            totalSkipped++
          }
        } else {
          totalSkipped += notYetEmailed.length
        }
      }
    }

    // ── In-app: still one notification per doc ────────────────────────────────
    if (prefs.inAppEnabled) {
      for (const doc of allDocs) {
        const existing = await db
          .select({ id: notifications.id })
          .from(notifications)
          .where(and(
            eq(notifications.documentId, doc.id),
            eq(notifications.userId, userId),
            eq(notifications.channel, 'in_app'),
            gte(notifications.sentAt, todayStart),
            lt(notifications.sentAt, todayEnd),
          ))
          .limit(1)

        if (existing.length > 0) {
          totalSkipped++
        } else {
          try {
            await db.insert(notifications).values({ userId, documentId: doc.id, type: 'expiry_warning', channel: 'in_app' })
            totalSent++
          } catch (err) {
            console.error(`[cron/reminders] In-app failed for doc ${doc.id} user ${userId}:`, err)
            totalSkipped++
          }
        }
      }
    }
  }

  return NextResponse.json({ sent: totalSent, skipped: totalSkipped })
}
