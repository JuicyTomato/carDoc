import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-4">
      <Link href="/dashboard" className="text-2xl font-bold tracking-tight mb-8">
        carDoc
      </Link>
      <h1 className="text-8xl font-extrabold tracking-tight text-muted-foreground">404</h1>
      <h2 className="mt-4 text-2xl font-semibold">Pagina non trovata</h2>
      <p className="mt-2 text-muted-foreground max-w-sm">
        La pagina che cerchi non esiste o è stata spostata.
      </p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">Torna alla dashboard</Link>
      </Button>
    </div>
  )
}
