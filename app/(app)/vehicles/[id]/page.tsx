import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, Car, Bike, Truck, HelpCircle } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getVehicle } from '@/lib/actions/vehicles'
import { getDocuments } from '@/lib/actions/documents'
import { getVehicleAccessList } from '@/lib/actions/access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VehicleAccessSection from '@/components/settings/VehicleAccessSection'
import type { Document, DocumentType } from '@/types'

// ─── Expiry badge ──────────────────────────────────────────────────────────────

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
    return <Badge variant="destructive">{diffDays === 0 ? 'Oggi' : `${diffDays}g`}</Badge>
  }
  if (diffDays < 30) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        {diffDays}g
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      {expiry.toLocaleDateString('it-IT')}
    </Badge>
  )
}

// ─── Document card ─────────────────────────────────────────────────────────────

function DocumentCard({ doc, vehicleId }: { doc: Document; vehicleId: string }) {
  return (
    <Link href={`/vehicles/${vehicleId}/docs/${doc.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="font-medium text-sm">{doc.title}</p>
              {doc.notes && (
                <p className="text-xs text-muted-foreground line-clamp-1">{doc.notes}</p>
              )}
            </div>
            <div className="shrink-0">
              {doc.expiryDate ? (
                <ExpiryBadge expiryDate={doc.expiryDate} />
              ) : (
                <Badge variant="secondary">Nessuna scadenza</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// ─── Tab content ───────────────────────────────────────────────────────────────

type TabConfig = {
  type: DocumentType
  label: string
}

const tabs: TabConfig[] = [
  { type: 'insurance', label: 'Assicurazione' },
  { type: 'revision', label: 'Revisione' },
  { type: 'maintenance', label: 'Tagliandi' },
  { type: 'tax', label: 'Bollo' },
  { type: 'registration', label: 'Libretto' },
  { type: 'other', label: 'Altro' },
]

function VehicleTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'car':
      return <Car className="h-5 w-5" />
    case 'moto':
      return <Bike className="h-5 w-5" />
    case 'truck':
      return <Truck className="h-5 w-5" />
    default:
      return <HelpCircle className="h-5 w-5" />
  }
}

function vehicleTypeLabel(type: string) {
  switch (type) {
    case 'car': return 'Auto'
    case 'moto': return 'Moto'
    case 'truck': return 'Camion'
    default: return 'Altro'
  }
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function VehicleDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vehicle = await getVehicle(params.id, user.id).catch(() => null)
  if (!vehicle) notFound()

  const [docs, accessList] = await Promise.all([
    getDocuments(params.id, user.id).catch(() => []),
    getVehicleAccessList(params.id, user.id).catch(() => []),
  ])

  const myAccess = accessList.find((e) => e.userId === user.id)
  const isVehicleAdmin = myAccess?.role === 'admin'

  const docsByType = (type: DocumentType) => docs.filter((d) => d.type === type)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span>Veicoli</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <VehicleTypeIcon type={vehicle.type} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {vehicle.make} {vehicle.model}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {vehicle.year && (
                  <span className="text-sm text-muted-foreground">{vehicle.year}</span>
                )}
                {vehicle.plate && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {vehicle.plate}
                  </Badge>
                )}
                <Badge variant="secondary">{vehicleTypeLabel(vehicle.type)}</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle info card */}
      {(vehicle.color || vehicle.vin || vehicle.notes) && (
        <Card>
          <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {vehicle.color && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Colore</p>
                <p className="font-medium">{vehicle.color}</p>
              </div>
            )}
            {vehicle.vin && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                <p className="font-mono text-xs font-medium">{vehicle.vin}</p>
              </div>
            )}
            {vehicle.notes && (
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Note</p>
                <p>{vehicle.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Access management */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Gestisci accessi</h2>
        <VehicleAccessSection
          vehicleId={vehicle.id}
          initialAccessList={accessList}
          currentUserId={user.id}
          isAdmin={isVehicleAdmin}
        />
      </div>

      {/* Documents tabs */}
      <Tabs defaultValue="insurance">
        <TabsList className="flex flex-wrap h-auto gap-1">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.type} value={tab.type} className="relative">
              {tab.label}
              {docsByType(tab.type).length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium">
                  {docsByType(tab.type).length}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => {
          const tabDocs = docsByType(tab.type)
          return (
            <TabsContent key={tab.type} value={tab.type} className="space-y-3 mt-4">
              {tabDocs.length > 0 ? (
                tabDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} vehicleId={vehicle.id} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nessun documento di tipo &ldquo;{tab.label}&rdquo;
                </p>
              )}
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link href={`/vehicles/${vehicle.id}/docs/new?type=${tab.type}`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi {tab.label}
                </Link>
              </Button>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
