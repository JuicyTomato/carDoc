import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'
import { documents } from './documents'

export const notificationPrefs = pgTable(
  'notification_prefs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    vehicleId: uuid('vehicle_id').references(() => vehicles.id, {
      onDelete: 'cascade',
    }),
    daysBefore: integer('days_before').array().default([30, 7, 1]),
    emailEnabled: boolean('email_enabled').default(true),
    inAppEnabled: boolean('in_app_enabled').default(true),
  },
  (table) => ({
    uniqUserVehicle: unique('notification_prefs_user_vehicle_unique').on(
      table.userId,
      table.vehicleId,
    ),
  }),
)

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  documentId: uuid('document_id').references(() => documents.id, {
    onDelete: 'cascade',
  }),
  type: text('type').default('expiry_warning'),
  channel: text('channel'),
  sentAt: timestamp('sent_at').defaultNow(),
  readAt: timestamp('read_at'),
})
