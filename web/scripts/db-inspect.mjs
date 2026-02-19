import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:123456@localhost:5432/postgres?schema=public";

const pool = new Pool({ connectionString });

try {
  const db = await pool.query("SELECT current_database() AS db");
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  const users = await pool.query(
    "SELECT email, role FROM users ORDER BY email LIMIT 20"
  ).catch(() => ({ rows: [] }));

  console.log("DATABASE:", db.rows[0]?.db);
  console.log("TABLES:", tables.rows.map((r) => r.table_name));
  console.log("USERS:", users.rows);
} finally {
  await pool.end();
}
