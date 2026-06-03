'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { upsertNotificationPrefs } from '@/lib/actions/notifications'
import type { NotificationPref } from '@/types'

const DAYS_OPTIONS = [30, 7, 1]

export default function NotificationsClient({
  currentUserId,
  initialPrefs,
}: {
  currentUserId: string
  initialPrefs: NotificationPref | null
}) {
  const [daysBefore, setDaysBefore] = useState<number[]>(
    initialPrefs?.daysBefore ?? [30, 7, 1],
  )
  const [emailEnabled, setEmailEnabled] = useState<boolean>(
    initialPrefs?.emailEnabled ?? true,
  )
  const [inAppEnabled, setInAppEnabled] = useState<boolean>(
    initialPrefs?.inAppEnabled ?? true,
  )
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function toggleDay(day: number) {
    setDaysBefore((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    )
  }

  function handleSave() {
    setError(null)
    setSuccessMsg(null)
    startTransition(async () => {
      try {
        await upsertNotificationPrefs(currentUserId, {
          daysBefore,
          emailEnabled,
          inAppEnabled,
        })
        setSuccessMsg('Preferenze salvate con successo')
      } catch {
        setError('Errore durante il salvataggio delle preferenze')
      }
    })
  }

  return (
    <div className="space-y-6 max-w-md">
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
      {successMsg && (
        <Alert>
          <p className="text-sm">{successMsg}</p>
        </Alert>
      )}

      {/* Days before */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">Anticipo notifiche scadenza</label>
        <div className="flex gap-4">
          {DAYS_OPTIONS.map((day) => (
            <label key={day} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={daysBefore.includes(day)}
                onChange={() => toggleDay(day)}
                disabled={isPending}
                className="h-4 w-4 rounded border-input"
              />
              <span className="text-sm">{day} giorni prima</span>
            </label>
          ))}
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-3">
        <label className="text-sm font-semibold">Canali di notifica</label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={emailEnabled}
              onChange={(e) => setEmailEnabled(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input"
            />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">
                Ricevi notifiche via email
              </p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={inAppEnabled}
              onChange={(e) => setInAppEnabled(e.target.checked)}
              disabled={isPending}
              className="h-4 w-4 rounded border-input"
            />
            <div>
              <p className="text-sm font-medium">In-app</p>
              <p className="text-xs text-muted-foreground">
                Ricevi notifiche nell&apos;app
              </p>
            </div>
          </label>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Salvataggio...' : 'Salva preferenze'}
      </Button>
    </div>
  )
}
