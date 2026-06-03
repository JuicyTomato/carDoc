'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { getUserNotifications, markNotificationRead } from '@/lib/actions/notifications'
import type { Notification } from '@/types'

interface NotificationBellProps {
  userId: string
}

function formatRelativeTime(date: Date | string | null): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Adesso'
  if (diffHours < 24) return `${diffHours}h fa`
  if (diffDays === 1) return 'Ieri'
  return `${diffDays} giorni fa`
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const unreadCount = notifs.filter((n) => !n.readAt).length

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getUserNotifications(userId, 10)
        setNotifs(data)
      } catch {
        // silently fail — non-critical UI
      }
    })
  }, [userId])

  async function handleMarkRead(notificationId: string) {
    try {
      await markNotificationRead(notificationId, userId)
      setNotifs((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, readAt: new Date() } : n,
        ),
      )
    } catch {
      // silently fail
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-8 w-8"
          aria-label="Notifiche"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifiche</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {unreadCount} non {unreadCount === 1 ? 'letta' : 'lette'}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifs.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Nessuna notifica
          </div>
        ) : (
          notifs.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-0.5 px-3 py-2.5 cursor-pointer ${
                !n.readAt ? 'bg-blue-50/60 hover:bg-blue-50' : ''
              }`}
              onClick={() => {
                if (!n.readAt) {
                  handleMarkRead(n.id)
                }
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="text-sm font-medium leading-snug">
                  {n.type === 'expiry_warning' ? 'Scadenza documento' : 'Notifica'}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelativeTime(n.sentAt)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {n.documentId ? `Documento in scadenza` : 'Nessun dettaglio'}
              </span>
              {!n.readAt && (
                <span className="mt-0.5 text-[10px] text-blue-600 font-medium">
                  Tocca per segnare come letta
                </span>
              )}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
