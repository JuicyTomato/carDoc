import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Plus, Car, Bike, Truck, HelpCircle, Archive, FileX } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { getVehicle } from '@/lib/actions/vehicles'
import { getDocuments, getArchivedDocuments } from '@/lib/actions/documents'
import { getVehicleAccessList } from '@/lib/actions/access'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import VehicleAccessSection from '@/components/settings/VehicleAccessSection'
import { RestoreDocumentButton } from '@/components/restore-document-button'
import { parseLocale, formatDate } from '@/lib/utils/format'
import type { Document, DocumentType } from '@/types'

// ─── Expiry badge ──────────────────────────────────────────────────────────────

function ExpiryBadge({ expiryDate, locale }: { expiryDate: string | null; locale: string }) {
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
      {formatDate(expiry, locale)}
    </Badge>
  )
}

// ─── Document card ─────────────────────────────────────────────────────────────

function DocumentCard({ doc, vehicleId, locale }: { doc: Document; vehicleId: string; locale: string }) {
  return (
    <Link href={`/vehicles/${vehicleId}/docs/${doc.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <p className="font-medium text-sm truncate">{doc.title}</p>
              {doc.notes && (
                <p className="text-xs text-muted-foreground line-clamp-1">{doc.notes}</p>
              )}
            </div>
            <div className="shrink-0">
              {doc.expiryDate ? (
                <ExpiryBadge expiryDate={doc.expiryDate} locale={locale} />
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

function documentTypeLabel(type: DocumentType): string {
  const map: Record<DocumentType, string> = {
    insurance: 'Assicurazione',
    revision: 'Revisione',
    maintenance: 'Tagliando',
    tax: 'Bollo',
    registration: 'Libretto',
    other: 'Altro',
  }
  return map[type] ?? type
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

  const locale = parseLocale(headers().get('accept-language'))

  const [docs, archivedDocs, accessList] = await Promise.all([
    getDocuments(params.id, user.id).catch(() => []),
    getArchivedDocuments(params.id, user.id).catch(() => []),
    getVehicleAccessList(params.id, user.id).catch(() => []),
  ])

  const myAccess = accessList.find((e) => e.userId === user.id)
  const isVehicleAdmin = myAccess?.role === 'admin'

  const docsByType = (type: DocumentType) => docs.filter((d) => d.type === type)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            <span>/</span>
            <span>Veicoli</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
              <VehicleTypeIcon type={vehicle.type} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                {vehicle.make} {vehicle.model}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
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
          <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {vehicle.color && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Colore</p>
                <p className="font-medium">{vehicle.color}</p>
              </div>
            )}
            {vehicle.vin && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">VIN</p>
                <p className="font-mono text-xs font-medium break-all">{vehicle.vin}</p>
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
        <div className="overflow-x-auto">
          <TabsList className="flex w-max min-w-full h-auto gap-1">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.type} value={tab.type} className="relative whitespace-nowrap">
                {tab.label}
                {docsByType(tab.type).length > 0 && (
                  <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[10px] font-medium">
                    {docsByType(tab.type).length}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {tabs.map((tab) => {
          const tabDocs = docsByType(tab.type)
          return (
            <TabsContent key={tab.type} value={tab.type} className="space-y-3 mt-4">
              {tabDocs.length > 0 ? (
                tabDocs.map((doc) => (
                  <DocumentCard key={doc.id} doc={doc} vehicleId={vehicle.id} locale={locale} />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center border rounded-lg border-dashed">
                  <FileX className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nessun documento di tipo &ldquo;{tab.label}&rdquo;
                  </p>
                  <Button asChild size="sm" variant="link" className="mt-1">
                    <Link href={`/vehicles/${vehicle.id}/docs/new?type=${tab.type}`}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      Aggiungi
                    </Link>
                  </Button>
                </div>
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

      {/* Archive section */}
      {archivedDocs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Archive className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold">Archivio documenti</h2>
            <Badge variant="secondary">{archivedDocs.length}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Documenti archiviati automaticamente quando ne è stato aggiunto uno nuovo dello stesso tipo.
          </p>
          <div className="space-y-2">
            {archivedDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm bg-muted/30"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{doc.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {documentTypeLabel(doc.type)}
                    </Badge>
                  </div>
                  {doc.expiryDate && (
                    <p className="text-xs text-muted-foreground">
                      Scadenza: {formatDate(new Date(doc.expiryDate), locale)}
                    </p>
                  )}
                </div>
                <div className="shrink-0 ml-3">
                  <RestoreDocumentButton documentId={doc.id} userId={user.id} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
