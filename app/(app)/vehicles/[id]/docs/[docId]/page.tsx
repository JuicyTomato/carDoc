import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ExternalLink, Download, FileText, Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  getDocument,
  getInsuranceDetails,
  getRevisionDetails,
  getMaintenanceDetails,
} from '@/lib/actions/documents'
import { getDocumentFiles } from '@/lib/actions/files'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import type { DocumentType, InsuranceDetails, RevisionDetails, MaintenanceDetails } from '@/types'

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

function coverageTypeLabel(type: string | null | undefined): string {
  if (!type) return '-'
  switch (type) {
    case 'RC': return 'Responsabilità Civile'
    case 'kasko': return 'Kasko'
    case 'full': return 'Kasko Completa'
    default: return type
  }
}

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return <Badge variant="secondary">Nessuna scadenza</Badge>

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Badge variant="destructive">Scaduto il {expiry.toLocaleDateString('it-IT')}</Badge>
  }
  if (diffDays < 14) {
    return (
      <Badge variant="destructive">
        Scade il {expiry.toLocaleDateString('it-IT')} ({diffDays}g)
      </Badge>
    )
  }
  if (diffDays < 30) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Scade il {expiry.toLocaleDateString('it-IT')}
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Scade il {expiry.toLocaleDateString('it-IT')}
    </Badge>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return (
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="font-medium mt-0.5">{value}</p>
    </div>
  )
}

function InsuranceSection({ details }: { details: InsuranceDetails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettagli assicurazione</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <DetailRow label="Compagnia" value={details.provider} />
        <DetailRow label="Numero polizza" value={details.policyNumber} />
        <DetailRow label="Tipo copertura" value={coverageTypeLabel(details.coverageType)} />
        <DetailRow
          label="Premio annuale"
          value={details.premium ? `€ ${Number(details.premium).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : null}
        />
        <DetailRow
          label="Data inizio"
          value={details.startDate ? new Date(details.startDate).toLocaleDateString('it-IT') : null}
        />
        <DetailRow
          label="Data fine"
          value={details.endDate ? new Date(details.endDate).toLocaleDateString('it-IT') : null}
        />
      </CardContent>
    </Card>
  )
}

function RevisionSection({ details }: { details: RevisionDetails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettagli revisione</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <DetailRow
          label="Chilometraggio"
          value={details.mileageAtRevision ? `${details.mileageAtRevision.toLocaleString('it-IT')} km` : null}
        />
        <DetailRow label="Centro revisione" value={details.station} />
        <DetailRow
          label="Esito"
          value={
            details.passed === null || details.passed === undefined
              ? null
              : details.passed
              ? 'Superata'
              : 'Non superata'
          }
        />
        <DetailRow
          label="Prossima scadenza"
          value={details.nextDueDate ? new Date(details.nextDueDate).toLocaleDateString('it-IT') : null}
        />
        <DetailRow
          label="Prossima scadenza (km)"
          value={details.nextDueMileage ? `${details.nextDueMileage.toLocaleString('it-IT')} km` : null}
        />
      </CardContent>
    </Card>
  )
}

function MaintenanceSection({ details }: { details: MaintenanceDetails }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dettagli tagliando</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <DetailRow
          label="Chilometraggio"
          value={details.mileage ? `${details.mileage.toLocaleString('it-IT')} km` : null}
        />
        <DetailRow
          label="Costo"
          value={details.cost ? `€ ${Number(details.cost).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : null}
        />
        <DetailRow label="Officina" value={details.workshop} />
        <DetailRow label="Tipo intervento" value={details.serviceType} />
        <DetailRow
          label="Prossima scadenza"
          value={details.nextDueDate ? new Date(details.nextDueDate).toLocaleDateString('it-IT') : null}
        />
        <DetailRow
          label="Prossima scadenza (km)"
          value={details.nextDueMileage ? `${details.nextDueMileage.toLocaleString('it-IT')} km` : null}
        />
        {details.itemsReplaced && details.itemsReplaced.length > 0 && (
          <div className="col-span-full">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Parti sostituite</p>
            <ul className="mt-1 space-y-0.5">
              {details.itemsReplaced.map((item, i) => (
                <li key={i} className="text-sm">• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default async function DocumentDetailPage({
  params,
}: {
  params: { id: string; docId: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const doc = await getDocument(params.docId, user.id).catch(() => null)
  if (!doc) notFound()

  const [files, insuranceDetailsData, revisionDetailsData, maintenanceDetailsData] =
    await Promise.all([
      getDocumentFiles(params.docId).catch(() => []),
      doc.type === 'insurance' ? getInsuranceDetails(params.docId).catch(() => null) : null,
      doc.type === 'revision' ? getRevisionDetails(params.docId).catch(() => null) : null,
      doc.type === 'maintenance' ? getMaintenanceDetails(params.docId).catch(() => null) : null,
    ])

  // Generate signed URLs for uploaded files
  const filesWithUrls = await Promise.all(
    files.map(async (file) => {
      if (file.source === 'upload' && file.storagePath) {
        const { data } = await supabase.storage
          .from('documents')
          .createSignedUrl(file.storagePath, 3600)
        return { ...file, signedUrl: data?.signedUrl ?? null }
      }
      return { ...file, signedUrl: null }
    }),
  )

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <Link href={`/vehicles/${params.id}`} className="hover:underline">Veicolo</Link>
        <span>/</span>
        <span>{documentTypeLabel(doc.type)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{doc.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{documentTypeLabel(doc.type)}</Badge>
            <ExpiryBadge expiryDate={doc.expiryDate} />
            {!doc.isActive && <Badge variant="secondary">Archiviato</Badge>}
          </div>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href={`/vehicles/${params.id}`}>Indietro</Link>
        </Button>
      </div>

      {/* Main info card */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {doc.notes && (
            <DetailRow label="Note" value={doc.notes} />
          )}
          {doc.expiryDate && (
            <DetailRow
              label="Scadenza"
              value={new Date(doc.expiryDate).toLocaleDateString('it-IT')}
            />
          )}
          <DetailRow
            label="Aggiunto il"
            value={doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : '-'}
          />
        </CardContent>
      </Card>

      {/* Type-specific details */}
      {doc.type === 'insurance' && insuranceDetailsData && (
        <InsuranceSection details={insuranceDetailsData} />
      )}
      {doc.type === 'revision' && revisionDetailsData && (
        <RevisionSection details={revisionDetailsData} />
      )}
      {doc.type === 'maintenance' && maintenanceDetailsData && (
        <MaintenanceSection details={maintenanceDetailsData} />
      )}

      {/* Files */}
      {filesWithUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Allegati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {filesWithUrls.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-md border px-3 py-2.5 text-sm gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="truncate">{file.filename ?? file.externalUrl ?? 'File'}</span>
                </div>
                <div className="shrink-0">
                  {file.source === 'upload' && file.signedUrl && (
                    <a
                      href={file.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Scarica
                    </a>
                  )}
                  {file.source === 'external' && file.externalUrl && (
                    <a
                      href={file.externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Apri
                    </a>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="outline" size="sm" disabled>
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Modifica
        </Button>
        <DeleteDocumentButton
          documentId={doc.id}
          vehicleId={params.id}
          userId={user.id}
        />
      </div>
    </div>
  )
}
