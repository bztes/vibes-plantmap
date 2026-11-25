import path from 'node:path';
import { defineConfig } from 'drizzle-kit';

// same location as the app: <DATA_DIR>/local.db
const dataDir = path.resolve(process.env.DATA_DIR || './data');

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	dbCredentials: { url: `file:${path.join(dataDir, 'local.db')}` },
	verbose: true,
	strict: true
});
