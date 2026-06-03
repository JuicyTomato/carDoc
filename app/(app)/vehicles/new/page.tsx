'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createVehicle } from '@/lib/actions/vehicles'
import { createClient } from '@/lib/supabase/client'
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

type VehicleType = 'car' | 'moto' | 'truck' | 'other'

const vehicleTypeOptions: { value: VehicleType; label: string }[] = [
  { value: 'car', label: 'Auto' },
  { value: 'moto', label: 'Moto' },
  { value: 'truck', label: 'Camion' },
  { value: 'other', label: 'Altro' },
]

export default function NewVehiclePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [type, setType] = useState<VehicleType>('car')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [plate, setPlate] = useState('')
  const [vin, setVin] = useState('')
  const [color, setColor] = useState('')
  const [notes, setNotes] = useState('')

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

      const result = await createVehicle(
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
        user.id,
      )

      router.push(`/vehicles/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nuovo veicolo</h1>
        <p className="text-muted-foreground mt-1">Aggiungi un nuovo veicolo alla tua flotta</p>
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
                {loading ? 'Salvataggio...' : 'Salva veicolo'}
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
        </CardContent>
      </Card>
    </div>
  )
}
