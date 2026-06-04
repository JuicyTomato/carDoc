import Link from 'next/link'
import { Plus, Car, Bike, Truck, HelpCircle } from 'lucide-react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { getVehicles } from '@/lib/actions/vehicles'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Vehicle } from '@/types'

function VehicleTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'car': return <Car className="h-5 w-5" />
    case 'moto': return <Bike className="h-5 w-5" />
    case 'truck': return <Truck className="h-5 w-5" />
    default: return <HelpCircle className="h-5 w-5" />
  }
}

function vehicleTypeLabel(type: string): string {
  switch (type) {
    case 'car': return 'Auto'
    case 'moto': return 'Moto'
    case 'truck': return 'Camion'
    default: return 'Altro'
  }
}

function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link href={`/vehicles/${vehicle.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
              <VehicleTypeIcon type={vehicle.type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">
                {vehicle.make} {vehicle.model}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {vehicle.year && (
                  <span className="text-xs text-muted-foreground">{vehicle.year}</span>
                )}
                {vehicle.plate && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {vehicle.plate}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {vehicleTypeLabel(vehicle.type)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

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

      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Nessun veicolo</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Non hai ancora aggiunto veicoli.
          </p>
          <Button asChild className="mt-6">
            <Link href="/vehicles/new">
              <Plus className="mr-2 h-4 w-4" />
              Aggiungi il tuo primo veicolo
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <VehicleRow key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
