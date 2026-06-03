'use server'

import { db } from '@/db'
import { notificationPrefs, notifications } from '@/db/schema'
import { eq, and, isNull, isNotNull, desc } from 'drizzle-orm'
import type { Notification, NotificationPref } from '@/types'

export async function getNotificationPrefs(userId: string): Promise<NotificationPref | null> {
  const rows = await db
    .select()
    .from(notificationPrefs)
    .where(and(eq(notificationPrefs.userId, userId), isNull(notificationPrefs.vehicleId)))
    .limit(1)

  return rows[0] ?? null
}

export async function upsertNotificationPrefs(
  userId: string,
  prefs: {
    daysBefore: number[]
    emailEnabled: boolean
    inAppEnabled: boolean
  },
): Promise<void> {
  const existing = await getNotificationPrefs(userId)

  if (existing) {
    await db
      .update(notificationPrefs)
      .set({
        daysBefore: prefs.daysBefore,
        emailEnabled: prefs.emailEnabled,
        inAppEnabled: prefs.inAppEnabled,
      })
      .where(and(eq(notificationPrefs.userId, userId), isNull(notificationPrefs.vehicleId)))
  } else {
    await db.insert(notificationPrefs).values({
      userId,
      vehicleId: undefined,
      daysBefore: prefs.daysBefore,
      emailEnabled: prefs.emailEnabled,
      inAppEnabled: prefs.inAppEnabled,
    })
  }
}

// ─── In-app notification actions ──────────────────────────────────────────────

export async function getUserNotifications(
  userId: string,
  limit = 10,
): Promise<Notification[]> {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.channel, 'in_app'),
      ),
    )
    .orderBy(desc(notifications.sentAt))
    .limit(limit)
}

export async function markNotificationRead(
  notificationId: string,
  userId: string,
): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        isNotNull(notifications.channel),
      ),
    )
}

export async function createInAppNotification(
  userId: string,
  documentId: string,
  _message: string,
): Promise<void> {
  await db.insert(notifications).values({
    userId,
    documentId,
    type: 'expiry_warning',
    channel: 'in_app',
  })
}
