import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ExternalLink, Download, FileText, Pencil } from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import {
  getDocument,
  getInsuranceDetails,
  getRevisionDetails,
  getMaintenanceDetails,
} from '@/lib/actions/documents'
import { getVehicle } from '@/lib/actions/vehicles'
import { getDocumentFiles } from '@/lib/actions/files'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DeleteDocumentButton } from '@/components/delete-document-button'
import { ExportPdfButton } from '@/components/export-pdf-button'
import { parseLocale, formatDate } from '@/lib/utils/format'
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

function ExpiryBadge({ expiryDate, locale }: { expiryDate: string | null; locale: string }) {
  if (!expiryDate) return <Badge variant="secondary">Nessuna scadenza</Badge>

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return <Badge variant="destructive">Scaduto il {formatDate(expiry, locale)}</Badge>
  }
  if (diffDays < 14) {
    return (
      <Badge variant="destructive">
        Scade il {formatDate(expiry, locale)} ({diffDays}g)
      </Badge>
    )
  }
  if (diffDays < 30) {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        Scade il {formatDate(expiry, locale)}
      </Badge>
    )
  }
  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Scade il {formatDate(expiry, locale)}
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

function InsuranceSection({ details, locale }: { details: InsuranceDetails; locale: string }) {
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
          value={details.startDate ? formatDate(new Date(details.startDate), locale) : null}
        />
        <DetailRow
          label="Data fine"
          value={details.endDate ? formatDate(new Date(details.endDate), locale) : null}
        />
      </CardContent>
    </Card>
  )
}

function RevisionSection({ details, locale }: { details: RevisionDetails; locale: string }) {
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
          value={details.nextDueDate ? formatDate(new Date(details.nextDueDate), locale) : null}
        />
        <DetailRow
          label="Prossima scadenza (km)"
          value={details.nextDueMileage ? `${details.nextDueMileage.toLocaleString('it-IT')} km` : null}
        />
      </CardContent>
    </Card>
  )
}

function MaintenanceSection({ details, locale }: { details: MaintenanceDetails; locale: string }) {
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
          value={details.nextDueDate ? formatDate(new Date(details.nextDueDate), locale) : null}
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

  const locale = parseLocale(headers().get('accept-language'))

  const doc = await getDocument(params.docId, user.id).catch(() => null)
  if (!doc) notFound()

  const [files, insuranceDetailsData, revisionDetailsData, maintenanceDetailsData, vehicle] =
    await Promise.all([
      getDocumentFiles(params.docId, user.id).catch(() => []),
      doc.type === 'insurance' ? getInsuranceDetails(params.docId, user.id).catch(() => null) : null,
      doc.type === 'revision' ? getRevisionDetails(params.docId, user.id).catch(() => null) : null,
      doc.type === 'maintenance' ? getMaintenanceDetails(params.docId, user.id).catch(() => null) : null,
      getVehicle(params.id, user.id).catch(() => null),
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
            <ExpiryBadge expiryDate={doc.expiryDate} locale={locale} />
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
              value={formatDate(new Date(doc.expiryDate), locale)}
            />
          )}
          <DetailRow
            label="Aggiunto il"
            value={doc.createdAt ? formatDate(new Date(doc.createdAt), locale) : '-'}
          />
        </CardContent>
      </Card>

      {/* Type-specific details */}
      {doc.type === 'insurance' && insuranceDetailsData && (
        <InsuranceSection details={insuranceDetailsData} locale={locale} />
      )}
      {doc.type === 'revision' && revisionDetailsData && (
        <RevisionSection details={revisionDetailsData} locale={locale} />
      )}
      {doc.type === 'maintenance' && maintenanceDetailsData && (
        <MaintenanceSection details={maintenanceDetailsData} locale={locale} />
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
      <div className="flex items-center gap-3 pt-2 flex-wrap">
        <Button asChild variant="outline" size="sm">
          <Link href={`/vehicles/${params.id}/docs/${params.docId}/edit`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Modifica
          </Link>
        </Button>
        <ExportPdfButton
          docData={{
            title: doc.title,
            type: doc.type,
            typeLabel: documentTypeLabel(doc.type),
            expiryDate: doc.expiryDate ?? null,
            notes: doc.notes ?? null,
            vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Veicolo',
            insurance: insuranceDetailsData
              ? {
                  provider: insuranceDetailsData.provider,
                  policyNumber: insuranceDetailsData.policyNumber,
                  coverageType: insuranceDetailsData.coverageType,
                  premium: insuranceDetailsData.premium,
                  startDate: insuranceDetailsData.startDate,
                  endDate: insuranceDetailsData.endDate,
                }
              : null,
            revision: revisionDetailsData
              ? {
                  mileageAtRevision: revisionDetailsData.mileageAtRevision,
                  station: revisionDetailsData.station,
                  passed: revisionDetailsData.passed,
                  nextDueDate: revisionDetailsData.nextDueDate,
                  nextDueMileage: revisionDetailsData.nextDueMileage,
                }
              : null,
            maintenance: maintenanceDetailsData
              ? {
                  mileage: maintenanceDetailsData.mileage,
                  cost: maintenanceDetailsData.cost,
                  workshop: maintenanceDetailsData.workshop,
                  serviceType: maintenanceDetailsData.serviceType,
                  nextDueDate: maintenanceDetailsData.nextDueDate,
                  nextDueMileage: maintenanceDetailsData.nextDueMileage,
                  itemsReplaced: maintenanceDetailsData.itemsReplaced,
                }
              : null,
          }}
        />
        <DeleteDocumentButton
          documentId={doc.id}
          vehicleId={params.id}
          userId={user.id}
        />
      </div>
    </div>
  )
}
