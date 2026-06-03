import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'

export const orgMemberRole = pgEnum('org_member_role', ['admin', 'member'])
export const orgPlan = pgEnum('org_plan', ['free', 'pro'])

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
  plan: orgPlan('plan').default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const orgMembers = pgTable(
  'org_members',
  {
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: orgMemberRole('role').default('member'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
  },
  (table) => [
    primaryKey({ columns: [table.orgId, table.userId] }),
    index('org_members_org_id_idx').on(table.orgId),
  ],
)
