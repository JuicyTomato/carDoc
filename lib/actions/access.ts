'use server'

import { db } from '@/db'
import { orgMembers, vehicles, vehicleAccess } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getUserOrg } from '@/lib/actions/vehicles'
import type { OrgMemberRole, VehicleAccessRole } from '@/types'

// ─── Admin user lookup helper ─────────────────────────────────────────────────

/** Find a user by email by paging through all users (max 10k). */
async function findUserByEmail(
  email: string,
): Promise<{ id: string; email: string } | null> {
  let page = 1
  const perPage = 1000

  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error || !data) return null

    const match = data.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    )
    if (match) return { id: match.id, email: match.email ?? email }

    // If we got fewer than perPage results there are no more pages
    if (data.users.length < perPage) return null
    page++
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assertOrgAdmin(adminUserId: string): Promise<string> {
  const org = await getUserOrg(adminUserId)
  if (!org || org.role !== 'admin') {
    throw new Error('Solo gli amministratori possono eseguire questa operazione')
  }
  return org.orgId
}

async function assertVehicleAdmin(vehicleId: string, adminUserId: string): Promise<void> {
  const rows = await db
    .select({ role: vehicleAccess.role })
    .from(vehicleAccess)
    .where(and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, adminUserId)))
    .limit(1)

  if (rows.length === 0 || rows[0].role !== 'admin') {
    throw new Error('Solo gli amministratori del veicolo possono eseguire questa operazione')
  }
}

// ─── Org member actions ───────────────────────────────────────────────────────

export async function getOrgMembers(
  userId: string,
): Promise<{ userId: string; role: OrgMemberRole; email: string | null; joinedAt: Date | null }[]> {
  const org = await getUserOrg(userId)
  if (!org) return []

  const members = await db
    .select({
      userId: orgMembers.userId,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
    })
    .from(orgMembers)
    .where(eq(orgMembers.orgId, org.orgId))

  // Fetch emails via admin API
  const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
  const allUsers = listData?.users ?? []
  const userMap = new Map(allUsers.map((u) => [u.id, u.email ?? null]))

  return members.map((m) => ({
    userId: m.userId,
    role: (m.role ?? 'member') as OrgMemberRole,
    email: userMap.get(m.userId) ?? null,
    joinedAt: m.joinedAt,
  }))
}

export async function inviteToOrg(
  email: string,
  role: OrgMemberRole,
  invitedBy: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const orgId = await assertOrgAdmin(invitedBy)

    const found = await findUserByEmail(email)
    if (!found) {
      return { success: false, error: 'Utente non trovato' }
    }

    const targetUserId = found.id

    // Check if already a member
    const existing = await db
      .select({ userId: orgMembers.userId })
      .from(orgMembers)
      .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)))
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: "L'utente è già membro dell'organizzazione" }
    }

    await db.insert(orgMembers).values({
      orgId,
      userId: targetUserId,
      role,
      invitedAt: new Date(),
      joinedAt: new Date(),
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return { success: false, error: message }
  }
}

export async function updateOrgMemberRole(
  targetUserId: string,
  role: OrgMemberRole,
  adminUserId: string,
): Promise<void> {
  const orgId = await assertOrgAdmin(adminUserId)

  await db
    .update(orgMembers)
    .set({ role })
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)))
}

export async function removeFromOrg(targetUserId: string, adminUserId: string): Promise<void> {
  const orgId = await assertOrgAdmin(adminUserId)

  if (targetUserId === adminUserId) {
    throw new Error('Non puoi rimuovere te stesso dall\'organizzazione')
  }

  await db
    .delete(orgMembers)
    .where(and(eq(orgMembers.orgId, orgId), eq(orgMembers.userId, targetUserId)))
}

// ─── Vehicle access actions ───────────────────────────────────────────────────

export async function getVehicleAccessList(
  vehicleId: string,
  userId: string,
): Promise<{ userId: string; role: VehicleAccessRole; email: string | null }[]> {
  // Verify the requesting user has access to this vehicle
  const access = await db
    .select({ role: vehicleAccess.role })
    .from(vehicleAccess)
    .where(and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, userId)))
    .limit(1)

  if (access.length === 0) {
    throw new Error('Accesso negato')
  }

  const callerRole = (access[0].role ?? 'viewer') as VehicleAccessRole
  const isAdmin = callerRole === 'admin'

  const rows = await db
    .select({
      userId: vehicleAccess.userId,
      role: vehicleAccess.role,
    })
    .from(vehicleAccess)
    .where(eq(vehicleAccess.vehicleId, vehicleId))

  // Only admins can see other members' emails
  if (!isAdmin) {
    return rows.map((r) => ({
      userId: r.userId,
      role: (r.role ?? 'viewer') as VehicleAccessRole,
      email: r.userId === userId ? null : null,
    }))
  }

  const { data: listData } = await supabaseAdmin.auth.admin.listUsers()
  const allUsers = listData?.users ?? []
  const userMap = new Map(allUsers.map((u) => [u.id, u.email ?? null]))

  return rows.map((r) => ({
    userId: r.userId,
    role: (r.role ?? 'viewer') as VehicleAccessRole,
    email: userMap.get(r.userId) ?? null,
  }))
}

export async function grantVehicleAccess(
  vehicleId: string,
  targetEmail: string,
  role: VehicleAccessRole,
  grantedBy: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await assertVehicleAdmin(vehicleId, grantedBy)

    const found = await findUserByEmail(targetEmail)
    if (!found) {
      return { success: false, error: 'Utente non trovato' }
    }

    const targetUserId = found.id

    // Check if already has access
    const existing = await db
      .select({ userId: vehicleAccess.userId })
      .from(vehicleAccess)
      .where(and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, targetUserId)))
      .limit(1)

    if (existing.length > 0) {
      return { success: false, error: "L'utente ha già accesso a questo veicolo" }
    }

    // Verify vehicle exists and check which org it belongs to
    const vehicleRow = await db
      .select({ orgId: vehicles.orgId })
      .from(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .limit(1)

    if (vehicleRow.length === 0) {
      return { success: false, error: 'Veicolo non trovato' }
    }

    await db.insert(vehicleAccess).values({
      vehicleId,
      userId: targetUserId,
      role,
      grantedBy,
      grantedAt: new Date(),
    })

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return { success: false, error: message }
  }
}

export async function updateVehicleAccess(
  vehicleId: string,
  targetUserId: string,
  role: VehicleAccessRole,
  adminUserId: string,
): Promise<void> {
  await assertVehicleAdmin(vehicleId, adminUserId)

  await db
    .update(vehicleAccess)
    .set({ role })
    .where(and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, targetUserId)))
}

export async function revokeVehicleAccess(
  vehicleId: string,
  targetUserId: string,
  adminUserId: string,
): Promise<void> {
  await assertVehicleAdmin(vehicleId, adminUserId)

  if (targetUserId === adminUserId) {
    throw new Error('Non puoi revocare il tuo stesso accesso al veicolo')
  }

  await db
    .delete(vehicleAccess)
    .where(and(eq(vehicleAccess.vehicleId, vehicleId), eq(vehicleAccess.userId, targetUserId)))
}
