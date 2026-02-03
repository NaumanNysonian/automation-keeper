const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const connectionString =
  "postgresql://neondb_owner:npg_z3AkQIRTGKV1@ep-long-surf-ah96wsf6-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function main() {
  const pool = new Pool({ connectionString });
  const email = "admin@nysonian.com";
  const password = "admin";
  const name = "Admin";
  const department = "admin";
  const role = "admin";

  const hash = await bcrypt.hash(password, 10);
  await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  const sql =
    "INSERT INTO users (email, password_hash, name, department, role) " +
    "VALUES ($1,$2,$3,$4,$5) " +
    "ON CONFLICT (email) DO UPDATE SET " +
    "password_hash = EXCLUDED.password_hash, " +
    "name = EXCLUDED.name, " +
    "department = EXCLUDED.department, " +
    "role = EXCLUDED.role, " +
    "updated_at = now();";

  await pool.query(sql, [email, hash, name, department, role]);
  console.log("Admin user upserted:", email);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
