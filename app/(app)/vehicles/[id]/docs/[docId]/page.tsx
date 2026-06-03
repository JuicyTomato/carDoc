import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { getDocument } from '@/lib/actions/documents'
import { getDocumentFiles } from '@/lib/actions/files'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DocumentType } from '@/types'

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

  const files = await getDocumentFiles(params.docId).catch(() => [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <span>/</span>
        <Link href={`/vehicles/${params.id}`} className="hover:underline">Veicolo</Link>
        <span>/</span>
        <span>{documentTypeLabel(doc.type)}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{doc.title}</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{documentTypeLabel(doc.type)}</Badge>
            <ExpiryBadge expiryDate={doc.expiryDate} />
            {!doc.isActive && <Badge variant="secondary">Inattivo</Badge>}
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/vehicles/${params.id}`}>Indietro</Link>
        </Button>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {doc.notes && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Note</p>
              <p>{doc.notes}</p>
            </div>
          )}
          {doc.expiryDate && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Scadenza</p>
              <p>{new Date(doc.expiryDate).toLocaleDateString('it-IT')}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Aggiunto il</p>
            <p>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('it-IT') : '-'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Allegati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="truncate">{file.filename ?? file.externalUrl ?? 'File'}</span>
                {file.externalUrl && (
                  <a
                    href={file.externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-4 shrink-0 text-xs text-primary hover:underline"
                  >
                    Apri
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
