import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import {
  apiKeys as mockApiKeys,
  auditLogs as mockAuditLogs,
  tenantUsers as mockUsers,
  tenants as mockTenants,
  type Role,
  type Tenant,
} from "@/lib/mock/data";

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  tenantIds: string[];
  passwordHash: string;
  active: boolean;
}

interface RefreshSession {
  id: string;
  userId: string;
  expiresAt: Date;
  revoked: boolean;
  replacedBySessionId: string | null;
  reuseDetected: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

const defaultPassword = "password123";
let initialized = false;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function ensureInitialized() {
  if (initialized) return;

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
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tenants_status_plan ON tenants(status, plan)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id)`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_revoked ON refresh_sessions(user_id, revoked)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp DESC)`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)`);

  const seedCheck = await pool.query("SELECT COUNT(*)::int AS count FROM tenants");
  if (seedCheck.rows[0]?.count === 0) {
    const hash = await bcrypt.hash(defaultPassword, 10);
    for (const t of mockTenants) {
      await pool.query(
        `INSERT INTO tenants (id,name,domain,status,plan,language,timezone,logo_url,primary_color,accent_color,header_text,welcome_message,custom_domain,created_at,active_users,total_users,storage_used_mb,api_calls_this_month)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
        [
          t.id, t.name, t.domain, t.status, t.plan, t.language, t.timezone, t.logoUrl ?? null, t.primaryColor, t.accentColor,
          t.headerText, t.welcomeMessage, t.customDomain ?? null, new Date(t.createdAt), t.activeUsers, t.totalUsers, t.storageUsedMb, t.apiCallsThisMonth,
        ]
      );
    }

    const users = [
      {
        id: "owner-1",
        name: "Platform Owner",
        email: "owner@saasphere.io",
        role: "admin",
        tenantIds: mockTenants.map((t) => t.id),
        active: true,
      },
      ...mockUsers.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email.toLowerCase(),
        role: u.role,
        tenantIds: [u.tenantId],
        active: u.status !== "inactive",
      })),
    ];
    for (const u of users) {
      await pool.query(
        `INSERT INTO users (id,name,email,role,tenant_ids,password_hash,active) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [u.id, u.name, u.email, u.role, u.tenantIds, hash, u.active]
      );
      for (const tenantId of u.tenantIds) {
        await pool.query(
          `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2) ON CONFLICT (user_id, tenant_id) DO NOTHING`,
          [u.id, tenantId]
        );
      }
    }

    for (const log of mockAuditLogs) {
      await pool.query(
        `INSERT INTO audit_logs (id,tenant_id,actor,actor_email,action,target,details,timestamp,ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [log.id, log.tenantId, log.actor, log.actorEmail, log.action, log.target, JSON.stringify(log.details), new Date(log.timestamp), log.ip]
      );
    }
    for (const key of mockApiKeys) {
      await pool.query(
        `INSERT INTO api_keys (id,tenant_id,name,key,scope,created_at,expires_at,last_used) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [key.id, key.tenantId, key.name, key.key, key.scope, new Date(key.createdAt), new Date(key.expiresAt), key.lastUsed ? new Date(key.lastUsed) : null]
      );
    }
  }

  // Backfill relational membership from legacy tenant_ids for existing DBs.
  await pool.query(`
    INSERT INTO user_tenants (user_id, tenant_id)
    SELECT u.id, unnest(u.tenant_ids) AS tenant_id
    FROM users u
    WHERE array_length(u.tenant_ids, 1) IS NOT NULL
    ON CONFLICT (user_id, tenant_id) DO NOTHING
  `);

  // Ensure backward-compatible dev credentials always exist.
  const hash = await bcrypt.hash(defaultPassword, 10);
  const devUsers = [
    {
      id: "owner-legacy-admin",
      name: "Legacy Admin",
      email: "admin@acme.com",
      role: "admin",
      tenantIds: mockTenants.map((t) => t.id),
    },
    {
      id: "owner-legacy-supervisor",
      name: "Legacy Supervisor",
      email: "super@acme.com",
      role: "supervisor",
      tenantIds: ["t1"],
    },
    {
      id: "owner-legacy-agent",
      name: "Legacy Agent",
      email: "agent@acme.com",
      role: "agent",
      tenantIds: ["t1"],
    },
  ];

  for (const user of devUsers) {
    const upsert = await pool.query(
      `INSERT INTO users (id,name,email,role,tenant_ids,password_hash,active)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         tenant_ids = EXCLUDED.tenant_ids,
         password_hash = EXCLUDED.password_hash,
         active = TRUE
       RETURNING id`,
      [user.id, user.name, user.email, user.role, user.tenantIds, hash]
    );
    const resolvedUserId = upsert.rows[0]?.id as string;
    for (const tenantId of user.tenantIds) {
      await pool.query(
        `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2) ON CONFLICT (user_id, tenant_id) DO NOTHING`,
        [resolvedUserId, tenantId]
      );
    }
  }

  initialized = true;
}

export async function listTenants() {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT id,name,domain,status,plan,language,timezone,logo_url AS "logoUrl",primary_color AS "primaryColor",accent_color AS "accentColor",header_text AS "headerText",welcome_message AS "welcomeMessage",custom_domain AS "customDomain",created_at AS "createdAt",active_users AS "activeUsers",total_users AS "totalUsers",storage_used_mb AS "storageUsedMb",api_calls_this_month AS "apiCallsThisMonth"
     FROM tenants ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function findTenantById(tenantId: string) {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT id,name,domain,status,plan,language,timezone,logo_url AS "logoUrl",primary_color AS "primaryColor",accent_color AS "accentColor",header_text AS "headerText",welcome_message AS "welcomeMessage",custom_domain AS "customDomain",created_at AS "createdAt",active_users AS "activeUsers",total_users AS "totalUsers",storage_used_mb AS "storageUsedMb",api_calls_this_month AS "apiCallsThisMonth"
     FROM tenants WHERE id = $1`,
    [tenantId]
  );
  return result.rows[0] ?? null;
}

export async function addTenant(input: {
  name: string;
  domain: string;
  language: string;
  timezone: string;
  plan: Tenant["plan"];
  adminEmail: string;
}) {
  await ensureInitialized();
  const tenantId = `t-${crypto.randomUUID().slice(0, 8)}`;
  const tenant: Tenant = {
    id: tenantId,
    name: input.name,
    domain: input.domain,
    status: "active",
    plan: input.plan,
    language: input.language,
    timezone: input.timezone,
    primaryColor: "#2563eb",
    accentColor: "#06b6d4",
    headerText: `${input.name} Portal`,
    welcomeMessage: `Welcome to ${input.name}.`,
    createdAt: new Date().toISOString(),
    activeUsers: 1,
    totalUsers: 1,
    storageUsedMb: 0,
    apiCallsThisMonth: 0,
  };
  await pool.query(
    `INSERT INTO tenants (id,name,domain,status,plan,language,timezone,logo_url,primary_color,accent_color,header_text,welcome_message,custom_domain,created_at,active_users,total_users,storage_used_mb,api_calls_this_month)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      tenant.id, tenant.name, tenant.domain, tenant.status, tenant.plan, tenant.language, tenant.timezone, tenant.logoUrl ?? null, tenant.primaryColor, tenant.accentColor,
      tenant.headerText, tenant.welcomeMessage, tenant.customDomain ?? null, new Date(tenant.createdAt), tenant.activeUsers, tenant.totalUsers, tenant.storageUsedMb, tenant.apiCallsThisMonth,
    ]
  );

  const existingAdminResult = await pool.query(`SELECT * FROM users WHERE email = $1`, [input.adminEmail.toLowerCase()]);
  const existingAdmin = existingAdminResult.rows[0];

  if (existingAdmin) {
    if (!existingAdmin.tenant_ids.includes(tenant.id)) {
      await pool.query(`UPDATE users SET tenant_ids = $1 WHERE id = $2`, [[...existingAdmin.tenant_ids, tenant.id], existingAdmin.id]);
    }
    await pool.query(
      `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2) ON CONFLICT (user_id, tenant_id) DO NOTHING`,
      [existingAdmin.id, tenant.id]
    );
  } else {
    const hash = await bcrypt.hash(defaultPassword, 10);
    const newUserId = `u-${crypto.randomUUID().slice(0, 8)}`;
    await pool.query(
      `INSERT INTO users (id,name,email,role,tenant_ids,password_hash,active) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        newUserId,
        input.adminEmail.split("@")[0] ?? "Tenant Admin",
        input.adminEmail.toLowerCase(),
        "admin",
        [tenantId],
        hash,
        true,
      ]
    );
    await pool.query(
      `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2) ON CONFLICT (user_id, tenant_id) DO NOTHING`,
      [newUserId, tenantId]
    );
  }

  return tenant;
}

export async function updateTenant(tenantId: string, updates: Partial<Tenant>) {
  await ensureInitialized();
  const tenant = await findTenantById(tenantId);
  if (!tenant) return null;
  const merged = { ...tenant, ...updates };
  await pool.query(
    `UPDATE tenants SET name=$2,domain=$3,status=$4,plan=$5,language=$6,timezone=$7,custom_domain=$8 WHERE id=$1`,
    [tenantId, merged.name, merged.domain, merged.status, merged.plan, merged.language, merged.timezone, merged.customDomain ?? null]
  );
  return findTenantById(tenantId);
}

export async function deleteTenant(tenantId: string) {
  await ensureInitialized();
  const tenant = await findTenantById(tenantId);
  if (!tenant) return null;
  await pool.query(`UPDATE tenants SET status = 'suspended' WHERE id = $1`, [tenantId]);
  return findTenantById(tenantId);
}

export async function findUserByEmail(email: string) {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       COALESCE(array_agg(ut.tenant_id) FILTER (WHERE ut.tenant_id IS NOT NULL), '{}') AS "tenantIds",
       u.password_hash AS "passwordHash",
       u.active
     FROM users u
     LEFT JOIN user_tenants ut ON ut.user_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email.toLowerCase()]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(userId: string) {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       COALESCE(array_agg(ut.tenant_id) FILTER (WHERE ut.tenant_id IS NOT NULL), '{}') AS "tenantIds",
       u.password_hash AS "passwordHash",
       u.active
     FROM users u
     LEFT JOIN user_tenants ut ON ut.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function createRefreshSession(userId: string, expiresAt: number) {
  await ensureInitialized();
  const session: RefreshSession = {
    id: `rs-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    expiresAt: new Date(expiresAt),
    revoked: false,
    replacedBySessionId: null,
    reuseDetected: false,
    createdAt: new Date(),
    lastUsedAt: null,
  };
  const result = await pool.query(
    `INSERT INTO refresh_sessions (id,user_id,expires_at,revoked,replaced_by_session_id,reuse_detected,created_at,last_used_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id,user_id AS "userId",expires_at AS "expiresAt",revoked,replaced_by_session_id AS "replacedBySessionId",reuse_detected AS "reuseDetected",created_at AS "createdAt",last_used_at AS "lastUsedAt"`,
    [
      session.id,
      session.userId,
      session.expiresAt,
      session.revoked,
      session.replacedBySessionId,
      session.reuseDetected,
      session.createdAt,
      session.lastUsedAt,
    ]
  );
  return result.rows[0];
}

export async function getRefreshSessionById(sessionId: string) {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT id,user_id AS "userId",expires_at AS "expiresAt",revoked,replaced_by_session_id AS "replacedBySessionId",reuse_detected AS "reuseDetected",created_at AS "createdAt",last_used_at AS "lastUsedAt"
     FROM refresh_sessions WHERE id = $1`,
    [sessionId]
  );
  return result.rows[0] ?? null;
}

export async function revokeRefreshSession(sessionId: string, replacedBySessionId?: string | null) {
  await ensureInitialized();
  return pool.query(
    `UPDATE refresh_sessions
     SET revoked = TRUE,
         replaced_by_session_id = COALESCE($2, replaced_by_session_id),
         last_used_at = NOW()
     WHERE id = $1`,
    [sessionId, replacedBySessionId ?? null]
  );
}

export async function revokeAllUserRefreshSessions(userId: string) {
  await ensureInitialized();
  return pool.query(`UPDATE refresh_sessions SET revoked = TRUE, last_used_at = NOW() WHERE user_id = $1`, [
    userId,
  ]);
}

export async function markRefreshReuseDetected(sessionId: string) {
  await ensureInitialized();
  return pool.query(
    `UPDATE refresh_sessions SET reuse_detected = TRUE, last_used_at = NOW() WHERE id = $1`,
    [sessionId]
  );
}

export async function rotateRefreshSession(sessionId: string, userId: string, expiresAt: number) {
  await ensureInitialized();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const newSessionId = `rs-${crypto.randomUUID().slice(0, 8)}`;
    const newExpiry = new Date(expiresAt);
    await client.query(
      `INSERT INTO refresh_sessions (id,user_id,expires_at,revoked,replaced_by_session_id,reuse_detected,created_at,last_used_at)
       VALUES ($1,$2,$3,FALSE,NULL,FALSE,NOW(),NOW())`,
      [newSessionId, userId, newExpiry]
    );
    await client.query(
      `UPDATE refresh_sessions
       SET revoked = TRUE,
           replaced_by_session_id = $2,
           last_used_at = NOW()
       WHERE id = $1`,
      [sessionId, newSessionId]
    );
    await client.query("COMMIT");
    return {
      id: newSessionId,
      userId,
      expiresAt: newExpiry,
      revoked: false,
      replacedBySessionId: null,
      reuseDetected: false,
      createdAt: new Date(),
      lastUsedAt: new Date(),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function addAuditLog(input: {
  tenantId: string;
  actor: string;
  actorEmail: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  ip?: string;
}) {
  await ensureInitialized();
  return pool.query(
    `INSERT INTO audit_logs (id,tenant_id,actor,actor_email,action,target,details,timestamp,ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [`al-${crypto.randomUUID().slice(0, 8)}`, input.tenantId, input.actor, input.actorEmail, input.action, input.target, JSON.stringify(input.details), new Date(), input.ip ?? "0.0.0.0"]
  );
}

export async function listAuditLogs(tenantId?: string) {
  await ensureInitialized();
  const result = tenantId
    ? await pool.query(
        `SELECT id,tenant_id AS "tenantId",actor,actor_email AS "actorEmail",action,target,details,timestamp,ip
         FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC`,
        [tenantId]
      )
    : await pool.query(
        `SELECT id,tenant_id AS "tenantId",actor,actor_email AS "actorEmail",action,target,details,timestamp,ip
         FROM audit_logs ORDER BY timestamp DESC`
      );
  return result.rows;
}

export async function findApiKey(rawKey: string) {
  await ensureInitialized();
  const result = await pool.query(`SELECT * FROM api_keys WHERE key = $1`, [rawKey]);
  return result.rows[0] ?? null;
}

export async function validatePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
