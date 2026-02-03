import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://localhost:5432/postgres"; // fallback for dev

// Reuse a single pool across hot-reloads in dev
const globalForPool = global as unknown as { __pgPool?: Pool };

export const pool =
  globalForPool.__pgPool ??
  new Pool({
    connectionString,
    max: 10,
  });

if (!globalForPool.__pgPool) {
  globalForPool.__pgPool = pool;
}

export async function ensureUserSchema() {
  const client = await pool.connect();
  try {
    await client.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        department TEXT NOT NULL DEFAULT 'general',
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'general';",
    );
    await client.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';",
    );
    await client.query(
      "ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();",
    );
    await client.query(
      "ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT now();",
    );
  } finally {
    client.release();
  }
}
