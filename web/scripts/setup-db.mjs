import { Pool } from "pg";
import bcrypt from "bcryptjs";

const adminConnection = "postgresql://postgres:123456@localhost:5432/postgres";
const appDatabase = "ai_chatbot";
const appConnection = `postgresql://postgres:123456@localhost:5432/${appDatabase}?schema=public`;

async function ensureDatabase() {
  const adminPool = new Pool({ connectionString: adminConnection });
  try {
    const exists = await adminPool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [appDatabase]
    );
    if (exists.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${appDatabase}`);
      console.log(`Created database: ${appDatabase}`);
    } else {
      console.log(`Database already exists: ${appDatabase}`);
    }
  } finally {
    await adminPool.end();
  }
}

async function ensureTables() {
  const pool = new Pool({ connectionString: appConnection });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        domain TEXT UNIQUE NOT NULL,
        status TEXT NOT NULL,
        plan TEXT NOT NULL,
        language TEXT NOT NULL,
        timezone TEXT NOT NULL,
        logo_url TEXT,
        primary_color TEXT NOT NULL,
        accent_color TEXT NOT NULL,
        header_text TEXT NOT NULL,
        welcome_message TEXT NOT NULL,
        custom_domain TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        active_users INTEGER NOT NULL,
        total_users INTEGER NOT NULL,
        storage_used_mb INTEGER NOT NULL,
        api_calls_this_month INTEGER NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        tenant_ids TEXT[] NOT NULL DEFAULT '{}',
        password_hash TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_tenants (
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, tenant_id)
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS refresh_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT FALSE,
        replaced_by_session_id TEXT,
        reuse_detected BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        actor TEXT NOT NULL,
        actor_email TEXT NOT NULL,
        action TEXT NOT NULL,
        target TEXT NOT NULL,
        details JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        ip TEXT NOT NULL
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        key TEXT UNIQUE NOT NULL,
        scope TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        last_used TIMESTAMPTZ
      );
    `);
    const count = await pool.query("SELECT COUNT(*)::int AS count FROM tenants");
    if ((count.rows[0]?.count ?? 0) === 0) {
      const passwordHash = await bcrypt.hash("password123", 10);
      await pool.query(
        `INSERT INTO tenants (id,name,domain,status,plan,language,timezone,logo_url,primary_color,accent_color,header_text,welcome_message,custom_domain,created_at,active_users,total_users,storage_used_mb,api_calls_this_month)
         VALUES
         ('t1','Acme Corporation','acme.example.com','active','enterprise','en','America/New_York',NULL,'#2563eb','#06b6d4','Acme Portal','Welcome to Acme Corporation''s management portal.','portal.acme.com',NOW(),145,200,4500,125000)`,
      );

      const seedUsers = [
        { id: "owner-1", name: "Platform Owner", email: "owner@saasphere.io", role: "admin", tenantIds: ["t1"] },
        { id: "owner-legacy-admin", name: "Legacy Admin", email: "admin@acme.com", role: "admin", tenantIds: ["t1"] },
        { id: "owner-legacy-supervisor", name: "Legacy Supervisor", email: "super@acme.com", role: "supervisor", tenantIds: ["t1"] },
        { id: "owner-legacy-agent", name: "Legacy Agent", email: "agent@acme.com", role: "agent", tenantIds: ["t1"] },
      ];

      for (const user of seedUsers) {
        await pool.query(
          `INSERT INTO users (id,name,email,role,tenant_ids,password_hash,active)
           VALUES ($1,$2,$3,$4,$5,$6,TRUE)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             tenant_ids = EXCLUDED.tenant_ids,
             password_hash = EXCLUDED.password_hash,
             active = TRUE`,
          [user.id, user.name, user.email, user.role, user.tenantIds, passwordHash]
        );
        await pool.query(
          `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, 't1') ON CONFLICT (user_id, tenant_id) DO NOTHING`,
          [user.id]
        );
      }
      console.log("Seeded baseline tenant and users.");
    }

    console.log("Ensured all core tables exist in ai_chatbot.public");
  } finally {
    await pool.end();
  }
}

await ensureDatabase();
await ensureTables();
