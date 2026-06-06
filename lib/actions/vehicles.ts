'use server'

import { db } from '@/db'
import { organizations, orgMembers, vehicles, vehicleAccess, documents, documentFiles } from '@/db/schema'
import { eq, and, isNull, isNotNull, inArray, or } from 'drizzle-orm'
import type { Vehicle, VehicleType } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

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
  responsibleUserId?: string | null
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
  const accessRows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(eq(vehicleAccess.userId, userId))

  const adminOrgRows = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.role, 'admin')))

  const vehicleIds = accessRows.map((r) => r.vehicleId)
  const adminOrgIds = adminOrgRows.map((r) => r.orgId)

  if (vehicleIds.length === 0 && adminOrgIds.length === 0) return []

  const conditions = [isNull(vehicles.archivedAt)]
  const accessConditions = []
  if (vehicleIds.length > 0) accessConditions.push(inArray(vehicles.id, vehicleIds))
  if (adminOrgIds.length > 0) accessConditions.push(inArray(vehicles.orgId, adminOrgIds))
  conditions.push(or(...accessConditions)!)

  return db
    .select()
    .from(vehicles)
    .where(and(...conditions))
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
      ...(data.responsibleUserId !== undefined && { responsibleUserId: data.responsibleUserId }),
    })
    .where(eq(vehicles.id, vehicleId))
}

export async function getVehicleWithResponsible(
  vehicleId: string,
  userId: string,
): Promise<{ vehicle: Vehicle; responsibleEmail: string | null }> {
  const vehicle = await getVehicle(vehicleId, userId)
  if (!vehicle) {
    throw new Error('Vehicle not found')
  }

  let responsibleEmail: string | null = null
  if (vehicle.responsibleUserId) {
    try {
      const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(vehicle.responsibleUserId)
      responsibleEmail = user?.email ?? null
    } catch {
      // ignore
    }
  }

  return { vehicle, responsibleEmail }
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

export async function restoreVehicle(
  vehicleId: string,
  userId: string,
): Promise<void> {
  await assertVehicleAccess(vehicleId, userId)

  await db
    .update(vehicles)
    .set({ archivedAt: null })
    .where(eq(vehicles.id, vehicleId))
}

export async function deleteVehicle(vehicleId: string, userId: string): Promise<void> {
  const accessRows = await db
    .select({ role: vehicleAccess.role })
    .from(vehicleAccess)
    .where(and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, userId)))
    .limit(1)

  if (accessRows.length === 0 || accessRows[0].role !== 'admin') {
    throw new Error('Access denied')
  }

  const fileRows = await db
    .select({ storagePath: documentFiles.storagePath })
    .from(documentFiles)
    .innerJoin(documents, eq(documentFiles.documentId, documents.id))
    .where(eq(documents.vehicleId, vehicleId))

  const paths = fileRows.map((r) => r.storagePath).filter(Boolean) as string[]
  if (paths.length > 0) {
    await supabaseAdmin.storage.from('documents').remove(paths)
  }

  await db.delete(vehicles).where(eq(vehicles.id, vehicleId))
}

export async function getArchivedVehicles(userId: string): Promise<Vehicle[]> {
  const accessRows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(eq(vehicleAccess.userId, userId))

  const adminOrgRows = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.role, 'admin')))

  const vehicleIds = accessRows.map((r) => r.vehicleId)
  const adminOrgIds = adminOrgRows.map((r) => r.orgId)

  if (vehicleIds.length === 0 && adminOrgIds.length === 0) return []

  const accessConditions = []
  if (vehicleIds.length > 0) accessConditions.push(inArray(vehicles.id, vehicleIds))
  if (adminOrgIds.length > 0) accessConditions.push(inArray(vehicles.orgId, adminOrgIds))

  return db
    .select()
    .from(vehicles)
    .where(and(isNotNull(vehicles.archivedAt), or(...accessConditions)!))
    .orderBy(vehicles.archivedAt)
}
