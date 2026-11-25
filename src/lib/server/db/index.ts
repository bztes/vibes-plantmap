import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { building } from '$app/env';
import { DATA_DIR } from '$app/env/private';

export const dataDir = path.resolve(DATA_DIR);
if (!building) mkdirSync(dataDir, { recursive: true });

const client = createClient({
	url: building ? ':memory:' : `file:${path.join(dataDir, 'local.db')}`
});

export const db = drizzle(client, { schema });

// Bring the schema up to date (run `pnpm db:generate` after changing the schema)
if (!building) await migrate(db, { migrationsFolder: 'drizzle' });
