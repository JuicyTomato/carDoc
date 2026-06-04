'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Car, Bike, Truck, HelpCircle, Plus } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Vehicle, VehicleType } from '@/types'

function VehicleTypeIcon({ type }: { type: string }) {
  switch (type) {
    case 'car': return <Car className="h-5 w-5" />
    case 'moto': return <Bike className="h-5 w-5" />
    case 'truck': return <Truck className="h-5 w-5" />
    default: return <HelpCircle className="h-5 w-5" />
  }
}

function vehicleTypeLabel(type: string): string {
  switch (type) {
    case 'car': return 'Auto'
    case 'moto': return 'Moto'
    case 'truck': return 'Camion'
    default: return 'Altro'
  }
}

function VehicleRow({ vehicle }: { vehicle: Vehicle }) {
  return (
    <Link href={`/vehicles/${vehicle.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0">
              <VehicleTypeIcon type={vehicle.type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">
                {vehicle.make} {vehicle.model}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                {vehicle.year && (
                  <span className="text-xs text-muted-foreground">{vehicle.year}</span>
                )}
                {vehicle.plate && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {vehicle.plate}
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  {vehicleTypeLabel(vehicle.type)}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

type TypeFilter = 'all' | VehicleType

interface VehiclesListProps {
  vehicles: Vehicle[]
}

export function VehiclesList({ vehicles }: VehiclesListProps) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return vehicles.filter((v) => {
      if (typeFilter !== 'all' && v.type !== typeFilter) return false
      if (!query) return true
      return (
        v.make.toLowerCase().includes(query) ||
        v.model.toLowerCase().includes(query) ||
        (v.plate?.toLowerCase().includes(query) ?? false) ||
        (v.vin?.toLowerCase().includes(query) ?? false)
      )
    })
  }, [vehicles, search, typeFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <Input
          placeholder="Cerca per marca, modello, targa, VIN..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti</SelectItem>
            <SelectItem value="car">Auto</SelectItem>
            <SelectItem value="moto">Moto</SelectItem>
            <SelectItem value="truck">Camion</SelectItem>
            <SelectItem value="other">Altro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Car className="h-8 w-8 text-muted-foreground" />
          </div>
          {vehicles.length === 0 ? (
            <>
              <h2 className="text-xl font-semibold">Nessun veicolo</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Non hai ancora aggiunto veicoli.
              </p>
              <Button asChild className="mt-6">
                <Link href="/vehicles/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi il tuo primo veicolo
                </Link>
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Nessun veicolo trovato</h2>
              <p className="text-muted-foreground mt-2 max-w-sm">
                Nessun veicolo corrisponde ai filtri selezionati.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((vehicle) => (
            <VehicleRow key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  )
}
