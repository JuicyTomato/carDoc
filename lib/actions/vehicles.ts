'use server'

import { db } from '@/db'
import { organizations, orgMembers, vehicles, vehicleAccess } from '@/db/schema'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import type { Vehicle, VehicleType } from '@/types'
import { createClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateVehicleInput = {
  type: VehicleType
  make: string
  model: string
  year?: number
  plate?: string
  vin?: string
  color?: string
  notes?: string
}

// ─── Org helpers ─────────────────────────────────────────────────────────────

export async function getUserOrg(
  userId: string,
): Promise<{ orgId: string; role: string } | null> {
  const rows = await db
    .select({ orgId: orgMembers.orgId, role: orgMembers.role })
    .from(orgMembers)
    .where(eq(orgMembers.userId, userId))
    .limit(1)

  if (rows.length === 0) return null
  return { orgId: rows[0].orgId, role: rows[0].role ?? 'member' }
}

export async function getOrCreateOrg(userId: string): Promise<string> {
  const existing = await getUserOrg(userId)
  if (existing) return existing.orgId

  // Auto-create org based on email prefix
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const emailPrefix = user?.email?.split('@')[0] ?? 'user'
  const orgName =
    emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
  const random4 = Math.random().toString(36).substring(2, 6)
  const slug = `${emailPrefix.toLowerCase()}-${random4}`

  const [org] = await db
    .insert(organizations)
    .values({ name: orgName, slug })
    .returning({ id: organizations.id })

  await db.insert(orgMembers).values({
    orgId: org.id,
    userId,
    role: 'admin',
    joinedAt: new Date(),
  })

  return org.id
}

// ─── Access check ─────────────────────────────────────────────────────────────

async function assertVehicleAccess(
  vehicleId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(
      and(
        eq(vehicleAccess.vehicleId, vehicleId),
        eq(vehicleAccess.userId, userId),
      ),
    )
    .limit(1)

  if (rows.length === 0) {
    throw new Error('Access denied')
  }
}

// ─── Vehicle queries ──────────────────────────────────────────────────────────

export async function getVehicles(userId: string): Promise<Vehicle[]> {
  // Get vehicleIds user has access to
  const accessRows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(eq(vehicleAccess.userId, userId))

  if (accessRows.length === 0) return []

  const vehicleIds = accessRows.map((r) => r.vehicleId)

  return db
    .select()
    .from(vehicles)
    .where(and(inArray(vehicles.id, vehicleIds), isNull(vehicles.archivedAt)))
}

export async function getVehicle(
  vehicleId: string,
  userId: string,
): Promise<Vehicle | null> {
  await assertVehicleAccess(vehicleId, userId)

  const rows = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.id, vehicleId))
    .limit(1)

  return rows[0] ?? null
}

export async function createVehicle(
  data: CreateVehicleInput,
  userId: string,
): Promise<{ id: string }> {
  const orgId = await getOrCreateOrg(userId)

  const [vehicle] = await db
    .insert(vehicles)
    .values({
      orgId,
      type: data.type,
      make: data.make,
      model: data.model,
      year: data.year,
      plate: data.plate,
      vin: data.vin,
      color: data.color,
      notes: data.notes,
    })
    .returning({ id: vehicles.id })

  await db.insert(vehicleAccess).values({
    vehicleId: vehicle.id,
    userId,
    role: 'admin',
    grantedBy: userId,
    grantedAt: new Date(),
  })

  return { id: vehicle.id }
}

export async function updateVehicle(
  vehicleId: string,
  data: Partial<CreateVehicleInput>,
  userId: string,
): Promise<void> {
  await assertVehicleAccess(vehicleId, userId)

  await db
    .update(vehicles)
    .set({
      ...(data.type !== undefined && { type: data.type }),
      ...(data.make !== undefined && { make: data.make }),
      ...(data.model !== undefined && { model: data.model }),
      ...(data.year !== undefined && { year: data.year }),
      ...(data.plate !== undefined && { plate: data.plate }),
      ...(data.vin !== undefined && { vin: data.vin }),
      ...(data.color !== undefined && { color: data.color }),
      ...(data.notes !== undefined && { notes: data.notes }),
    })
    .where(eq(vehicles.id, vehicleId))
}

export async function archiveVehicle(
  vehicleId: string,
  userId: string,
): Promise<void> {
  await assertVehicleAccess(vehicleId, userId)

  await db
    .update(vehicles)
    .set({ archivedAt: new Date() })
    .where(eq(vehicles.id, vehicleId))
}
