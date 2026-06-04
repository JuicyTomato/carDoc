'use server'

import { db } from '@/db'
import {
  documents,
  vehicleAccess,
  insuranceDetails,
  revisionDetails,
  maintenanceDetails,
} from '@/db/schema'
import { eq, and, lte, gte, inArray } from 'drizzle-orm'
import type {
  Document,
  DocumentType,
  CoverageType,
  InsuranceDetails,
  RevisionDetails,
  MaintenanceDetails,
} from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateDocumentInput = {
  vehicleId: string
  type: DocumentType
  title: string
  notes?: string
  expiryDate?: string // ISO date string YYYY-MM-DD
  isActive?: boolean
  // insurance
  insurance?: {
    provider?: string
    policyNumber?: string
    coverageType?: CoverageType
    premium?: number
    startDate?: string
    endDate?: string
  }
  // revision
  revision?: {
    mileageAtRevision?: number
    station?: string
    passed?: boolean
    nextDueDate?: string
    nextDueMileage?: number
  }
  // maintenance
  maintenance?: {
    mileage?: number
    cost?: number
    workshop?: string
    serviceType?: string
    nextDueDate?: string
    nextDueMileage?: number
    itemsReplaced?: string[]
  }
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

async function assertDocumentAccess(
  documentId: string,
  userId: string,
): Promise<string> {
  const rows = await db
    .select({ vehicleId: documents.vehicleId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)

  if (rows.length === 0) throw new Error('Document not found')

  const { vehicleId } = rows[0]
  await assertVehicleAccess(vehicleId, userId)
  return vehicleId
}

// ─── Document queries ─────────────────────────────────────────────────────────

export async function getDocuments(
  vehicleId: string,
  userId: string,
  activeOnly = true,
): Promise<Document[]> {
  await assertVehicleAccess(vehicleId, userId)

  return db
    .select()
    .from(documents)
    .where(
      activeOnly
        ? and(eq(documents.vehicleId, vehicleId), eq(documents.isActive, true))
        : eq(documents.vehicleId, vehicleId),
    )
    .orderBy(documents.createdAt)
}

export async function getArchivedDocuments(
  vehicleId: string,
  userId: string,
): Promise<Document[]> {
  await assertVehicleAccess(vehicleId, userId)

  return db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.vehicleId, vehicleId),
        eq(documents.isActive, false),
      ),
    )
    .orderBy(documents.expiryDate)
}

export async function getDocument(
  documentId: string,
  userId: string,
): Promise<Document | null> {
  await assertDocumentAccess(documentId, userId)

  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)

  return rows[0] ?? null
}

export async function createDocument(
  data: CreateDocumentInput,
  userId: string,
): Promise<{ id: string }> {
  await assertVehicleAccess(data.vehicleId, userId)

  // Auto-archive the previous active document of the same type for this vehicle
  if (['insurance', 'revision', 'maintenance'].includes(data.type)) {
    await db
      .update(documents)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(documents.vehicleId, data.vehicleId),
          eq(documents.type, data.type),
          eq(documents.isActive, true),
        ),
      )
  }

  const [doc] = await db
    .insert(documents)
    .values({
      vehicleId: data.vehicleId,
      type: data.type,
      title: data.title,
      notes: data.notes,
      expiryDate: data.expiryDate,
      isActive: data.isActive ?? true,
      createdBy: userId,
    })
    .returning({ id: documents.id })

  if (data.type === 'insurance' && data.insurance) {
    const ins = data.insurance
    await db.insert(insuranceDetails).values({
      documentId: doc.id,
      provider: ins.provider,
      policyNumber: ins.policyNumber,
      coverageType: ins.coverageType,
      premium: ins.premium?.toString(),
      startDate: ins.startDate,
      endDate: ins.endDate,
    })
  }

  if (data.type === 'revision' && data.revision) {
    const rev = data.revision
    await db.insert(revisionDetails).values({
      documentId: doc.id,
      mileageAtRevision: rev.mileageAtRevision,
      station: rev.station,
      passed: rev.passed,
      nextDueDate: rev.nextDueDate,
      nextDueMileage: rev.nextDueMileage,
    })
  }

  if (data.type === 'maintenance' && data.maintenance) {
    const mnt = data.maintenance
    await db.insert(maintenanceDetails).values({
      documentId: doc.id,
      mileage: mnt.mileage,
      cost: mnt.cost?.toString(),
      workshop: mnt.workshop,
      serviceType: mnt.serviceType,
      nextDueDate: mnt.nextDueDate,
      nextDueMileage: mnt.nextDueMileage,
      itemsReplaced: mnt.itemsReplaced,
    })
  }

  return { id: doc.id }
}

export async function updateDocument(
  documentId: string,
  data: Partial<CreateDocumentInput>,
  userId: string,
): Promise<void> {
  await assertDocumentAccess(documentId, userId)

  await db
    .update(documents)
    .set({
      ...(data.title !== undefined && { title: data.title }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(documents.id, documentId))
}

export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  await assertDocumentAccess(documentId, userId)

  await db.delete(documents).where(eq(documents.id, documentId))
}

export async function getExpiringDocuments(
  userId: string,
  daysAhead: number,
): Promise<Document[]> {
  // Get vehicleIds user has access to
  const accessRows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(eq(vehicleAccess.userId, userId))

  if (accessRows.length === 0) return []

  const vehicleIds = accessRows.map((r) => r.vehicleId)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const future = new Date(today)
  future.setDate(future.getDate() + daysAhead)

  const todayStr = today.toISOString().slice(0, 10)
  const futureStr = future.toISOString().slice(0, 10)

  return db
    .select()
    .from(documents)
    .where(
      and(
        inArray(documents.vehicleId, vehicleIds),
        eq(documents.isActive, true),
        gte(documents.expiryDate, todayStr),
        lte(documents.expiryDate, futureStr),
      ),
    )
    .orderBy(documents.expiryDate)
}

// ─── Type-specific detail queries ─────────────────────────────────────────────

export async function getInsuranceDetails(
  documentId: string,
): Promise<InsuranceDetails | null> {
  const rows = await db
    .select()
    .from(insuranceDetails)
    .where(eq(insuranceDetails.documentId, documentId))
    .limit(1)
  return rows[0] ?? null
}

export async function getRevisionDetails(
  documentId: string,
): Promise<RevisionDetails | null> {
  const rows = await db
    .select()
    .from(revisionDetails)
    .where(eq(revisionDetails.documentId, documentId))
    .limit(1)
  return rows[0] ?? null
}

export async function getMaintenanceDetails(
  documentId: string,
): Promise<MaintenanceDetails | null> {
  const rows = await db
    .select()
    .from(maintenanceDetails)
    .where(eq(maintenanceDetails.documentId, documentId))
    .limit(1)
  return rows[0] ?? null
}
