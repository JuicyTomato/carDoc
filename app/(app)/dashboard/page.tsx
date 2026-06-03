import Link from 'next/link'
import { Plus, Car, AlertTriangle } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getVehicles } from '@/lib/actions/vehicles'
import { getExpiringDocuments } from '@/lib/actions/documents'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Vehicle, Document } from '@/types'

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Badge variant="destructive">Scaduto</Badge>
  }
  if (diffDays < 14) {
    return <Badge variant="destructive">{diffDays}g</Badge>
  }
  if (diffDays < 30) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{diffDays}g</Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      {expiry.toLocaleDateString('it-IT')}
    </Badge>
  )
}

function vehicleTypeLabel(type: string): string {
  switch (type) {
    case 'car': return 'Auto'
    case 'moto': return 'Moto'
    case 'truck': return 'Camion'
    default: return 'Altro'
  }
}

function VehicleCard({
  vehicle,
  expiringDocs,
}: {
  vehicle: Vehicle
  expiringDocs: Document[]
}) {
  const vehicleDocs = expiringDocs.filter((d) => d.vehicleId === vehicle.id)

  return (
    <Link href={`/vehicles/${vehicle.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <p className="font-semibold">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {vehicle.year && <span>{vehicle.year}</span>}
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

            {vehicleDocs.length > 0 && (
              <div className="shrink-0 flex flex-wrap gap-1 justify-end max-w-[200px]">
                {vehicleDocs.slice(0, 3).map((doc) => (
                  <span key={doc.id} className="text-xs text-muted-foreground flex items-center gap-1">
                    {doc.title}:
                    <ExpiryBadge expiryDate={doc.expiryDate} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function DashboardPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const vehicles: Vehicle[] = user ? await getVehicles(user.id).catch(() => []) : []
  const expiringIn30: Document[] = user
    ? await getExpiringDocuments(user.id, 30).catch(() => [])
    : []
  const urgentDocs = expiringIn30.filter((d) => {
    if (!d.expiryDate) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiry = new Date(d.expiryDate)
    const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays < 7
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">La tua flotta</h1>
          <p className="text-muted-foreground mt-1">
            Benvenuto, {user?.email}
          </p>
        </div>
        <Button asChild>
          <Link href="/vehicles/new">
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi veicolo
          </Link>
        </Button>
      </div>

      {/* Urgent alert */}
      {urgentDocs.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            <span className="font-semibold">Attenzione:</span>{' '}
            {urgentDocs.length === 1
              ? `1 documento scade entro 7 giorni`
              : `${urgentDocs.length} documenti scadono entro 7 giorni`}
            {urgentDocs.map((d) => (
              <span key={d.id} className="block text-sm mt-1">
                &bull; {d.title}{' '}
                {d.expiryDate
                  ? `— ${new Date(d.expiryDate).toLocaleDateString('it-IT')}`
                  : ''}
              </span>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Vehicles list */}
      {vehicles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nessun veicolo</CardTitle>
            <CardDescription>
              Non hai ancora aggiunto veicoli. Aggiungi il primo veicolo per iniziare.
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
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Veicoli ({vehicles.length})
          </h2>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              expiringDocs={expiringIn30}
            />
          ))}
        </div>
      )}
    </div>
  )
}
