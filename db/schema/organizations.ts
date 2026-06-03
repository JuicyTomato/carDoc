import {
  pgTable,
  uuid,
  text,
  varchar,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core'

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  plan: text('plan').default('free'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: text('role').default('member'),
    invitedAt: timestamp('invited_at'),
    joinedAt: timestamp('joined_at'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.orgId, table.userId] }),
  }),
)
