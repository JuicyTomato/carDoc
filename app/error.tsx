'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <Link href="/dashboard" className="text-2xl font-bold tracking-tight mb-8">
        carDoc
      </Link>
      <h2 className="text-2xl font-semibold">Qualcosa è andato storto</h2>
      <p className="mt-2 text-muted-foreground max-w-sm">
        Si è verificato un errore imprevisto.
      </p>
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>Riprova</Button>
        <Button asChild variant="outline">
          <Link href="/dashboard">Torna alla dashboard</Link>
        </Button>
      </div>
    </div>
  )
}
