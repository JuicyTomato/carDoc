import Link from 'next/link'
import { Plus } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Benvenuto, {user?.email}!
        </h1>
        <p className="text-muted-foreground mt-1">La tua flotta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nessun veicolo</CardTitle>
          <CardDescription>
            Nessun veicolo ancora. Aggiungi il primo veicolo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/vehicles/new">
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi veicolo
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
