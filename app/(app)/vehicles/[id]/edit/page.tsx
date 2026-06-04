import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVehicle, updateVehicle } from '@/lib/actions/vehicles'
import EditVehicleForm from './EditVehicleForm'

export default async function EditVehiclePage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const vehicle = await getVehicle(params.id, user.id).catch(() => null)
  if (!vehicle) notFound()

  return (
    <EditVehicleForm
      vehicleId={vehicle.id}
      userId={user.id}
      defaultValues={{
        type: vehicle.type,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year ?? undefined,
        plate: vehicle.plate ?? undefined,
        vin: vehicle.vin ?? undefined,
        color: vehicle.color ?? undefined,
        notes: vehicle.notes ?? undefined,
      }}
    />
  )
}
