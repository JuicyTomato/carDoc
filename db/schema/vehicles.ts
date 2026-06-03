import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  make: text('make').notNull(),
  model: text('model').notNull(),
  year: integer('year'),
  plate: text('plate'),
  vin: text('vin'),
  color: text('color'),
  notes: text('notes'),
  archivedAt: timestamp('archived_at'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const vehicleAccess = pgTable(
  'vehicle_access',
  {
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: text('role').default('viewer'),
    grantedBy: uuid('granted_by'),
    grantedAt: timestamp('granted_at').defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.vehicleId, table.userId] }),
  }),
)
