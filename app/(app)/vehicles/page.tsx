import Link from 'next/link'
import { Plus } from 'lucide-react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getVehicles } from '@/lib/actions/vehicles'
import { Button } from '@/components/ui/button'
import { VehiclesList } from '@/components/vehicles-list'
import type { Vehicle } from '@/types'

export default async function VehiclesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const vehicles: Vehicle[] = await getVehicles(user.id).catch(() => [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Veicoli</h1>
          <p className="text-muted-foreground mt-1 text-sm">{vehicles.length} veicoli</p>
        </div>
        <Button asChild size="sm">
          <Link href="/vehicles/new">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Aggiungi veicolo</span>
            <span className="sm:hidden">Aggiungi</span>
          </Link>
        </Button>
      </div>

      <VehiclesList vehicles={vehicles} />
    </div>
  )
}
