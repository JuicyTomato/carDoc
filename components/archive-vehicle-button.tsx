'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { archiveVehicle } from '@/lib/actions/vehicles'

interface Props {
  vehicleId: string
  userId: string
  vehicleName: string
}

export function ArchiveVehicleButton({ vehicleId, userId, vehicleName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleArchive() {
    setLoading(true)
    try {
      await archiveVehicle(vehicleId, userId)
      router.push('/vehicles')
    } catch {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Archive className="mr-1.5 h-3.5 w-3.5" />
          Archivia
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archivia veicolo</AlertDialogTitle>
          <AlertDialogDescription>
            Vuoi archiviare <strong>{vehicleName}</strong>? Il veicolo e i suoi documenti non saranno
            più visibili nella lista principale. Potrai ripristinarlo in seguito.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleArchive}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Archiviazione…' : 'Archivia veicolo'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
