'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteDocument } from '@/lib/actions/documents'

export function DeleteDocumentButton({
  documentId,
  vehicleId,
  userId,
}: {
  documentId: string
  vehicleId: string
  userId: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleDelete() {
    if (!confirm('Sei sicuro di voler eliminare questo documento? L\'operazione non può essere annullata.')) {
      return
    }
    startTransition(async () => {
      await deleteDocument(documentId, userId)
      router.push(`/vehicles/${vehicleId}`)
    })
  }

  return (
    <Button
      size="sm"
      variant="destructive"
      disabled={isPending}
      onClick={handleDelete}
    >
      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
      {isPending ? 'Eliminazione...' : 'Elimina'}
    </Button>
  )
}
