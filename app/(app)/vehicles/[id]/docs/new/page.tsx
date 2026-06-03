'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createDocument } from '@/lib/actions/documents'
import { getUploadUrl } from '@/lib/actions/files'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DocumentType, CoverageType } from '@/types'

const documentTypeOptions: { value: DocumentType; label: string }[] = [
  { value: 'insurance', label: 'Assicurazione' },
  { value: 'revision', label: 'Revisione' },
  { value: 'maintenance', label: 'Tagliando' },
  { value: 'tax', label: 'Bollo' },
  { value: 'registration', label: 'Libretto' },
  { value: 'other', label: 'Altro' },
]

const coverageTypeOptions: { value: CoverageType; label: string }[] = [
  { value: 'RC', label: 'RC (Responsabilità Civile)' },
  { value: 'kasko', label: 'Kasko' },
  { value: 'full', label: 'Full (Tutti i rischi)' },
]

export default function NewDocumentPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const vehicleId = params.id as string

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fileTab, setFileTab] = useState<'upload' | 'link'>('upload')

  // Common fields
  const [docType, setDocType] = useState<DocumentType>(
    (searchParams.get('type') as DocumentType) ?? 'other',
  )
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [isActive, setIsActive] = useState(true)

  // Insurance fields
  const [insProvider, setInsProvider] = useState('')
  const [insPolicyNumber, setInsPolicyNumber] = useState('')
  const [insCoverageType, setInsCoverageType] = useState<CoverageType>('RC')
  const [insPremium, setInsPremium] = useState('')
  const [insStartDate, setInsStartDate] = useState('')
  const [insEndDate, setInsEndDate] = useState('')

  // Revision fields
  const [revMileage, setRevMileage] = useState('')
  const [revStation, setRevStation] = useState('')
  const [revPassed, setRevPassed] = useState(true)
  const [revNextDueDate, setRevNextDueDate] = useState('')
  const [revNextDueMileage, setRevNextDueMileage] = useState('')

  // Maintenance fields
  const [mntMileage, setMntMileage] = useState('')
  const [mntCost, setMntCost] = useState('')
  const [mntWorkshop, setMntWorkshop] = useState('')
  const [mntServiceType, setMntServiceType] = useState('')
  const [mntNextDueDate, setMntNextDueDate] = useState('')
  const [mntNextDueMileage, setMntNextDueMileage] = useState('')
  const [mntItemsReplaced, setMntItemsReplaced] = useState('')

  // File fields
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [externalUrl, setExternalUrl] = useState('')
  const [externalFilename, setExternalFilename] = useState('')

  // Prefill title when type changes
  useEffect(() => {
    const found = documentTypeOptions.find((o) => o.value === docType)
    if (found && !title) {
      setTitle(found.label)
    }
  }, [docType]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const result = await createDocument(
        {
          vehicleId,
          type: docType,
          title,
          notes: notes || undefined,
          expiryDate: expiryDate || undefined,
          isActive,
          insurance:
            docType === 'insurance'
              ? {
                  provider: insProvider || undefined,
                  policyNumber: insPolicyNumber || undefined,
                  coverageType: insCoverageType,
                  premium: insPremium ? parseFloat(insPremium) : undefined,
                  startDate: insStartDate || undefined,
                  endDate: insEndDate || undefined,
                }
              : undefined,
          revision:
            docType === 'revision'
              ? {
                  mileageAtRevision: revMileage ? parseInt(revMileage) : undefined,
                  station: revStation || undefined,
                  passed: revPassed,
                  nextDueDate: revNextDueDate || undefined,
                  nextDueMileage: revNextDueMileage
                    ? parseInt(revNextDueMileage)
                    : undefined,
                }
              : undefined,
          maintenance:
            docType === 'maintenance'
              ? {
                  mileage: mntMileage ? parseInt(mntMileage) : undefined,
                  cost: mntCost ? parseFloat(mntCost) : undefined,
                  workshop: mntWorkshop || undefined,
                  serviceType: mntServiceType || undefined,
                  nextDueDate: mntNextDueDate || undefined,
                  nextDueMileage: mntNextDueMileage
                    ? parseInt(mntNextDueMileage)
                    : undefined,
                  itemsReplaced: mntItemsReplaced
                    ? mntItemsReplaced.split(',').map((s) => s.trim()).filter(Boolean)
                    : undefined,
                }
              : undefined,
        },
        user.id,
      )

      const docId = result.id

      // Handle file upload
      if (fileTab === 'upload' && uploadFile) {
        const { signedUrl } = await getUploadUrl(
          docId,
          uploadFile.name,
          uploadFile.type,
          user.id,
        )

        const uploadRes = await fetch(signedUrl, {
          method: 'PUT',
          body: uploadFile,
          headers: { 'Content-Type': uploadFile.type },
        })

        if (!uploadRes.ok) {
          console.error('File upload failed, but document was created')
        }
      }

      if (fileTab === 'link' && externalUrl) {
        // addExternalLink is a server action — import and call it
        const { addExternalLink } = await import('@/lib/actions/files')
        await addExternalLink(docId, externalUrl, externalFilename || externalUrl)
      }

      router.push(`/vehicles/${vehicleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuovo documento</h1>
        <p className="text-muted-foreground mt-1">Aggiungi un documento al veicolo</p>
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
            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="docType">Tipo documento *</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                <SelectTrigger id="docType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

        {/* File section */}
        <Card>
          <CardHeader>
            <CardTitle>Allegato (opzionale)</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={fileTab} onValueChange={(v) => setFileTab(v as 'upload' | 'link')}>
              <TabsList>
                <TabsTrigger value="upload">Carica file</TabsTrigger>
                <TabsTrigger value="link">Link esterno</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-2 mt-4">
                <Label htmlFor="fileUpload">File</Label>
                <Input
                  id="fileUpload"
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                />
                <p className="text-xs text-muted-foreground">
                  Formati accettati: PDF, JPG, PNG (max 10MB)
                </p>
              </TabsContent>

              <TabsContent value="link" className="space-y-3 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="externalUrl">URL documento</Label>
                  <Input
                    id="externalUrl"
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalFilename">Nome file (opzionale)</Label>
                  <Input
                    id="externalFilename"
                    value={externalFilename}
                    onChange={(e) => setExternalFilename(e.target.value)}
                    placeholder="es. Polizza assicurativa 2024.pdf"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvataggio...' : 'Salva documento'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Annulla
          </Button>
        </div>
      </form>
    </div>
  )
}
