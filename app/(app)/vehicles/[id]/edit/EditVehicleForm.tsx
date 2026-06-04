'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateVehicle } from '@/lib/actions/vehicles'
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
import type { VehicleType } from '@/types'

type VehicleTypeOption = { value: VehicleType; label: string }

const vehicleTypeOptions: VehicleTypeOption[] = [
  { value: 'car', label: 'Auto' },
  { value: 'moto', label: 'Moto' },
  { value: 'truck', label: 'Camion' },
  { value: 'other', label: 'Altro' },
]

type Props = {
  vehicleId: string
  userId: string
  defaultValues: {
    type: VehicleType
    make: string
    model: string
    year?: number
    plate?: string
    vin?: string
    color?: string
    notes?: string
  }
}

export default function EditVehicleForm({ vehicleId, userId, defaultValues }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<VehicleType>(defaultValues.type)
  const [make, setMake] = useState(defaultValues.make)
  const [model, setModel] = useState(defaultValues.model)
  const [year, setYear] = useState(defaultValues.year?.toString() ?? '')
  const [plate, setPlate] = useState(defaultValues.plate ?? '')
  const [vin, setVin] = useState(defaultValues.vin ?? '')
  const [color, setColor] = useState(defaultValues.color ?? '')
  const [notes, setNotes] = useState(defaultValues.notes ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await updateVehicle(
        vehicleId,
        {
          type,
          make,
          model,
          year: year ? parseInt(year) : undefined,
          plate: plate || undefined,
          vin: vin || undefined,
          color: color || undefined,
          notes: notes || undefined,
        },
        userId,
      )

      router.push(`/vehicles/${vehicleId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Modifica veicolo</h1>
        <p className="text-muted-foreground mt-1">Aggiorna i dati del veicolo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dati veicolo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Tipo */}
            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Seleziona tipo" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Make + Model */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Marca *</Label>
                <Input
                  id="make"
                  value={make}
                  onChange={(e) => setMake(e.target.value)}
                  placeholder="es. Fiat"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Modello *</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="es. Panda"
                  required
                />
              </div>
            </div>

            {/* Year + Plate */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="year">Anno</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="es. 2020"
                  min={1900}
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate">Targa</Label>
                <Input
                  id="plate"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value.toUpperCase())}
                  placeholder="es. AB123CD"
                />
              </div>
            </div>

            {/* VIN + Color */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="Numero telaio (opzionale)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Colore</Label>
                <Input
                  id="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="es. Rosso"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Note</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Note aggiuntive..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvataggio...' : 'Salva modifiche'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/vehicles/${vehicleId}`)}
                disabled={loading}
              >
                Annulla
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
