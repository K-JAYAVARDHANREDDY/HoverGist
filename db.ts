import { Pool } from 'pg';

// We create a singleton pool to avoid opening too many connections
// during hot-reloads in Next.js development mode.
const globalForPg = global as unknown as { pgPool: Pool };

export const pool =
  globalForPg.pgPool ||
  new Pool({
    // You should set DATABASE_URL in your .env or .env.local file.
    // Example: postgresql://postgres:postgres@localhost:5432/animx
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = pool;
}

/**
 * Utility function to query the database.
 * @param text The SQL query string
 * @param params Optional array of parameters
 */
export async function query(text: string, params?: any[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // console.log('executed query', { text, duration, rows: res.rowCount });
  return res;
}
