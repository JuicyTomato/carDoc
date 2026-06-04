import Link from 'next/link'
import { headers } from 'next/headers'
import { Plus, Car, Bike, Truck, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getVehicles } from '@/lib/actions/vehicles'
import { getExpiringDocuments } from '@/lib/actions/documents'
import { parseLocale, formatDate } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import type { Vehicle, Document } from '@/types'

function ExpiryBadge({ expiryDate, locale }: { expiryDate: string | null; locale: string }) {
  if (!expiryDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Badge variant="destructive">Scaduto</Badge>
  }
  if (diffDays <= 7) {
    return <Badge variant="destructive">{diffDays === 0 ? 'Oggi' : `${diffDays}g`}</Badge>
  }
  if (diffDays <= 30) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{diffDays}g</Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      {formatDate(expiry, locale)}
    </Badge>
  )
}

function VehicleTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'car':
      return <Car className="h-4 w-4" />
    case 'moto':
      return <Bike className="h-4 w-4" />
    case 'truck':
      return <Truck className="h-4 w-4" />
    default:
      return <HelpCircle className="h-4 w-4" />
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

function VehicleCard({
  vehicle,
  expiringDocs,
  locale,
}: {
  vehicle: Vehicle
  expiringDocs: Document[]
  locale: string
}) {
  const vehicleDocs = expiringDocs.filter((d) => d.vehicleId === vehicle.id)

  return (
    <Link href={`/vehicles/${vehicle.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground shrink-0">
                  <VehicleTypeIcon type={vehicle.type} />
                </span>
                <p className="font-semibold truncate">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
              <div className="shrink-0 flex flex-col gap-1 items-end">
                {vehicleDocs.slice(0, 3).map((doc) => (
                  <span key={doc.id} className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="hidden sm:inline">{doc.title}:</span>
                    <ExpiryBadge expiryDate={doc.expiryDate} locale={locale} />
                  </span>
                ))}
                {vehicleDocs.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{vehicleDocs.length - 3} altri</span>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function DashboardPage() {
  const locale = parseLocale(headers().get('accept-language'))
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const vehicles: Vehicle[] = user ? await getVehicles(user.id).catch(() => []) : []
  const expiringIn30: Document[] = user
    ? await getExpiringDocuments(user.id, 30).catch(() => [])
    : []

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  function getDiffDays(expiryDate: string | null): number {
    if (!expiryDate) return Infinity
    const expiry = new Date(expiryDate)
    return Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const criticalDocs = expiringIn30.filter((d) => {
    const diff = getDiffDays(d.expiryDate)
    return diff <= 7
  })

  const warningDocs = expiringIn30.filter((d) => {
    const diff = getDiffDays(d.expiryDate)
    return diff > 7 && diff <= 30
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">La tua flotta</h1>
          <p className="text-muted-foreground mt-1 text-sm truncate max-w-[240px] sm:max-w-none">
            {user?.email}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/vehicles/new">
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Aggiungi veicolo</span>
            <span className="sm:hidden">Aggiungi</span>
          </Link>
        </Button>
      </div>

      {/* Stats card */}
      {vehicles.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Veicoli</p>
              <p className="text-2xl font-bold mt-1">{vehicles.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Scadenze critiche</p>
              <p className={`text-2xl font-bold mt-1 ${criticalDocs.length > 0 ? 'text-destructive' : ''}`}>
                {criticalDocs.length}
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">In scadenza (30gg)</p>
              <p className={`text-2xl font-bold mt-1 ${expiringIn30.length > 0 ? 'text-yellow-600' : ''}`}>
                {expiringIn30.length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical alert (<=7 days) */}
      {criticalDocs.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {criticalDocs.length === 1
              ? '1 documento scade entro 7 giorni'
              : `${criticalDocs.length} documenti scadono entro 7 giorni`}
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1">
              {criticalDocs.map((d) => (
                <li key={d.id} className="text-sm flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-current inline-block shrink-0" />
                  <span>{d.title}</span>
                  {d.expiryDate && (
                    <span className="font-medium">
                      — {formatDate(new Date(d.expiryDate), locale)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning alert (8-30 days) */}
      {warningDocs.length > 0 && criticalDocs.length === 0 && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-yellow-900">
            {warningDocs.length === 1
              ? '1 documento in scadenza entro 30 giorni'
              : `${warningDocs.length} documenti in scadenza entro 30 giorni`}
          </AlertTitle>
          <AlertDescription className="text-yellow-800">
            <ul className="mt-1 space-y-1">
              {warningDocs.map((d) => (
                <li key={d.id} className="text-sm flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-current inline-block shrink-0" />
                  <span>{d.title}</span>
                  {d.expiryDate && (
                    <span className="font-medium">
                      — {formatDate(new Date(d.expiryDate), locale)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning alert shown alongside critical */}
      {warningDocs.length > 0 && criticalDocs.length > 0 && (
        <Alert className="border-yellow-300 bg-yellow-50 text-yellow-900 [&>svg]:text-yellow-600">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-yellow-900">
            {warningDocs.length === 1
              ? '1 documento in scadenza entro 30 giorni'
              : `${warningDocs.length} documenti in scadenza entro 30 giorni`}
          </AlertTitle>
          <AlertDescription className="text-yellow-800">
            <ul className="mt-1 space-y-1">
              {warningDocs.map((d) => (
                <li key={d.id} className="text-sm flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-current inline-block shrink-0" />
                  <span>{d.title}</span>
                  {d.expiryDate && (
                    <span className="font-medium">
                      — {formatDate(new Date(d.expiryDate), locale)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* All clear */}
      {vehicles.length > 0 && expiringIn30.length === 0 && (
        <Alert className="border-green-300 bg-green-50 text-green-900 [&>svg]:text-green-600">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle className="text-green-900">Tutto in regola</AlertTitle>
          <AlertDescription className="text-green-800">
            Nessun documento in scadenza nei prossimi 30 giorni.
          </AlertDescription>
        </Alert>
      )}

      {/* Vehicles list */}
      {vehicles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Nessun veicolo</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Non hai ancora aggiunto veicoli. Aggiungi il tuo primo veicolo per iniziare.
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
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Veicoli ({vehicles.length})
          </h2>
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              expiringDocs={expiringIn30}
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  )
}
