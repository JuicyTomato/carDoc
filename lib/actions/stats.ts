'use server'

import { db } from '@/db'
import {
  vehicleAccess,
  vehicles,
  documents,
  insuranceDetails,
  revisionDetails,
  maintenanceDetails,
  orgMembers,
} from '@/db/schema'
import { eq, and, inArray, isNull, or, sql, gte, lte } from 'drizzle-orm'

export type FleetStats = {
  totalVehicles: number
  totalDocuments: number
  totalMaintenanceCost: number
  totalInsurancePremium: number
  latestMileageByVehicle: { vehicleId: string; make: string; model: string; mileage: number }[]
  documentsByType: { type: string; count: number }[]
  expiringNext30Days: number
}

export async function getFleetStats(userId: string): Promise<FleetStats> {
  // Get vehicle IDs from direct access
  const accessRows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(eq(vehicleAccess.userId, userId))

  // Get admin org IDs
  const adminOrgRows = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(and(eq(orgMembers.userId, userId), eq(orgMembers.role, 'admin')))

  const directVehicleIds = accessRows.map((r) => r.vehicleId)
  const adminOrgIds = adminOrgRows.map((r) => r.orgId)

  if (directVehicleIds.length === 0 && adminOrgIds.length === 0) {
    return {
      totalVehicles: 0,
      totalDocuments: 0,
      totalMaintenanceCost: 0,
      totalInsurancePremium: 0,
      latestMileageByVehicle: [],
      documentsByType: [],
      expiringNext30Days: 0,
    }
  }

  // Build condition for vehicles
  const vehicleConditions = [isNull(vehicles.archivedAt)]
  const accessConditions = []
  if (directVehicleIds.length > 0) accessConditions.push(inArray(vehicles.id, directVehicleIds))
  if (adminOrgIds.length > 0) accessConditions.push(inArray(vehicles.orgId, adminOrgIds))
  vehicleConditions.push(or(...accessConditions)!)

  // Get all accessible vehicles
  const allVehicles = await db
    .select({ id: vehicles.id, make: vehicles.make, model: vehicles.model })
    .from(vehicles)
    .where(and(...vehicleConditions))

  if (allVehicles.length === 0) {
    return {
      totalVehicles: 0,
      totalDocuments: 0,
      totalMaintenanceCost: 0,
      totalInsurancePremium: 0,
      latestMileageByVehicle: [],
      documentsByType: [],
      expiringNext30Days: 0,
    }
  }

  const vehicleIds = allVehicles.map((v) => v.id)

  // Total documents
  const docCountRows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(documents)
    .where(inArray(documents.vehicleId, vehicleIds))

  const totalDocuments = docCountRows[0]?.count ?? 0

  // Documents by type
  const docsByTypeRows = await db
    .select({
      type: documents.type,
      count: sql<number>`COUNT(*)::int`,
    })
    .from(documents)
    .where(inArray(documents.vehicleId, vehicleIds))
    .groupBy(documents.type)

  // Total maintenance cost
  const maintCostRows = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${maintenanceDetails.cost} AS numeric)), 0)`,
    })
    .from(maintenanceDetails)
    .innerJoin(documents, eq(maintenanceDetails.documentId, documents.id))
    .where(inArray(documents.vehicleId, vehicleIds))

  const totalMaintenanceCost = Number(maintCostRows[0]?.total ?? 0)

  // Total insurance premium
  const insurancePremiumRows = await db
    .select({
      total: sql<number>`COALESCE(SUM(CAST(${insuranceDetails.premium} AS numeric)), 0)`,
    })
    .from(insuranceDetails)
    .innerJoin(documents, eq(insuranceDetails.documentId, documents.id))
    .where(inArray(documents.vehicleId, vehicleIds))

  const totalInsurancePremium = Number(insurancePremiumRows[0]?.total ?? 0)

  // Latest mileage per vehicle: MAX of revision mileage and maintenance mileage
  const revMileageRows = await db
    .select({
      vehicleId: documents.vehicleId,
      mileage: sql<number>`MAX(${revisionDetails.mileageAtRevision})`,
    })
    .from(revisionDetails)
    .innerJoin(documents, eq(revisionDetails.documentId, documents.id))
    .where(inArray(documents.vehicleId, vehicleIds))
    .groupBy(documents.vehicleId)

  const maintMileageRows = await db
    .select({
      vehicleId: documents.vehicleId,
      mileage: sql<number>`MAX(${maintenanceDetails.mileage})`,
    })
    .from(maintenanceDetails)
    .innerJoin(documents, eq(maintenanceDetails.documentId, documents.id))
    .where(inArray(documents.vehicleId, vehicleIds))
    .groupBy(documents.vehicleId)

  // Combine mileage: take max per vehicleId
  const mileageMap = new Map<string, number>()
  for (const row of revMileageRows) {
    if (row.mileage != null) {
      const current = mileageMap.get(row.vehicleId) ?? 0
      mileageMap.set(row.vehicleId, Math.max(current, Number(row.mileage)))
    }
  }
  for (const row of maintMileageRows) {
    if (row.mileage != null) {
      const current = mileageMap.get(row.vehicleId) ?? 0
      mileageMap.set(row.vehicleId, Math.max(current, Number(row.mileage)))
    }
  }

  const latestMileageByVehicle = allVehicles
    .filter((v) => mileageMap.has(v.id))
    .map((v) => ({
      vehicleId: v.id,
      make: v.make,
      model: v.model,
      mileage: mileageMap.get(v.id)!,
    }))
    .sort((a, b) => b.mileage - a.mileage)

  // Expiring in next 30 days
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + 30)
  const todayStr = today.toISOString().slice(0, 10)
  const futureStr = future.toISOString().slice(0, 10)

  const expiringRows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(documents)
    .where(
      and(
        inArray(documents.vehicleId, vehicleIds),
        eq(documents.isActive, true),
        gte(documents.expiryDate, todayStr),
        lte(documents.expiryDate, futureStr),
      ),
    )

  const expiringNext30Days = expiringRows[0]?.count ?? 0

  return {
    totalVehicles: allVehicles.length,
    totalDocuments: Number(totalDocuments),
    totalMaintenanceCost,
    totalInsurancePremium,
    latestMileageByVehicle,
    documentsByType: docsByTypeRows.map((r) => ({ type: r.type, count: Number(r.count) })),
    expiringNext30Days: Number(expiringNext30Days),
  }
}
