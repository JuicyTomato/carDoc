import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

// Drizzle client stub — DATABASE_URL must be set in environment
export const db = drizzle(process.env.DATABASE_URL!, { schema })
