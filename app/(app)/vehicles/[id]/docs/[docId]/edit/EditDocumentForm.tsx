'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateDocument,
  upsertInsuranceDetails,
  upsertRevisionDetails,
  upsertMaintenanceDetails,
} from '@/lib/actions/documents'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { DocumentType, CoverageType } from '@/types'

const documentTypeLabel: Record<DocumentType, string> = {
  insurance: 'Assicurazione',
  revision: 'Revisione',
  maintenance: 'Tagliando',
  tax: 'Bollo',
  registration: 'Libretto',
  other: 'Altro',
}

const coverageTypeOptions: { value: CoverageType; label: string }[] = [
  { value: 'RC', label: 'RC (Responsabilità Civile)' },
  { value: 'kasko', label: 'Kasko' },
  { value: 'full', label: 'Full (Tutti i rischi)' },
]

type InsuranceDefaults = {
  provider: string
  policyNumber: string
  coverageType: CoverageType
  premium: string
  startDate: string
  endDate: string
}

type RevisionDefaults = {
  mileageAtRevision: string
  station: string
  passed: boolean
  nextDueDate: string
  nextDueMileage: string
}

type MaintenanceDefaults = {
  mileage: string
  cost: string
  workshop: string
  serviceType: string
  nextDueDate: string
  nextDueMileage: string
  itemsReplaced: string
}

type Props = {
  vehicleId: string
  docId: string
  userId: string
  docType: DocumentType
  defaultValues: {
    title: string
    notes: string
    expiryDate: string
    isActive: boolean
    insurance?: InsuranceDefaults
    revision?: RevisionDefaults
    maintenance?: MaintenanceDefaults
  }
}

export default function EditDocumentForm({
  vehicleId,
  docId,
  userId,
  docType,
  defaultValues,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Common fields
  const [title, setTitle] = useState(defaultValues.title)
  const [notes, setNotes] = useState(defaultValues.notes)
  const [expiryDate, setExpiryDate] = useState(defaultValues.expiryDate)
  const [isActive, setIsActive] = useState(defaultValues.isActive)

  // Insurance fields
  const [insProvider, setInsProvider] = useState(defaultValues.insurance?.provider ?? '')
  const [insPolicyNumber, setInsPolicyNumber] = useState(defaultValues.insurance?.policyNumber ?? '')
  const [insCoverageType, setInsCoverageType] = useState<CoverageType>(
    defaultValues.insurance?.coverageType ?? 'RC',
  )
  const [insPremium, setInsPremium] = useState(defaultValues.insurance?.premium ?? '')
  const [insStartDate, setInsStartDate] = useState(defaultValues.insurance?.startDate ?? '')
  const [insEndDate, setInsEndDate] = useState(defaultValues.insurance?.endDate ?? '')

  // Revision fields
  const [revMileage, setRevMileage] = useState(defaultValues.revision?.mileageAtRevision ?? '')
  const [revStation, setRevStation] = useState(defaultValues.revision?.station ?? '')
  const [revPassed, setRevPassed] = useState(defaultValues.revision?.passed ?? true)
  const [revNextDueDate, setRevNextDueDate] = useState(defaultValues.revision?.nextDueDate ?? '')
  const [revNextDueMileage, setRevNextDueMileage] = useState(
    defaultValues.revision?.nextDueMileage ?? '',
  )

  // Maintenance fields
  const [mntMileage, setMntMileage] = useState(defaultValues.maintenance?.mileage ?? '')
  const [mntCost, setMntCost] = useState(defaultValues.maintenance?.cost ?? '')
  const [mntWorkshop, setMntWorkshop] = useState(defaultValues.maintenance?.workshop ?? '')
  const [mntServiceType, setMntServiceType] = useState(
    defaultValues.maintenance?.serviceType ?? '',
  )
  const [mntNextDueDate, setMntNextDueDate] = useState(
    defaultValues.maintenance?.nextDueDate ?? '',
  )
  const [mntNextDueMileage, setMntNextDueMileage] = useState(
    defaultValues.maintenance?.nextDueMileage ?? '',
  )
  const [mntItemsReplaced, setMntItemsReplaced] = useState(
    defaultValues.maintenance?.itemsReplaced ?? '',
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await updateDocument(
        docId,
        {
          title,
          notes: notes || undefined,
          expiryDate: expiryDate || undefined,
          isActive,
        },
        userId,
      )

      if (docType === 'insurance') {
        await upsertInsuranceDetails(docId, userId, {
          provider: insProvider || undefined,
          policyNumber: insPolicyNumber || undefined,
          coverageType: insCoverageType,
          premium: insPremium ? parseFloat(insPremium) : undefined,
          startDate: insStartDate || undefined,
          endDate: insEndDate || undefined,
        })
      }

      if (docType === 'revision') {
        await upsertRevisionDetails(docId, userId, {
          mileageAtRevision: revMileage ? parseInt(revMileage) : undefined,
          station: revStation || undefined,
          passed: revPassed,
          nextDueDate: revNextDueDate || undefined,
          nextDueMileage: revNextDueMileage ? parseInt(revNextDueMileage) : undefined,
        })
      }

      if (docType === 'maintenance') {
        await upsertMaintenanceDetails(docId, userId, {
          mileage: mntMileage ? parseInt(mntMileage) : undefined,
          cost: mntCost ? parseFloat(mntCost) : undefined,
          workshop: mntWorkshop || undefined,
          serviceType: mntServiceType || undefined,
          nextDueDate: mntNextDueDate || undefined,
          nextDueMileage: mntNextDueMileage ? parseInt(mntNextDueMileage) : undefined,
          itemsReplaced: mntItemsReplaced
            ? mntItemsReplaced.split(',').map((s) => s.trim()).filter(Boolean)
            : undefined,
        })
      }

      router.push(`/vehicles/${vehicleId}/docs/${docId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modifica documento</h1>
        <p className="text-muted-foreground mt-1">Aggiorna i dati del documento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Common fields */}
        <Card>
          <CardHeader>
            <CardTitle>Informazioni documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo (read-only) */}
            <div className="space-y-2">
              <Label>Tipo documento</Label>
              <div className="flex items-center gap-2 h-9">
                <Badge variant="outline">{documentTypeLabel[docType]}</Badge>
                <span className="text-xs text-muted-foreground">Il tipo non può essere modificato</span>
              </div>
            </div>

            {/* Titolo */}
            <div className="space-y-2">
              <Label htmlFor="title">Titolo *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Scadenza */}
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Data di scadenza</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            {/* Note */}
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            {/* Attivo */}
            <div className="flex items-center gap-2">
              <input
                id="isActive"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive">Documento attivo</Label>
            </div>
          </CardContent>
        </Card>

        {/* Insurance extra fields */}
        {docType === 'insurance' && (
          <Card>
            <CardHeader>
              <CardTitle>Dati assicurazione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insProvider">Compagnia</Label>
                  <Input
                    id="insProvider"
                    value={insProvider}
                    onChange={(e) => setInsProvider(e.target.value)}
                    placeholder="es. Generali"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insPolicyNumber">Numero polizza</Label>
                  <Input
                    id="insPolicyNumber"
                    value={insPolicyNumber}
                    onChange={(e) => setInsPolicyNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insCoverageType">Tipo copertura</Label>
                <Select
                  value={insCoverageType}
                  onValueChange={(v) => setInsCoverageType(v as CoverageType)}
                >
                  <SelectTrigger id="insCoverageType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {coverageTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="insPremium">Premio (€)</Label>
                <Input
                  id="insPremium"
                  type="number"
                  step="0.01"
                  value={insPremium}
                  onChange={(e) => setInsPremium(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="insStartDate">Inizio validità</Label>
                  <Input
                    id="insStartDate"
                    type="date"
                    value={insStartDate}
                    onChange={(e) => setInsStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="insEndDate">Fine validità</Label>
                  <Input
                    id="insEndDate"
                    type="date"
                    value={insEndDate}
                    onChange={(e) => setInsEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Revision extra fields */}
        {docType === 'revision' && (
          <Card>
            <CardHeader>
              <CardTitle>Dati revisione</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revMileage">Chilometraggio al momento</Label>
                  <Input
                    id="revMileage"
                    type="number"
                    value={revMileage}
                    onChange={(e) => setRevMileage(e.target.value)}
                    placeholder="es. 45000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revStation">Centro revisioni</Label>
                  <Input
                    id="revStation"
                    value={revStation}
                    onChange={(e) => setRevStation(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="revPassed"
                  type="checkbox"
                  checked={revPassed}
                  onChange={(e) => setRevPassed(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="revPassed">Revisione superata</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="revNextDueDate">Prossima scadenza</Label>
                  <Input
                    id="revNextDueDate"
                    type="date"
                    value={revNextDueDate}
                    onChange={(e) => setRevNextDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="revNextDueMileage">Km prossima revisione</Label>
                  <Input
                    id="revNextDueMileage"
                    type="number"
                    value={revNextDueMileage}
                    onChange={(e) => setRevNextDueMileage(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Maintenance extra fields */}
        {docType === 'maintenance' && (
          <Card>
            <CardHeader>
              <CardTitle>Dati tagliando</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mntMileage">Chilometraggio</Label>
                  <Input
                    id="mntMileage"
                    type="number"
                    value={mntMileage}
                    onChange={(e) => setMntMileage(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mntCost">Costo (€)</Label>
                  <Input
                    id="mntCost"
                    type="number"
                    step="0.01"
                    value={mntCost}
                    onChange={(e) => setMntCost(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mntWorkshop">Officina</Label>
                  <Input
                    id="mntWorkshop"
                    value={mntWorkshop}
                    onChange={(e) => setMntWorkshop(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mntServiceType">Tipo intervento</Label>
                  <Input
                    id="mntServiceType"
                    value={mntServiceType}
                    onChange={(e) => setMntServiceType(e.target.value)}
                    placeholder="es. Tagliando ordinario"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mntNextDueDate">Prossima scadenza</Label>
                  <Input
                    id="mntNextDueDate"
                    type="date"
                    value={mntNextDueDate}
                    onChange={(e) => setMntNextDueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mntNextDueMileage">Km prossimo tagliando</Label>
                  <Input
                    id="mntNextDueMileage"
                    type="number"
                    value={mntNextDueMileage}
                    onChange={(e) => setMntNextDueMileage(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mntItemsReplaced">Parti sostituite (separate da virgola)</Label>
                <Input
                  id="mntItemsReplaced"
                  value={mntItemsReplaced}
                  onChange={(e) => setMntItemsReplaced(e.target.value)}
                  placeholder="es. Olio motore, Filtro olio, Candele"
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva modifiche'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/vehicles/${vehicleId}/docs/${docId}`)}
            disabled={loading}
          >
            Annulla
          </Button>
        </div>
      </form>
    </div>
  )
}
