import { type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from '$lib/server/db/schema.js';

export type D1Database = DrizzleD1Database<typeof schema>;
