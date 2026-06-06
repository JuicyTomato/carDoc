'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
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
import { deleteVehicle } from '@/lib/actions/vehicles'

interface Props {
  vehicleId: string
  userId: string
  vehicleName: string
}

export function DeleteVehicleButton({ vehicleId, userId, vehicleName }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    try {
      await deleteVehicle(vehicleId, userId)
      router.push('/vehicles')
    } catch {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          title="Elimina veicolo"
          disabled={loading}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Elimina veicolo definitivamente</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Stai per eliminare <strong>{vehicleName}</strong> in modo permanente.
                Questa azione <strong>non può essere annullata</strong>.
              </p>
              <p className="text-sm">Verranno eliminati:</p>
              <ul className="text-sm list-disc list-inside space-y-0.5 text-muted-foreground">
                <li>Il veicolo e tutti i suoi dati</li>
                <li>Tutti i documenti (assicurazioni, revisioni, tagliandi…)</li>
                <li>Tutti i file allegati</li>
                <li>Tutte le notifiche associate</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annulla</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Eliminazione…' : 'Elimina definitivamente'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
