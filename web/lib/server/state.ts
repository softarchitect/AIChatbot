import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import {
  apiKeys as mockApiKeys,
  auditLogs as mockAuditLogs,
  featureFlags as mockFeatureFlags,
  tenantUsers as mockUsers,
  tenants as mockTenants,
  type FeatureFlag,
  type Role,
  type Tenant,
} from "@/lib/mock/data";
import type { PoolClient } from "pg";
import { rolePermissionsMap } from "@/lib/server/rbac";

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

export interface ConversationRecord {
  id: string;
  tenantId: string;
  teamId?: string | null;
  subject: string;
  channel: "whatsapp" | "webchat" | "sms" | "email";
  status: "open" | "closed" | "pending";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
}

export interface CampaignRecord {
  id: string;
  tenantId: string;
  teamId?: string | null;
  name: string;
  channel: "whatsapp" | "webchat" | "sms" | "email";
  status: "draft" | "active" | "paused" | "completed";
  budget: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingRecord {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  amount: number;
  currency: string;
  status: "due" | "paid" | "overdue";
  dueAt: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface TeamRecord {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export interface UserMfaRecord {
  userId: string;
  secret: string;
  enabled: boolean;
  createdAt: string;
}

export interface TenantIntegrationConfig {
  tenantId: string;
  provider: "sendgrid" | "dreams_sa";
  enabled: boolean;
  apiKey?: string | null;
  fromEmail?: string | null;
  senderId?: string | null;
  updatedAt: string;
}

export interface TrialConfig {
  maxAgents: number;
  enabledFeatureKeys: string[];
  trialDays: number;
}

const defaultPassword = "password123";
let initialized = false;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

type DbContext = {
  role: Role;
  tenantId?: string;
};

async function withDbContext<T>(context: DbContext, run: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT set_config('app.role', $1, true)`, [context.role]);
    if (context.tenantId) {
      await client.query(`SELECT set_config('app.current_tenant', $1, true)`, [context.tenantId]);
    } else {
      await client.query(`SELECT set_config('app.current_tenant', '', true)`);
    }
    const result = await run(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

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
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (tenant_id, name)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_teams (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, team_id)
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_feature_flags (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      flag_group TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      requires_restart BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE (tenant_id, key)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
      subject TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      last_message_at TIMESTAMPTZ NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS team_id TEXT`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'conversations_team_id_fkey'
      ) THEN
        ALTER TABLE conversations
        ADD CONSTRAINT conversations_team_id_fkey
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      channel TEXT NOT NULL,
      status TEXT NOT NULL,
      budget NUMERIC(12,2) NOT NULL DEFAULT 0,
      start_date TIMESTAMPTZ NOT NULL,
      end_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    );
  `);
  await pool.query(`ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS team_id TEXT`);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'campaigns_team_id_fkey'
      ) THEN
        ALTER TABLE campaigns
        ADD CONSTRAINT campaigns_team_id_fkey
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;
      END IF;
    END $$;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_records (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      period_start TIMESTAMPTZ NOT NULL,
      period_end TIMESTAMPTZ NOT NULL,
      amount NUMERIC(12,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      status TEXT NOT NULL,
      due_at TIMESTAMPTZ NOT NULL,
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_role_permissions (
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      permissions TEXT[] NOT NULL DEFAULT '{}',
      PRIMARY KEY (tenant_id, role)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_mfa (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      secret TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_events (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      action TEXT NOT NULL,
      success BOOLEAN NOT NULL,
      ip TEXT NOT NULL,
      details JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenant_integrations (
      tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT FALSE,
      api_key TEXT,
      from_email TEXT,
      sender_id TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (tenant_id, provider)
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS platform_trial_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      max_agents INTEGER NOT NULL DEFAULT 3,
      enabled_feature_keys TEXT[] NOT NULL DEFAULT ARRAY['webchat_widget','email_channel'],
      trial_days INTEGER NOT NULL DEFAULT 14,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
    INSERT INTO platform_trial_config (id, max_agents, enabled_feature_keys, trial_days, updated_at)
    VALUES (1, 3, ARRAY['webchat_widget','email_channel'], 14, NOW())
    ON CONFLICT (id) DO NOTHING
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tenants_status_plan ON tenants(status, plan)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_teams_team_id ON user_teams(team_id)`);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_revoked ON refresh_sessions(user_id, revoked)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_timestamp ON audit_logs(tenant_id, timestamp DESC)`
  );
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_tenant_id ON tenant_feature_flags(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_team_id ON conversations(team_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_campaigns_team_id ON campaigns(team_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_billing_records_tenant_id ON billing_records(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tenant_role_permissions_tenant_id ON tenant_role_permissions(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant_id ON tenant_integrations(tenant_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_auth_events_email_created_at ON auth_events(email, created_at DESC)`);

  await pool.query(`ALTER TABLE tenants ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenant_feature_flags ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE conversations ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE billing_records ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE teams ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenant_role_permissions ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenants FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE api_keys FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenant_feature_flags FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE conversations FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE campaigns FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE billing_records FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE teams FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenant_role_permissions FORCE ROW LEVEL SECURITY`);
  await pool.query(`ALTER TABLE tenant_integrations FORCE ROW LEVEL SECURITY`);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenant_select_policy') THEN
        CREATE POLICY tenant_select_policy ON tenants
          FOR SELECT USING (current_setting('app.role', true) = 'admin' OR id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenant_modify_policy') THEN
        CREATE POLICY tenant_modify_policy ON tenants
          FOR UPDATE USING (current_setting('app.role', true) = 'admin' OR id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenant_delete_policy') THEN
        CREATE POLICY tenant_delete_policy ON tenants
          FOR DELETE USING (current_setting('app.role', true) = 'admin' OR id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants' AND policyname = 'tenant_insert_admin_policy') THEN
        CREATE POLICY tenant_insert_admin_policy ON tenants
          FOR INSERT WITH CHECK (current_setting('app.role', true) = 'admin');
      END IF;
    END $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_policy') THEN
        CREATE POLICY audit_logs_policy ON audit_logs
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'api_keys' AND policyname = 'api_keys_policy') THEN
        CREATE POLICY api_keys_policy ON api_keys
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_feature_flags' AND policyname = 'tenant_feature_flags_policy') THEN
        CREATE POLICY tenant_feature_flags_policy ON tenant_feature_flags
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'conversations_policy') THEN
        CREATE POLICY conversations_policy ON conversations
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaigns' AND policyname = 'campaigns_policy') THEN
        CREATE POLICY campaigns_policy ON campaigns
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'billing_records' AND policyname = 'billing_records_policy') THEN
        CREATE POLICY billing_records_policy ON billing_records
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'teams' AND policyname = 'teams_policy') THEN
        CREATE POLICY teams_policy ON teams
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_role_permissions' AND policyname = 'tenant_role_permissions_policy') THEN
        CREATE POLICY tenant_role_permissions_policy ON tenant_role_permissions
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenant_integrations' AND policyname = 'tenant_integrations_policy') THEN
        CREATE POLICY tenant_integrations_policy ON tenant_integrations
          FOR ALL
          USING (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true))
          WITH CHECK (current_setting('app.role', true) = 'admin' OR tenant_id = current_setting('app.current_tenant', true));
      END IF;
    END $$;
  `);

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
    for (const tenant of mockTenants) {
      for (const flag of mockFeatureFlags) {
        await pool.query(
          `INSERT INTO tenant_feature_flags (id,tenant_id,key,name,description,flag_group,enabled,requires_restart)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (tenant_id, key) DO NOTHING`,
          [
            `${tenant.id}-${flag.id}`,
            tenant.id,
            flag.key,
            flag.name,
            flag.description,
            flag.group,
            flag.enabled,
            flag.requiresRestart,
          ]
        );
      }
    }
    for (const tenant of mockTenants) {
      const teamId = `team-${tenant.id}`;
      await pool.query(
        `INSERT INTO teams (id,tenant_id,name,created_at)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO NOTHING`,
        [teamId, tenant.id, "Support", new Date()]
      );
      await pool.query(
        `INSERT INTO user_teams (user_id, team_id)
         SELECT ut.user_id, $2
         FROM user_tenants ut
         WHERE ut.tenant_id = $1
         ON CONFLICT (user_id, team_id) DO NOTHING`,
        [tenant.id, teamId]
      );

      await pool.query(
        `INSERT INTO conversations (id,tenant_id,team_id,subject,channel,status,created_at,updated_at,last_message_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO NOTHING`,
        [
          `cv-${tenant.id}`,
          tenant.id,
          teamId,
          `${tenant.name} - Welcome conversation`,
          "webchat",
          "open",
          new Date(),
          new Date(),
          new Date(),
        ]
      );
      await pool.query(
        `INSERT INTO campaigns (id,tenant_id,team_id,name,channel,status,budget,start_date,end_date,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO NOTHING`,
        [
          `cp-${tenant.id}`,
          tenant.id,
          teamId,
          `${tenant.name} Launch Campaign`,
          "email",
          "draft",
          1000,
          new Date(),
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          new Date(),
          new Date(),
        ]
      );
      await pool.query(
        `INSERT INTO billing_records (id,tenant_id,period_start,period_end,amount,currency,status,due_at,paid_at,created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          `br-${tenant.id}`,
          tenant.id,
          new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
          new Date(),
          199,
          "USD",
          "due",
          new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          null,
          new Date(),
        ]
      );
      for (const role of Object.keys(rolePermissionsMap) as Role[]) {
        await pool.query(
          `INSERT INTO tenant_role_permissions (tenant_id, role, permissions)
           VALUES ($1, $2, $3)
           ON CONFLICT (tenant_id, role) DO NOTHING`,
          [tenant.id, role, rolePermissionsMap[role]]
        );
      }
    }
  }

  // Backfill relational membership from legacy tenant_ids for existing DBs.
  await pool.query(`
    INSERT INTO user_tenants (user_id, tenant_id)
    SELECT u.id, t.tenant_id
    FROM users u
    CROSS JOIN LATERAL unnest(u.tenant_ids) AS t(tenant_id)
    INNER JOIN tenants tt ON tt.id = t.tenant_id
    WHERE array_length(u.tenant_ids, 1) IS NOT NULL
    ON CONFLICT (user_id, tenant_id) DO NOTHING
  `);

  // Ensure backward-compatible dev credentials always exist.
  const hash = await bcrypt.hash(defaultPassword, 10);
  const tenantRows = await pool.query<{ id: string }>(`SELECT id FROM tenants ORDER BY created_at ASC`);
  const existingTenantIds = tenantRows.rows.map((r) => r.id);
  for (const tenantId of existingTenantIds) {
    const defaultTeamId = `team-${tenantId}`;
    await pool.query(
      `INSERT INTO teams (id,tenant_id,name,created_at)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (id) DO NOTHING`,
      [defaultTeamId, tenantId, "Support", new Date()]
    );
    await pool.query(
      `INSERT INTO user_teams (user_id, team_id)
       SELECT ut.user_id, $2
       FROM user_tenants ut
       INNER JOIN users u ON u.id = ut.user_id
       WHERE ut.tenant_id = $1 AND u.role = 'agent'
       ON CONFLICT (user_id, team_id) DO NOTHING`,
      [tenantId, defaultTeamId]
    );
  }
  for (const tenantId of existingTenantIds) {
    for (const role of Object.keys(rolePermissionsMap) as Role[]) {
      await pool.query(
        `INSERT INTO tenant_role_permissions (tenant_id, role, permissions)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, role) DO NOTHING`,
        [tenantId, role, rolePermissionsMap[role]]
      );
    }
  }
  const primaryTenantIds = existingTenantIds.length > 0 ? existingTenantIds : ["t1"];
  const devUsers = [
    {
      id: "owner-legacy-admin",
      name: "Legacy Admin",
      email: "admin@acme.com",
      role: "admin",
      tenantIds: primaryTenantIds,
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
      const exists = existingTenantIds.includes(tenantId);
      if (!exists) continue;
      await pool.query(
        `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2) ON CONFLICT (user_id, tenant_id) DO NOTHING`,
        [resolvedUserId, tenantId]
      );
    }
  }

  initialized = true;
}

export async function listTenants(context: DbContext) {
  await ensureInitialized();
  return withDbContext(context, async (client) => {
    const result = await client.query(
      `SELECT id,name,domain,status,plan,language,timezone,logo_url AS "logoUrl",primary_color AS "primaryColor",accent_color AS "accentColor",header_text AS "headerText",welcome_message AS "welcomeMessage",custom_domain AS "customDomain",created_at AS "createdAt",active_users AS "activeUsers",total_users AS "totalUsers",storage_used_mb AS "storageUsedMb",api_calls_this_month AS "apiCallsThisMonth"
       FROM tenants ORDER BY created_at DESC`
    );
    return result.rows;
  });
}

export async function findTenantById(tenantId: string, context: DbContext) {
  await ensureInitialized();
  return withDbContext(context, async (client) => {
    const result = await client.query(
      `SELECT id,name,domain,status,plan,language,timezone,logo_url AS "logoUrl",primary_color AS "primaryColor",accent_color AS "accentColor",header_text AS "headerText",welcome_message AS "welcomeMessage",custom_domain AS "customDomain",created_at AS "createdAt",active_users AS "activeUsers",total_users AS "totalUsers",storage_used_mb AS "storageUsedMb",api_calls_this_month AS "apiCallsThisMonth"
       FROM tenants WHERE id = $1`,
      [tenantId]
    );
    return result.rows[0] ?? null;
  });
}

export async function addTenant(input: {
  name: string;
  domain: string;
  language: string;
  timezone: string;
  plan: Tenant["plan"];
  adminEmail: string;
}, context: DbContext) {
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
  await withDbContext(context, async (client) => {
    await client.query(
      `INSERT INTO tenants (id,name,domain,status,plan,language,timezone,logo_url,primary_color,accent_color,header_text,welcome_message,custom_domain,created_at,active_users,total_users,storage_used_mb,api_calls_this_month)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        tenant.id, tenant.name, tenant.domain, tenant.status, tenant.plan, tenant.language, tenant.timezone, tenant.logoUrl ?? null, tenant.primaryColor, tenant.accentColor,
        tenant.headerText, tenant.welcomeMessage, tenant.customDomain ?? null, new Date(tenant.createdAt), tenant.activeUsers, tenant.totalUsers, tenant.storageUsedMb, tenant.apiCallsThisMonth,
      ]
    );
  });

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

  for (const flag of mockFeatureFlags) {
    await pool.query(
      `INSERT INTO tenant_feature_flags (id,tenant_id,key,name,description,flag_group,enabled,requires_restart)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (tenant_id, key) DO NOTHING`,
      [
        `${tenant.id}-${flag.id}`,
        tenant.id,
        flag.key,
        flag.name,
        flag.description,
        flag.group,
        flag.enabled,
        flag.requiresRestart,
      ]
    );
  }

  for (const role of Object.keys(rolePermissionsMap) as Role[]) {
    await pool.query(
      `INSERT INTO tenant_role_permissions (tenant_id, role, permissions)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, role) DO NOTHING`,
      [tenant.id, role, rolePermissionsMap[role]]
    );
  }
  await pool.query(
    `INSERT INTO teams (id,tenant_id,name,created_at)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (id) DO NOTHING`,
    [`team-${tenant.id}`, tenant.id, "Support", new Date()]
  );

  return tenant;
}

export async function updateTenant(tenantId: string, updates: Partial<Tenant>, context: DbContext) {
  await ensureInitialized();
  const tenant = await findTenantById(tenantId, context);
  if (!tenant) return null;
  const merged = { ...tenant, ...updates };
  await withDbContext(context, async (client) => {
    await client.query(
      `UPDATE tenants
       SET name=$2,domain=$3,status=$4,plan=$5,language=$6,timezone=$7,custom_domain=$8,logo_url=$9,primary_color=$10,accent_color=$11,header_text=$12,welcome_message=$13
       WHERE id=$1`,
      [
        tenantId,
        merged.name,
        merged.domain,
        merged.status,
        merged.plan,
        merged.language,
        merged.timezone,
        merged.customDomain ?? null,
        merged.logoUrl ?? null,
        merged.primaryColor,
        merged.accentColor,
        merged.headerText,
        merged.welcomeMessage,
      ]
    );
  });
  return findTenantById(tenantId, context);
}

export async function deleteTenant(tenantId: string, context: DbContext) {
  await ensureInitialized();
  const tenant = await findTenantById(tenantId, context);
  if (!tenant) return null;
  await withDbContext(context, async (client) => {
    await client.query(`UPDATE tenants SET status = 'suspended' WHERE id = $1`, [tenantId]);
  });
  return findTenantById(tenantId, context);
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
}, context: DbContext) {
  await ensureInitialized();
  return withDbContext({ role: context.role, tenantId: input.tenantId }, async (client) => {
    return client.query(
      `INSERT INTO audit_logs (id,tenant_id,actor,actor_email,action,target,details,timestamp,ip) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [`al-${crypto.randomUUID().slice(0, 8)}`, input.tenantId, input.actor, input.actorEmail, input.action, input.target, JSON.stringify(input.details), new Date(), input.ip ?? "0.0.0.0"]
    );
  });
}

export async function listAuditLogs(tenantId: string, context: DbContext) {
  await ensureInitialized();
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query(
      `SELECT id,tenant_id AS "tenantId",actor,actor_email AS "actorEmail",action,target,details,timestamp,ip
       FROM audit_logs WHERE tenant_id = $1 ORDER BY timestamp DESC`,
      [tenantId]
    );
    return result.rows;
  });
}

export async function findApiKey(rawKey: string) {
  await ensureInitialized();
  const result = await pool.query(`SELECT * FROM api_keys WHERE key = $1`, [rawKey]);
  return result.rows[0] ?? null;
}

export async function listTenantFeatureFlags(tenantId: string, context: DbContext): Promise<FeatureFlag[]> {
  await ensureInitialized();
  for (const flag of mockFeatureFlags) {
    await withDbContext({ role: context.role, tenantId }, async (client) => {
      await client.query(
        `INSERT INTO tenant_feature_flags (id,tenant_id,key,name,description,flag_group,enabled,requires_restart)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (tenant_id, key) DO NOTHING`,
        [
          `${tenantId}-${flag.id}`,
          tenantId,
          flag.key,
          flag.name,
          flag.description,
          flag.group,
          flag.enabled,
          flag.requiresRestart,
        ]
      );
    });
  }

  const seeded = await withDbContext({ role: context.role, tenantId }, async (client) => {
    return client.query(
      `SELECT id,key,name,description,flag_group AS "group",enabled,requires_restart AS "requiresRestart"
       FROM tenant_feature_flags
       WHERE tenant_id = $1
       ORDER BY key ASC`,
      [tenantId]
    );
  });
  return seeded.rows;
}

export async function updateTenantFeatureFlag(tenantId: string, key: string, enabled: boolean, context: DbContext) {
  await ensureInitialized();
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    await client.query(
      `UPDATE tenant_feature_flags
       SET enabled = $3
       WHERE tenant_id = $1 AND key = $2`,
      [tenantId, key, enabled]
    );
  });
  return listTenantFeatureFlags(tenantId, context);
}

export async function listTenantConversations(
  tenantId: string,
  context: DbContext,
  userId?: string
): Promise<ConversationRecord[]> {
  await ensureInitialized();
  const teamIds = context.role === "agent" && userId ? await listUserTeamIdsForTenant(userId, tenantId, context) : [];
  if (context.role === "agent" && (!teamIds || teamIds.length === 0)) {
    return [];
  }
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query(
      `SELECT
         id,
         tenant_id AS "tenantId",
         team_id AS "teamId",
         subject,
         channel,
         status,
         created_at AS "createdAt",
         updated_at AS "updatedAt",
         last_message_at AS "lastMessageAt"
       FROM conversations
       WHERE tenant_id = $1
       ${context.role === "agent" ? "AND team_id = ANY($2::text[])" : ""}
       ORDER BY updated_at DESC`,
      context.role === "agent" ? [tenantId, teamIds] : [tenantId]
    );
    return result.rows;
  });
}

export async function addTenantConversation(
  tenantId: string,
  input: Pick<ConversationRecord, "subject" | "channel" | "status" | "teamId">,
  context: DbContext,
  userId?: string
) {
  await ensureInitialized();
  let resolvedTeamId = input.teamId ?? null;
  if (context.role === "agent" && userId) {
    const teamIds = await listUserTeamIdsForTenant(userId, tenantId, context);
    if (teamIds.length === 0) {
      throw new Error("No team assigned for this agent.");
    }
    if (resolvedTeamId && !teamIds.includes(resolvedTeamId)) {
      throw new Error("Agent cannot create conversation for an unassigned team.");
    }
    if (!resolvedTeamId) {
      resolvedTeamId = teamIds[0];
    }
  }
  const record = {
    id: `cv-${crypto.randomUUID().slice(0, 8)}`,
    tenantId,
    teamId: resolvedTeamId,
    subject: input.subject,
    channel: input.channel,
    status: input.status,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastMessageAt: new Date(),
  };
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    await client.query(
      `INSERT INTO conversations (id,tenant_id,team_id,subject,channel,status,created_at,updated_at,last_message_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        record.id,
        record.tenantId,
        record.teamId,
        record.subject,
        record.channel,
        record.status,
        record.createdAt,
        record.updatedAt,
        record.lastMessageAt,
      ]
    );
  });
  return record;
}

export async function listTenantCampaigns(
  tenantId: string,
  context: DbContext,
  userId?: string
): Promise<CampaignRecord[]> {
  await ensureInitialized();
  const teamIds = context.role === "agent" && userId ? await listUserTeamIdsForTenant(userId, tenantId, context) : [];
  if (context.role === "agent" && (!teamIds || teamIds.length === 0)) {
    return [];
  }
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query(
      `SELECT
         id,
         tenant_id AS "tenantId",
         team_id AS "teamId",
         name,
         channel,
         status,
         budget::float8 AS budget,
         start_date AS "startDate",
         end_date AS "endDate",
         created_at AS "createdAt",
         updated_at AS "updatedAt"
       FROM campaigns
       WHERE tenant_id = $1
       ${context.role === "agent" ? "AND team_id = ANY($2::text[])" : ""}
       ORDER BY created_at DESC`,
      context.role === "agent" ? [tenantId, teamIds] : [tenantId]
    );
    return result.rows;
  });
}

export async function addTenantCampaign(
  tenantId: string,
  input: Pick<CampaignRecord, "name" | "channel" | "status" | "budget" | "startDate" | "endDate" | "teamId">,
  context: DbContext,
  userId?: string
) {
  await ensureInitialized();
  let resolvedTeamId = input.teamId ?? null;
  if (context.role === "agent" && userId) {
    const teamIds = await listUserTeamIdsForTenant(userId, tenantId, context);
    if (teamIds.length === 0) {
      throw new Error("No team assigned for this agent.");
    }
    if (resolvedTeamId && !teamIds.includes(resolvedTeamId)) {
      throw new Error("Agent cannot create campaign for an unassigned team.");
    }
    if (!resolvedTeamId) {
      resolvedTeamId = teamIds[0];
    }
  }
  const record = {
    id: `cp-${crypto.randomUUID().slice(0, 8)}`,
    tenantId,
    teamId: resolvedTeamId,
    name: input.name,
    channel: input.channel,
    status: input.status,
    budget: input.budget,
    startDate: new Date(input.startDate),
    endDate: new Date(input.endDate),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    await client.query(
      `INSERT INTO campaigns (id,tenant_id,team_id,name,channel,status,budget,start_date,end_date,created_at,updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        record.id,
        record.tenantId,
        record.teamId,
        record.name,
        record.channel,
        record.status,
        record.budget,
        record.startDate,
        record.endDate,
        record.createdAt,
        record.updatedAt,
      ]
    );
  });
  return record;
}

export async function listTenantBillingRecords(tenantId: string, context: DbContext): Promise<BillingRecord[]> {
  await ensureInitialized();
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query(
      `SELECT
         id,
         tenant_id AS "tenantId",
         period_start AS "periodStart",
         period_end AS "periodEnd",
         amount::float8 AS amount,
         currency,
         status,
         due_at AS "dueAt",
         paid_at AS "paidAt",
         created_at AS "createdAt"
       FROM billing_records
       WHERE tenant_id = $1
       ORDER BY created_at DESC`,
      [tenantId]
    );
    return result.rows;
  });
}

export async function addTenantBillingRecord(
  tenantId: string,
  input: Pick<BillingRecord, "periodStart" | "periodEnd" | "amount" | "currency" | "status" | "dueAt">,
  context: DbContext
) {
  await ensureInitialized();
  const record = {
    id: `br-${crypto.randomUUID().slice(0, 8)}`,
    tenantId,
    periodStart: new Date(input.periodStart),
    periodEnd: new Date(input.periodEnd),
    amount: input.amount,
    currency: input.currency,
    status: input.status,
    dueAt: new Date(input.dueAt),
    paidAt: null as Date | null,
    createdAt: new Date(),
  };
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    await client.query(
      `INSERT INTO billing_records (id,tenant_id,period_start,period_end,amount,currency,status,due_at,paid_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        record.id,
        record.tenantId,
        record.periodStart,
        record.periodEnd,
        record.amount,
        record.currency,
        record.status,
        record.dueAt,
        record.paidAt,
        record.createdAt,
      ]
    );
  });
  return record;
}

export async function listTenantAgents(tenantId: string) {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT u.id, u.name, u.email, u.role, u.active
     FROM users u
     INNER JOIN user_tenants ut ON ut.user_id = u.id
     WHERE ut.tenant_id = $1 AND u.role = 'agent'
     ORDER BY u.name ASC`,
    [tenantId]
  );
  return result.rows;
}

export async function listTenantUsers(tenantId: string, context: DbContext) {
  await ensureInitialized();
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.role,
         u.active
       FROM users u
       INNER JOIN user_tenants ut ON ut.user_id = u.id
       WHERE ut.tenant_id = $1
       ORDER BY u.name ASC`,
      [tenantId]
    );
    return result.rows.map((row) => ({
      ...row,
      status: row.active ? "active" : "inactive",
    }));
  });
}

export async function createTenantUser(
  tenantId: string,
  input: { name: string; email: string; role: Role; password?: string },
  context: DbContext
) {
  await ensureInitialized();
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new Error("A user with this email already exists.");
  }
  const passwordHash = await bcrypt.hash(input.password ?? defaultPassword, 10);
  const userId = `u-${crypto.randomUUID().slice(0, 8)}`;
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    await client.query(
      `INSERT INTO users (id,name,email,role,tenant_ids,password_hash,active)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE)`,
      [userId, input.name, input.email.toLowerCase(), input.role, [tenantId], passwordHash]
    );
    await client.query(
      `INSERT INTO user_tenants (user_id, tenant_id) VALUES ($1, $2)`,
      [userId, tenantId]
    );
    if (input.role === "agent") {
      await client.query(
        `INSERT INTO user_teams (user_id, team_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, team_id) DO NOTHING`,
        [userId, `team-${tenantId}`]
      );
    }
  });
  return findUserById(userId);
}

export async function countTenantAgents(tenantId: string, context: DbContext): Promise<number> {
  await ensureInitialized();
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM users u
       INNER JOIN user_tenants ut ON ut.user_id = u.id
       WHERE ut.tenant_id = $1 AND u.role = 'agent' AND u.active = TRUE`,
      [tenantId]
    );
    return Number(result.rows[0]?.count ?? "0");
  });
}

export async function getPlatformTrialConfig(): Promise<TrialConfig> {
  await ensureInitialized();
  const result = await pool.query<{
    max_agents: number;
    enabled_feature_keys: string[];
    trial_days: number;
  }>(
    `SELECT max_agents, enabled_feature_keys, trial_days
     FROM platform_trial_config
     WHERE id = 1`
  );
  const row = result.rows[0];
  if (!row) {
    return { maxAgents: 3, enabledFeatureKeys: ["webchat_widget", "email_channel"], trialDays: 14 };
  }
  return {
    maxAgents: row.max_agents,
    enabledFeatureKeys: row.enabled_feature_keys ?? [],
    trialDays: row.trial_days,
  };
}

export async function updatePlatformTrialConfig(values: Partial<TrialConfig>) {
  await ensureInitialized();
  const current = await getPlatformTrialConfig();
  const next: TrialConfig = {
    maxAgents: values.maxAgents ?? current.maxAgents,
    enabledFeatureKeys: values.enabledFeatureKeys ?? current.enabledFeatureKeys,
    trialDays: values.trialDays ?? current.trialDays,
  };
  await pool.query(
    `UPDATE platform_trial_config
     SET max_agents = $1, enabled_feature_keys = $2, trial_days = $3, updated_at = NOW()
     WHERE id = 1`,
    [next.maxAgents, next.enabledFeatureKeys, next.trialDays]
  );
  return next;
}

export async function selfRegisterTenant(input: {
  companyName: string;
  domain: string;
  adminName: string;
  adminEmail: string;
  password: string;
  language?: string;
  timezone?: string;
}) {
  await ensureInitialized();
  const trial = await getPlatformTrialConfig();
  const tenant = await addTenant(
    {
      name: input.companyName,
      domain: input.domain,
      adminEmail: input.adminEmail,
      language: input.language ?? "en",
      timezone: input.timezone ?? "UTC",
      plan: "free",
    },
    { role: "admin" }
  );
  const passwordHash = await bcrypt.hash(input.password, 10);
  await pool.query(
    `UPDATE users
     SET name = $2, password_hash = $3, active = TRUE
     WHERE email = $1`,
    [input.adminEmail.toLowerCase(), input.adminName, passwordHash]
  );

  for (const flag of mockFeatureFlags) {
    await updateTenantFeatureFlag(
      tenant.id,
      flag.key,
      trial.enabledFeatureKeys.includes(flag.key),
      { role: "admin", tenantId: tenant.id }
    );
  }

  await addAuditLog(
    {
      tenantId: tenant.id,
      actor: "Self Registration",
      actorEmail: input.adminEmail.toLowerCase(),
      action: "tenant.self_registered",
      target: tenant.name,
      details: {
        plan: "free",
        trialDays: trial.trialDays,
        maxAgents: trial.maxAgents,
      },
    },
    { role: "admin", tenantId: tenant.id }
  );

  return { tenant, trial };
}

export async function listTenantTeams(tenantId: string, context: DbContext): Promise<TeamRecord[]> {
  await ensureInitialized();
  return withDbContext({ role: context.role, tenantId }, async (client) => {
    const result = await client.query(
      `SELECT id, tenant_id AS "tenantId", name, created_at AS "createdAt"
       FROM teams
       WHERE tenant_id = $1
       ORDER BY name ASC`,
      [tenantId]
    );
    return result.rows;
  });
}

export async function listUserTeamIdsForTenant(
  userId: string,
  tenantId: string,
  context: DbContext
): Promise<string[]> {
  await ensureInitialized();
  const result = await withDbContext({ role: context.role, tenantId }, async (client) => {
    return client.query<{ team_id: string }>(
      `SELECT ut.team_id
       FROM user_teams ut
       INNER JOIN teams t ON t.id = ut.team_id
       WHERE ut.user_id = $1 AND t.tenant_id = $2`,
      [userId, tenantId]
    );
  });
  return result.rows.map((r) => r.team_id);
}

export async function getTenantRolePermissions(
  tenantId: string,
  context: DbContext
): Promise<Record<Role, string[]>> {
  await ensureInitialized();
  const result = await withDbContext({ role: context.role, tenantId }, async (client) => {
    return client.query<{ role: Role; permissions: string[] }>(
      `SELECT role, permissions
       FROM tenant_role_permissions
       WHERE tenant_id = $1`,
      [tenantId]
    );
  });

  const matrix: Record<Role, string[]> = {
    admin: [...rolePermissionsMap.admin],
    supervisor: [...rolePermissionsMap.supervisor],
    agent: [...rolePermissionsMap.agent],
  };

  for (const row of result.rows) {
    matrix[row.role] = row.permissions ?? [];
  }

  return matrix;
}

export async function setTenantRolePermissions(
  tenantId: string,
  matrix: Record<Role, string[]>,
  context: DbContext
) {
  await ensureInitialized();
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    for (const role of Object.keys(matrix) as Role[]) {
      await client.query(
        `INSERT INTO tenant_role_permissions (tenant_id, role, permissions)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, role)
         DO UPDATE SET permissions = EXCLUDED.permissions`,
        [tenantId, role, matrix[role] ?? []]
      );
    }
  });
  return getTenantRolePermissions(tenantId, context);
}

export async function recordAuthEvent(input: {
  userId?: string | null;
  email: string;
  action: string;
  success: boolean;
  ip?: string;
  details?: Record<string, unknown>;
}) {
  await ensureInitialized();
  await pool.query(
    `INSERT INTO auth_events (id,user_id,email,action,success,ip,details,created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      `ae-${crypto.randomUUID().slice(0, 8)}`,
      input.userId ?? null,
      input.email.toLowerCase(),
      input.action,
      input.success,
      input.ip ?? "0.0.0.0",
      JSON.stringify(input.details ?? {}),
      new Date(),
    ]
  );
}

export async function getUserMfa(userId: string): Promise<UserMfaRecord | null> {
  await ensureInitialized();
  const result = await pool.query(
    `SELECT user_id AS "userId", secret, enabled, created_at AS "createdAt"
     FROM user_mfa
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export async function upsertUserMfaSecret(userId: string, secret: string) {
  await ensureInitialized();
  await pool.query(
    `INSERT INTO user_mfa (user_id, secret, enabled, created_at)
     VALUES ($1, $2, FALSE, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET secret = EXCLUDED.secret`,
    [userId, secret]
  );
}

export async function setUserMfaEnabled(userId: string, enabled: boolean) {
  await ensureInitialized();
  await pool.query(
    `UPDATE user_mfa
     SET enabled = $2
     WHERE user_id = $1`,
    [userId, enabled]
  );
}

export async function getTenantIntegrations(tenantId: string, context: DbContext) {
  await ensureInitialized();
  const result = await withDbContext({ role: context.role, tenantId }, async (client) => {
    return client.query(
      `SELECT tenant_id AS "tenantId", provider, enabled, api_key AS "apiKey", from_email AS "fromEmail", sender_id AS "senderId", updated_at AS "updatedAt"
       FROM tenant_integrations
       WHERE tenant_id = $1
       ORDER BY provider ASC`,
      [tenantId]
    );
  });
  return result.rows as TenantIntegrationConfig[];
}

export async function upsertTenantIntegration(
  tenantId: string,
  provider: "sendgrid" | "dreams_sa",
  values: { enabled: boolean; apiKey?: string | null; fromEmail?: string | null; senderId?: string | null },
  context: DbContext
) {
  await ensureInitialized();
  await withDbContext({ role: context.role, tenantId }, async (client) => {
    await client.query(
      `INSERT INTO tenant_integrations (tenant_id, provider, enabled, api_key, from_email, sender_id, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (tenant_id, provider)
       DO UPDATE SET enabled = EXCLUDED.enabled, api_key = EXCLUDED.api_key, from_email = EXCLUDED.from_email, sender_id = EXCLUDED.sender_id, updated_at = NOW()`,
      [
        tenantId,
        provider,
        values.enabled,
        values.apiKey ?? null,
        values.fromEmail ?? null,
        values.senderId ?? null,
      ]
    );
  });
}

export async function validatePassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
