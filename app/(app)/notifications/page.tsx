import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { Bell } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getAllNotifications } from '@/lib/actions/notifications'
import { Badge } from '@/components/ui/badge'
import { parseLocale, formatDate } from '@/lib/utils/format'

export default async function NotificationsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const locale = parseLocale(headers().get('accept-language'))
  const notifs = await getAllNotifications(user.id)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Storico notifiche</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tutte le notifiche inviate al tuo account.
        </p>
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <Bell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">Nessuna notifica inviata</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-3 min-w-0">
                {n.channel === 'email' ? (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 shrink-0">
                    Email
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    In-app
                  </Badge>
                )}
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">
                    {n.documentId
                      ? `Doc: ${n.documentId.slice(0, 8)}…`
                      : 'Nessun documento'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-right">
                <span className="text-xs text-muted-foreground">
                  {n.sentAt ? formatDate(n.sentAt, locale) : '—'}
                </span>
                {n.channel === 'email' ? (
                  <span className="text-xs text-muted-foreground">Inviata</span>
                ) : n.readAt ? (
                  <span className="text-xs text-green-600 font-medium">Letta</span>
                ) : (
                  <span className="text-xs text-muted-foreground">Non letta</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
