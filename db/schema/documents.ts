import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  timestamp,
  numeric,
} from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  notes: text('notes'),
  expiryDate: date('expiry_date'),
  isActive: boolean('is_active').default(true),
  createdBy: uuid('created_by'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const documentFiles = pgTable('document_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  source: text('source').notNull(),
  storagePath: text('storage_path'),
  externalUrl: text('external_url'),
  filename: text('filename'),
  mimeType: text('mime_type'),
  sizeBytes: integer('size_bytes'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
})

export const insuranceDetails = pgTable('insurance_details', {
  documentId: uuid('document_id')
    .primaryKey()
    .references(() => documents.id, { onDelete: 'cascade' }),
  provider: text('provider'),
  policyNumber: text('policy_number'),
  coverageType: text('coverage_type'),
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
