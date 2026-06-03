'use server'

/*
 * NOTE: The Supabase Storage bucket "documents" must be created manually:
 * Supabase Dashboard → Storage → New bucket → name: "documents" → Private (RLS on)
 */

import { db } from '@/db'
import { documentFiles, documents, vehicleAccess, vehicles } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { createClient } from '@/lib/supabase/server'
import type { DocumentFile } from '@/types'

// ─── Access helpers ───────────────────────────────────────────────────────────

async function getDocumentVehicleOrg(
  documentId: string,
): Promise<{ vehicleId: string; orgId: string }> {
  const rows = await db
    .select({ vehicleId: documents.vehicleId, orgId: vehicles.orgId })
    .from(documents)
    .innerJoin(vehicles, eq(documents.vehicleId, vehicles.id))
    .where(eq(documents.id, documentId))
    .limit(1)

  if (rows.length === 0) throw new Error('Document not found')
  return rows[0]
}

async function assertDocumentAccess(
  documentId: string,
  userId: string,
): Promise<{ vehicleId: string; orgId: string }> {
  const info = await getDocumentVehicleOrg(documentId)

  const accessRows = await db
    .select({ vehicleId: vehicleAccess.vehicleId })
    .from(vehicleAccess)
    .where(
      and(
        eq(vehicleAccess.vehicleId, info.vehicleId),
        eq(vehicleAccess.userId, userId),
      ),
    )
    .limit(1)

  if (accessRows.length === 0) throw new Error('Access denied')
  return info
}

// ─── File actions ─────────────────────────────────────────────────────────────

export async function getDocumentFiles(
  documentId: string,
): Promise<DocumentFile[]> {
  return db
    .select()
    .from(documentFiles)
    .where(eq(documentFiles.documentId, documentId))
    .orderBy(documentFiles.uploadedAt)
}

export async function addExternalLink(
  documentId: string,
  url: string,
  filename: string,
): Promise<void> {
  await db.insert(documentFiles).values({
    documentId,
    source: 'external',
    externalUrl: url,
    filename,
  })
}

export async function deleteFile(
  fileId: string,
  userId: string,
): Promise<void> {
  const rows = await db
    .select({ documentId: documentFiles.documentId, storagePath: documentFiles.storagePath })
    .from(documentFiles)
    .where(eq(documentFiles.id, fileId))
    .limit(1)

  if (rows.length === 0) throw new Error('File not found')

  const { documentId, storagePath } = rows[0]
  await assertDocumentAccess(documentId, userId)

  if (storagePath) {
    const supabase = createClient()
    await supabase.storage.from('documents').remove([storagePath])
  }

  await db.delete(documentFiles).where(eq(documentFiles.id, fileId))
}

export async function getUploadUrl(
  documentId: string,
  filename: string,
  mimeType: string,
  userId: string,
): Promise<{ signedUrl: string; storagePath: string }> {
  const { vehicleId, orgId } = await assertDocumentAccess(documentId, userId)

  const storagePath = `${orgId}/${vehicleId}/${documentId}/${filename}`

  const supabase = createClient()
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUploadUrl(storagePath)

  if (error) throw new Error(error.message)
  return { signedUrl: data.signedUrl, storagePath }
}

export async function confirmUpload(
  fileId: string,
  storagePath: string,
  filename: string,
  mimeType: string,
  sizeBytes: number,
): Promise<void> {
  await db
    .update(documentFiles)
    .set({ storagePath, filename, mimeType, sizeBytes })
    .where(eq(documentFiles.id, fileId))
}

export async function createUploadFileRecord(
  documentId: string,
  storagePath: string,
  filename: string,
  mimeType: string,
): Promise<{ id: string }> {
  const [file] = await db
    .insert(documentFiles)
    .values({
      documentId,
      source: 'upload',
      storagePath,
      filename,
      mimeType,
    })
    .returning({ id: documentFiles.id })

  return { id: file.id }
}
