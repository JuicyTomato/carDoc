import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'
import { organizations } from './organizations'

export const vehicleType = pgEnum('vehicle_type', ['car', 'moto', 'truck', 'other'])
export const vehicleAccessRole = pgEnum('vehicle_access_role', ['admin', 'editor', 'viewer'])

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    type: vehicleType('type').notNull(),
    make: text('make').notNull(),
    model: text('model').notNull(),
    year: integer('year'),
    plate: text('plate'),
    vin: text('vin'),
    color: text('color'),
    notes: text('notes'),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [index('vehicles_org_id_idx').on(table.orgId)],
)

export const vehicleAccess = pgTable(
  'vehicle_access',
  {
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: vehicleAccessRole('role').default('viewer'),
    grantedBy: uuid('granted_by'),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.vehicleId, table.userId] }),
    index('vehicle_access_vehicle_id_idx').on(table.vehicleId),
    index('vehicle_access_user_id_idx').on(table.userId),
  ],
)
