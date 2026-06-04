'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateDocument } from '@/lib/actions/documents'

export function RestoreDocumentButton({
  documentId,
  userId,
}: {
  documentId: string
  userId: string
}) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRestore() {
    startTransition(async () => {
      await updateDocument(documentId, { isActive: true }, userId)
      router.refresh()
    })
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleRestore}
    >
      <RotateCcw className="mr-1.5 h-3 w-3" />
      {isPending ? 'Ripristino...' : 'Ripristina'}
    </Button>
  )
}
