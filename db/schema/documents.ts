import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  numeric,
  index,
} from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'

export const documentType = pgEnum('document_type', [
  'insurance',
  'revision',
  'maintenance',
  'tax',
  'registration',
  'other',
])
export const fileSource = pgEnum('file_source', ['upload', 'external'])
export const coverageType = pgEnum('coverage_type', ['RC', 'kasko', 'full'])

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    type: documentType('type').notNull(),
    title: text('title').notNull(),
    notes: text('notes'),
    expiryDate: date('expiry_date'),
    isActive: boolean('is_active').default(true),
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('documents_vehicle_id_idx').on(table.vehicleId),
    index('documents_expiry_date_idx').on(table.expiryDate),
  ],
)

export const documentFiles = pgTable(
  'document_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    source: fileSource('source').notNull(),
    storagePath: text('storage_path'),
    externalUrl: text('external_url'),
    filename: text('filename'),
    mimeType: text('mime_type'),
    sizeBytes: integer('size_bytes'),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('document_files_document_id_idx').on(table.documentId)],
)

export const insuranceDetails = pgTable('insurance_details', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  provider: text('provider'),
  policyNumber: text('policy_number'),
  coverageType: coverageType('coverage_type'),
  premium: numeric('premium', { precision: 10, scale: 2 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
})

export const revisionDetails = pgTable('revision_details', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  mileageAtRevision: integer('mileage_at_revision'),
  station: text('station'),
  passed: boolean('passed'),
  nextDueDate: date('next_due_date'),
  nextDueMileage: integer('next_due_mileage'),
})

export const maintenanceDetails = pgTable('maintenance_details', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  mileage: integer('mileage'),
  cost: numeric('cost', { precision: 10, scale: 2 }),
  workshop: text('workshop'),
  serviceType: text('service_type'),
  nextDueDate: date('next_due_date'),
  nextDueMileage: integer('next_due_mileage'),
  itemsReplaced: text('items_replaced').array(),
})
