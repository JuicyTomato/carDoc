import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { render } from '@react-email/components'
import { db } from '@/db'
import { documents, vehicles, vehicleAccess, notificationPrefs, notifications } from '@/db/schema'
import { eq, and, gte, lt, isNull, inArray } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'
import ExpiryReminder from '@/emails/expiry-reminder'

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

// Returns "YYYY-MM-DD" for today + daysAhead (UTC)
function getTargetDateStr(daysAhead: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + daysAhead)
  return d.toISOString().slice(0, 10)
}

// Returns "YYYY-MM-DD 00:00:00+00" bounds for "today" in UTC
function getTodayBounds(): { start: Date; end: Date } {
  const start = new Date()
  start.setUTCHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export async function GET(request: NextRequest) {
  // 1. Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  if (!resend) {
    console.warn('[cron/reminders] RESEND_API_KEY not set — email sending disabled')
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://cardoc.app'
  const { start: todayStart, end: todayEnd } = getTodayBounds()

  let totalSent = 0
  let totalSkipped = 0

  // 2. Load global notification prefs (per user, where vehicleId IS NULL)
  const allPrefs = await db
    .select()
    .from(notificationPrefs)
    .where(isNull(notificationPrefs.vehicleId))

  if (allPrefs.length === 0) {
    return NextResponse.json({ sent: 0, skipped: 0, reason: 'no prefs configured' })
  }

  // Build a map userId → prefs for quick lookup
  const prefsMap = new Map(allPrefs.map((p) => [p.userId, p]))

  // 3. For each configured daysAhead value, find docs expiring on that exact day
  for (const daysAhead of DAYS_BEFORE_VALUES) {
    const targetDateStr = getTargetDateStr(daysAhead)

    // Documents expiring on exactly targetDate (date column = string YYYY-MM-DD)
    const expiringDocs = await db
      .select({
        id: documents.id,
        vehicleId: documents.vehicleId,
        type: documents.type,
        title: documents.title,
        expiryDate: documents.expiryDate,
      })
      .from(documents)
      .where(
        and(
          eq(documents.expiryDate, targetDateStr),
          eq(documents.isActive, true),
        ),
      )

    if (expiringDocs.length === 0) continue

    const vehicleIds = Array.from(new Set(expiringDocs.map((d) => d.vehicleId)))

    // Get vehicle info for display
    const vehicleRows = await db
      .select({
        id: vehicles.id,
        make: vehicles.make,
        model: vehicles.model,
        year: vehicles.year,
      })
      .from(vehicles)
      .where(inArray(vehicles.id, vehicleIds))

    const vehicleMap = new Map(vehicleRows.map((v) => [v.id, v]))

    // Get all users who have access to these vehicles
    const accessRows = await db
      .select({
        vehicleId: vehicleAccess.vehicleId,
        userId: vehicleAccess.userId,
      })
      .from(vehicleAccess)
      .where(inArray(vehicleAccess.vehicleId, vehicleIds))

    // Group accesses by vehicleId for quick lookup
    const vehicleUserMap = new Map<string, string[]>()
    for (const row of accessRows) {
      const existing = vehicleUserMap.get(row.vehicleId) ?? []
      existing.push(row.userId)
      vehicleUserMap.set(row.vehicleId, existing)
    }

    // 4. For each doc × user combination
    for (const doc of expiringDocs) {
      const userIds = vehicleUserMap.get(doc.vehicleId) ?? []
      const vehicle = vehicleMap.get(doc.vehicleId)

      for (const userId of userIds) {
        const prefs = prefsMap.get(userId)

        // Check user has prefs and wants this daysAhead value
        if (!prefs) {
          totalSkipped++
          continue
        }
        const userDaysBefore = prefs.daysBefore ?? [30, 7, 1]
        if (!userDaysBefore.includes(daysAhead)) {
          totalSkipped++
          continue
        }

        // ── Email notification ────────────────────────────────────────────────
        if (prefs.emailEnabled && resend) {
          // Dedup: already emailed today?
          const existingEmail = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.documentId, doc.id),
                eq(notifications.userId, userId),
                eq(notifications.channel, 'email'),
                gte(notifications.sentAt, todayStart),
                lt(notifications.sentAt, todayEnd),
              ),
            )
            .limit(1)

          if (existingEmail.length > 0) {
            totalSkipped++
          } else {
            // Get user email from Supabase auth
            let userEmail: string | undefined
            let userName: string | undefined
            try {
              const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId)
              if (!error && data.user) {
                userEmail = data.user.email
                userName =
                  data.user.user_metadata?.full_name ??
                  data.user.user_metadata?.name ??
                  data.user.email?.split('@')[0] ??
                  'Utente'
              }
            } catch (err) {
              console.error(`[cron/reminders] Failed to fetch user ${userId}:`, err)
            }

            if (userEmail) {
              try {
                const vehicleName = vehicle
                  ? `${vehicle.make} ${vehicle.model}${vehicle.year ? ` ${vehicle.year}` : ''}`
                  : 'Veicolo'

                const documentTypeLabel =
                  DOCUMENT_TYPE_LABELS[doc.type] ?? DOCUMENT_TYPE_LABELS.other
                const expiryDateFormatted = doc.expiryDate
                  ? formatDateIT(doc.expiryDate)
                  : 'data sconosciuta'

                const html = await render(
                  ExpiryReminder({
                    userName: userName ?? 'Utente',
                    vehicleName,
                    documentType: documentTypeLabel,
                    documentTitle: doc.title,
                    expiryDate: expiryDateFormatted,
                    daysUntilExpiry: daysAhead,
                    appUrl: `${appUrl}/vehicles/${doc.vehicleId}/docs/${doc.id}`,
                  }),
                )

                await resend.emails.send({
                  from: 'carDoc <onboarding@resend.dev>',
                  to: userEmail,
                  subject: `Scadenza ${documentTypeLabel} - ${vehicleName}`,
                  html,
                })

                await db.insert(notifications).values({
                  userId,
                  documentId: doc.id,
                  type: 'expiry_warning',
                  channel: 'email',
                })

                totalSent++
              } catch (err) {
                console.error(
                  `[cron/reminders] Failed to send email for doc ${doc.id} user ${userId}:`,
                  err,
                )
                totalSkipped++
              }
            } else {
              totalSkipped++
            }
          }
        }

        // ── In-app notification ───────────────────────────────────────────────
        if (prefs.inAppEnabled) {
          // Dedup: already created in-app notification today?
          const existingInApp = await db
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.documentId, doc.id),
                eq(notifications.userId, userId),
                eq(notifications.channel, 'in_app'),
                gte(notifications.sentAt, todayStart),
                lt(notifications.sentAt, todayEnd),
              ),
            )
            .limit(1)

          if (existingInApp.length > 0) {
            totalSkipped++
          } else {
            try {
              await db.insert(notifications).values({
                userId,
                documentId: doc.id,
                type: 'expiry_warning',
                channel: 'in_app',
              })
              totalSent++
            } catch (err) {
              console.error(
                `[cron/reminders] Failed to insert in-app notification for doc ${doc.id} user ${userId}:`,
                err,
              )
              totalSkipped++
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ sent: totalSent, skipped: totalSkipped })
}
