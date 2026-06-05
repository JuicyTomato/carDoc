import Link from 'next/link'
import { Plus, Archive, Car, Bike, Truck, HelpCircle, ChevronDown } from 'lucide-react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getVehicles, getArchivedVehicles } from '@/lib/actions/vehicles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { VehiclesList } from '@/components/vehicles-list'
import { RestoreVehicleButton } from '@/components/restore-vehicle-button'
import type { Vehicle } from '@/types'

function VehicleTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'car': return <Car className="h-4 w-4" />
    case 'moto': return <Bike className="h-4 w-4" />
    case 'truck': return <Truck className="h-4 w-4" />
    default: return <HelpCircle className="h-4 w-4" />
  }
}

function ArchivedVehicleRow({ vehicle, userId }: { vehicle: Vehicle; userId: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border px-3 py-2.5 bg-muted/30 gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-muted-foreground shrink-0">
          <VehicleTypeIcon type={vehicle.type} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate text-muted-foreground">
            {vehicle.make} {vehicle.model}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {vehicle.year && (
              <span className="text-xs text-muted-foreground">{vehicle.year}</span>
            )}
            {vehicle.plate && (
              <Badge variant="outline" className="font-mono text-xs opacity-60">
                {vehicle.plate}
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="shrink-0">
        <RestoreVehicleButton vehicleId={vehicle.id} userId={userId} />
      </div>
    </div>
  )
}

export default async function VehiclesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [vehicles, archivedVehicles] = await Promise.all([
    getVehicles(user.id).catch(() => [] as Vehicle[]),
    getArchivedVehicles(user.id).catch(() => [] as Vehicle[]),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Veicoli</h1>
          <p className="text-muted-foreground mt-1 text-sm">{vehicles.length} veicoli attivi</p>
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

      {archivedVehicles.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium hover:bg-accent/50 transition-colors text-muted-foreground">
            <div className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              <span>Veicoli archiviati</span>
              <Badge variant="secondary">{archivedVehicles.length}</Badge>
            </div>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            {archivedVehicles.map((v) => (
              <ArchivedVehicleRow key={v.id} vehicle={v} userId={user.id} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}
