import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import type { Config } from 'drizzle-kit'

expand(config({ path: '.env.local' }))

export default {
  schema: './db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
} satisfies Config
