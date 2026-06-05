'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { restoreVehicle } from '@/lib/actions/vehicles'

interface Props {
  vehicleId: string
  userId: string
}

export function RestoreVehicleButton({ vehicleId, userId }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handle() {
    setLoading(true)
    try {
      await restoreVehicle(vehicleId, userId)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handle} disabled={loading}>
      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
      {loading ? 'Ripristino…' : 'Ripristina'}
    </Button>
  )
}
