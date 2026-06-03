'use server'

import { db } from '@/db'
import { notificationPrefs } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import type { NotificationPref } from '@/types'

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
