import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getExpiringDocumentsWithVehicle } from '@/lib/actions/documents'
import { parseLocale } from '@/lib/utils/format'
import { ExpiringList } from './expiring-list'

export default async function ExpiringPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const locale = parseLocale(headers().get('accept-language'))
  // Fetch 90 days — client filters down to selected range
  const docs = await getExpiringDocumentsWithVehicle(user.id, 90).catch(() => [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Scadenze</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Documenti in scadenza nei prossimi 90 giorni
        </p>
      </div>
      <ExpiringList docs={docs} locale={locale} />
    </div>
  )
}
