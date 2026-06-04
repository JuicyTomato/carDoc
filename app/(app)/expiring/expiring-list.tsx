'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle2, FileX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/utils/format'
import type { ExpiringDocumentWithVehicle } from '@/lib/actions/documents'

const FILTER_OPTIONS = [
  { label: '7 giorni', days: 7 },
  { label: '30 giorni', days: 30 },
  { label: '60 giorni', days: 60 },
  { label: '90 giorni', days: 90 },
]

const DOC_TYPE_LABELS: Record<string, string> = {
  insurance: 'Assicurazione',
  revision: 'Revisione',
  maintenance: 'Tagliando',
  tax: 'Bollo',
  registration: 'Libretto',
  other: 'Altro',
}

function UrgencyBadge({ expiryDate, locale }: { expiryDate: string | null; locale: string }) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return <Badge variant="destructive">Scaduto</Badge>
  if (diffDays === 0) return <Badge variant="destructive">Oggi</Badge>
  if (diffDays <= 7) return <Badge variant="destructive">{diffDays}g — {formatDate(expiry, locale)}</Badge>
  if (diffDays <= 30) return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{diffDays}g — {formatDate(expiry, locale)}</Badge>
  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{diffDays}g — {formatDate(expiry, locale)}</Badge>
}

interface Props {
  docs: ExpiringDocumentWithVehicle[]
  locale: string
}

export function ExpiringList({ docs, locale }: Props) {
  const [selectedDays, setSelectedDays] = useState(30)

  const filtered = useMemo(() => {
    if (docs.length === 0) return []
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setDate(cutoff.getDate() + selectedDays)
    const cutoffStr = cutoff.toISOString().slice(0, 10)
    return docs.filter((d) => !d.expiryDate || d.expiryDate <= cutoffStr)
  }, [docs, selectedDays])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const critical = filtered.filter((d) => {
    if (!d.expiryDate) return false
    const diff = Math.floor((new Date(d.expiryDate).getTime() - today.getTime()) / 86400000)
    return diff <= 7
  })
  const warning = filtered.filter((d) => {
    if (!d.expiryDate) return false
    const diff = Math.floor((new Date(d.expiryDate).getTime() - today.getTime()) / 86400000)
    return diff > 7
  })

  return (
    <div className="space-y-5">
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTIONS.map(({ label, days }) => (
          <Button
            key={days}
            size="sm"
            variant={selectedDays === days ? 'default' : 'outline'}
            onClick={() => setSelectedDays(days)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Summary row */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {critical.length > 0 && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              {critical.length} critici (≤7g)
            </span>
          )}
          {warning.length > 0 && (
            <span className="flex items-center gap-1.5 text-yellow-700">
              <Clock className="h-3.5 w-3.5" />
              {warning.length} in scadenza
            </span>
          )}
          {critical.length === 0 && warning.length === 0 && (
            <span className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Tutto in regola
            </span>
          )}
        </div>
      )}

      {/* Document list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted mb-4">
            <FileX className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-base font-semibold">Nessuna scadenza</p>
          <p className="text-sm text-muted-foreground mt-1">
            Nessun documento scade nei prossimi {selectedDays} giorni.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Link key={doc.id} href={`/vehicles/${doc.vehicleId}/docs/${doc.id}`}>
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground truncate">
                          {doc.vehicle.make} {doc.vehicle.model}
                          {doc.vehicle.plate && (
                            <span className="ml-1 font-mono">· {doc.vehicle.plate}</span>
                          )}
                        </span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                        </Badge>
                      </div>
                    </div>
                    <div className="shrink-0">
                      <UrgencyBadge expiryDate={doc.expiryDate} locale={locale} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
