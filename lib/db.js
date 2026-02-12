import { Pool } from "pg";

const globalForDb = globalThis;

export const pool = globalForDb.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL
});

if (!globalForDb.pgPool) {
  globalForDb.pgPool = pool;
}
