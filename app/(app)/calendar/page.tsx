import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getExpiringDocumentsWithVehicle } from '@/lib/actions/documents'
import { parseLocale } from '@/lib/utils/format'
import CalendarView from './calendar-view'

export default async function CalendarPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const locale = parseLocale(headers().get('accept-language'))
  const docs = await getExpiringDocumentsWithVehicle(user.id, 365).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
        <p className="text-muted-foreground mt-1">Panoramica delle scadenze dei tuoi veicoli</p>
      </div>
      <CalendarView docs={docs} locale={locale} />
    </div>
  )
}
