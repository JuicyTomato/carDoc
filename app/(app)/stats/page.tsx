import { redirect } from 'next/navigation'
import { BarChart3, Car, FileText, Wrench, Shield, Clock } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getFleetStats } from '@/lib/actions/stats'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function documentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    insurance: 'Assicurazione',
    revision: 'Revisione',
    maintenance: 'Tagliando',
    tax: 'Bollo',
    registration: 'Libretto',
    other: 'Altro',
  }
  return map[type] ?? type
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('it-IT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default async function StatsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const stats = await getFleetStats(user.id).catch(() => null)

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistiche flotta</h1>
        <p className="text-muted-foreground">Impossibile caricare le statistiche.</p>
      </div>
    )
  }

  const maxDocCount = Math.max(...stats.documentsByType.map((d) => d.count), 1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-7 w-7 text-muted-foreground" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Statistiche flotta</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Riepilogo complessivo dei tuoi veicoli e documenti</p>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Veicoli totali</p>
                <p className="text-3xl font-bold mt-1">{stats.totalVehicles}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                <Car className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Documenti totali</p>
                <p className="text-3xl font-bold mt-1">{stats.totalDocuments}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Scadenze 30 giorni</p>
                <p className={`text-3xl font-bold mt-1 ${stats.expiringNext30Days > 0 ? 'text-yellow-600' : ''}`}>
                  {stats.expiringNext30Days}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Costo manutenzioni</p>
                <p className="text-2xl font-bold mt-1">€ {formatCurrency(stats.totalMaintenanceCost)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                <Wrench className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Premio assicurazioni</p>
                <p className="text-2xl font-bold mt-1">€ {formatCurrency(stats.totalInsurancePremium)}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents by type */}
      {stats.documentsByType.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documenti per tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.documentsByType
              .sort((a, b) => b.count - a.count)
              .map((item) => (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{documentTypeLabel(item.type)}</span>
                    <span className="text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(item.count / maxDocCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Latest mileage per vehicle */}
      {stats.latestMileageByVehicle.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chilometraggio per veicolo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {stats.latestMileageByVehicle.map((v) => (
                <div
                  key={v.vehicleId}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium">
                      {v.make} {v.model}
                    </span>
                  </div>
                  <span className="text-muted-foreground font-mono">
                    {v.mileage.toLocaleString('it-IT')} km
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {stats.totalVehicles === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Nessun dato disponibile</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Aggiungi veicoli e documenti per vedere le statistiche della tua flotta.
          </p>
        </div>
      )}
    </div>
  )
}
