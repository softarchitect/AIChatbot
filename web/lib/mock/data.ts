export type Role = "admin" | "supervisor" | "agent";
export type TenantStatus = "active" | "inactive" | "suspended";
export type PlanType = "free" | "starter" | "professional" | "enterprise";
export type UserStatus = "active" | "inactive" | "invited";

export interface Tenant {
  id: string;
  name: string;
  domain: string;
  status: TenantStatus;
  plan: PlanType;
  language: string;
  timezone: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  headerText: string;
  welcomeMessage: string;
  customDomain?: string;
  createdAt: string;
  activeUsers: number;
  totalUsers: number;
  storageUsedMb: number;
  apiCallsThisMonth: number;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  lastActive: string;
  avatar?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actor: string;
  actorEmail: string;
  action: string;
  target: string;
  details: Record<string, unknown>;
  timestamp: string;
  ip: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  group: "channels" | "ai" | "reporting" | "automation";
  enabled: boolean;
  requiresRestart: boolean;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  key: string;
  scope: string;
  createdAt: string;
  expiresAt: string;
  lastUsed?: string;
}

export interface Permission {
  id: string;
  key: string;
  label: string;
  group: string;
}

export const permissions: Permission[] = [
  { id: "p1", key: "view_users", label: "View Users", group: "Users" },
  { id: "p2", key: "edit_users", label: "Edit Users", group: "Users" },
  { id: "p3", key: "manage_roles", label: "Manage Roles", group: "Users" },
  { id: "p13", key: "view_conversations", label: "View Conversations", group: "Operations" },
  { id: "p14", key: "manage_conversations", label: "Manage Conversations", group: "Operations" },
  { id: "p15", key: "manage_escalations", label: "Manage Escalations", group: "Operations" },
  { id: "p16", key: "view_workflows", label: "View Workflows", group: "Operations" },
  { id: "p17", key: "manage_workflows", label: "Manage Workflows", group: "Operations" },
  { id: "p18", key: "view_analytics", label: "View Analytics", group: "Analytics" },
  { id: "p19", key: "manage_analytics", label: "Manage Analytics", group: "Analytics" },
  { id: "p20", key: "view_channels", label: "View Channels", group: "Channels & AI" },
  { id: "p21", key: "manage_channels", label: "Manage Channels", group: "Channels & AI" },
  { id: "p22", key: "view_ai_config", label: "View AI Config", group: "Channels & AI" },
  { id: "p23", key: "manage_ai_config", label: "Manage AI Config", group: "Channels & AI" },
  { id: "p24", key: "view_integrations", label: "View Integrations", group: "Channels & AI" },
  { id: "p25", key: "manage_integrations", label: "Manage Integrations", group: "Channels & AI" },
  { id: "p4", key: "view_feature_flags", label: "View Feature Flags", group: "Feature Flags" },
  { id: "p5", key: "manage_feature_flags", label: "Manage Feature Flags", group: "Feature Flags" },
  { id: "p6", key: "view_audit_logs", label: "View Audit Logs", group: "Audit" },
  { id: "p7", key: "export_audit_logs", label: "Export Audit Logs", group: "Audit" },
  { id: "p8", key: "manage_api_keys", label: "Manage API Keys", group: "API" },
  { id: "p9", key: "view_api_keys", label: "View API Keys", group: "API" },
  { id: "p10", key: "manage_branding", label: "Manage Branding", group: "Settings" },
  { id: "p11", key: "manage_security", label: "Manage Security", group: "Settings" },
  { id: "p12", key: "manage_billing", label: "Manage Billing", group: "Settings" },
];

export const rolePermissions: Record<Role, string[]> = {
  admin: permissions.map((p) => p.key),
  supervisor: [
    "view_users",
    "edit_users",
    "view_conversations",
    "manage_conversations",
    "manage_escalations",
    "view_workflows",
    "view_analytics",
    "view_channels",
    "view_ai_config",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
    "manage_branding",
    "view_tenants",
  ],
  agent: [
    "view_users",
    "view_conversations",
    "manage_conversations",
    "view_channels",
    "view_ai_config",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
  ],
};

export const tenants: Tenant[] = [
  {
    id: "t1",
    name: "Acme Corporation",
    domain: "acme.example.com",
    status: "active",
    plan: "enterprise",
    language: "en",
    timezone: "America/New_York",
    primaryColor: "#2563eb",
    accentColor: "#06b6d4",
    headerText: "Acme Portal",
    welcomeMessage: "Welcome to Acme Corporation's management portal.",
    customDomain: "portal.acme.com",
    createdAt: "2024-01-15T10:00:00Z",
    activeUsers: 145,
    totalUsers: 200,
    storageUsedMb: 4500,
    apiCallsThisMonth: 125000,
  },
  {
    id: "t2",
    name: "Globex Industries",
    domain: "globex.example.com",
    status: "active",
    plan: "professional",
    language: "en",
    timezone: "Europe/London",
    primaryColor: "#059669",
    accentColor: "#8b5cf6",
    headerText: "Globex Hub",
    welcomeMessage: "Welcome to Globex Industries.",
    createdAt: "2024-03-22T14:30:00Z",
    activeUsers: 78,
    totalUsers: 120,
    storageUsedMb: 2100,
    apiCallsThisMonth: 68000,
  },
  {
    id: "t3",
    name: "Initech Solutions",
    domain: "initech.example.com",
    status: "active",
    plan: "starter",
    language: "ar",
    timezone: "Asia/Riyadh",
    primaryColor: "#dc2626",
    accentColor: "#f59e0b",
    headerText: "Initech Portal",
    welcomeMessage: "Welcome to Initech Solutions portal.",
    createdAt: "2024-06-10T09:00:00Z",
    activeUsers: 32,
    totalUsers: 50,
    storageUsedMb: 800,
    apiCallsThisMonth: 15000,
  },
  {
    id: "t4",
    name: "Umbrella Corp",
    domain: "umbrella.example.com",
    status: "suspended",
    plan: "professional",
    language: "en",
    timezone: "America/Los_Angeles",
    primaryColor: "#7c3aed",
    accentColor: "#ec4899",
    headerText: "Umbrella Dashboard",
    welcomeMessage: "Welcome to Umbrella Corp dashboard.",
    createdAt: "2024-02-28T16:45:00Z",
    activeUsers: 0,
    totalUsers: 95,
    storageUsedMb: 3200,
    apiCallsThisMonth: 0,
  },
  {
    id: "t5",
    name: "Stark Enterprises",
    domain: "stark.example.com",
    status: "active",
    plan: "enterprise",
    language: "en",
    timezone: "America/Chicago",
    primaryColor: "#0891b2",
    accentColor: "#f97316",
    headerText: "Stark Portal",
    welcomeMessage: "Welcome to Stark Enterprises.",
    createdAt: "2024-04-05T11:20:00Z",
    activeUsers: 230,
    totalUsers: 300,
    storageUsedMb: 7800,
    apiCallsThisMonth: 340000,
  },
  {
    id: "t6",
    name: "Wayne Industries",
    domain: "wayne.example.com",
    status: "inactive",
    plan: "free",
    language: "en",
    timezone: "America/New_York",
    primaryColor: "#1e40af",
    accentColor: "#475569",
    headerText: "Wayne Portal",
    welcomeMessage: "Welcome to Wayne Industries.",
    createdAt: "2024-07-18T08:00:00Z",
    activeUsers: 5,
    totalUsers: 10,
    storageUsedMb: 120,
    apiCallsThisMonth: 500,
  },
];

export const tenantUsers: TenantUser[] = [
  { id: "u1", tenantId: "t1", name: "Sarah Chen", email: "sarah.chen@acme.com", role: "admin", status: "active", lastActive: "2025-02-17T09:30:00Z" },
  { id: "u2", tenantId: "t1", name: "James Wilson", email: "j.wilson@acme.com", role: "supervisor", status: "active", lastActive: "2025-02-16T14:20:00Z" },
  { id: "u3", tenantId: "t1", name: "Maria Garcia", email: "m.garcia@acme.com", role: "agent", status: "active", lastActive: "2025-02-17T08:15:00Z" },
  { id: "u4", tenantId: "t1", name: "Alex Thompson", email: "a.thompson@acme.com", role: "agent", status: "inactive", lastActive: "2025-01-20T10:00:00Z" },
  { id: "u5", tenantId: "t1", name: "Emily Johnson", email: "e.johnson@acme.com", role: "supervisor", status: "invited", lastActive: "" },
  { id: "u6", tenantId: "t2", name: "David Brown", email: "d.brown@globex.com", role: "admin", status: "active", lastActive: "2025-02-17T10:00:00Z" },
  { id: "u7", tenantId: "t2", name: "Lisa Park", email: "l.park@globex.com", role: "agent", status: "active", lastActive: "2025-02-16T16:30:00Z" },
  { id: "u8", tenantId: "t3", name: "Ahmed Hassan", email: "a.hassan@initech.com", role: "admin", status: "active", lastActive: "2025-02-17T07:45:00Z" },
  { id: "u9", tenantId: "t5", name: "Tony Martinez", email: "t.martinez@stark.com", role: "admin", status: "active", lastActive: "2025-02-17T11:00:00Z" },
  { id: "u10", tenantId: "t5", name: "Pepper Potts", email: "p.potts@stark.com", role: "supervisor", status: "active", lastActive: "2025-02-16T09:00:00Z" },
];

export const auditLogs: AuditLog[] = [
  { id: "al1", tenantId: "t1", actor: "Sarah Chen", actorEmail: "sarah.chen@acme.com", action: "user.invited", target: "e.johnson@acme.com", details: { role: "supervisor" }, timestamp: "2025-02-17T09:30:00Z", ip: "192.168.1.100" },
  { id: "al2", tenantId: "t1", actor: "James Wilson", actorEmail: "j.wilson@acme.com", action: "feature_flag.toggled", target: "ai_assistant", details: { enabled: true }, timestamp: "2025-02-17T08:45:00Z", ip: "192.168.1.101" },
  { id: "al3", tenantId: "t1", actor: "Sarah Chen", actorEmail: "sarah.chen@acme.com", action: "api_key.created", target: "Production Key", details: { scope: "read:all" }, timestamp: "2025-02-16T16:20:00Z", ip: "192.168.1.100" },
  { id: "al4", tenantId: "t1", actor: "System", actorEmail: "system", action: "security.mfa_enabled", target: "tenant", details: { enforced: true }, timestamp: "2025-02-16T14:00:00Z", ip: "0.0.0.0" },
  { id: "al5", tenantId: "t2", actor: "David Brown", actorEmail: "d.brown@globex.com", action: "user.role_changed", target: "l.park@globex.com", details: { from: "agent", to: "supervisor" }, timestamp: "2025-02-16T10:30:00Z", ip: "10.0.0.50" },
  { id: "al6", tenantId: "t1", actor: "Maria Garcia", actorEmail: "m.garcia@acme.com", action: "branding.updated", target: "logo", details: { field: "logo" }, timestamp: "2025-02-15T11:00:00Z", ip: "192.168.1.102" },
  { id: "al7", tenantId: "t1", actor: "Sarah Chen", actorEmail: "sarah.chen@acme.com", action: "user.deactivated", target: "a.thompson@acme.com", details: { reason: "Offboarded" }, timestamp: "2025-02-15T09:00:00Z", ip: "192.168.1.100" },
  { id: "al8", tenantId: "t5", actor: "Tony Martinez", actorEmail: "t.martinez@stark.com", action: "tenant.settings_updated", target: "security", details: { sessionTimeout: 3600 }, timestamp: "2025-02-14T15:30:00Z", ip: "172.16.0.10" },
  { id: "al9", tenantId: "t1", actor: "James Wilson", actorEmail: "j.wilson@acme.com", action: "api_key.revoked", target: "Test Key", details: { reason: "Expired" }, timestamp: "2025-02-14T13:00:00Z", ip: "192.168.1.101" },
  { id: "al10", tenantId: "t3", actor: "Ahmed Hassan", actorEmail: "a.hassan@initech.com", action: "feature_flag.toggled", target: "whatsapp_channel", details: { enabled: false }, timestamp: "2025-02-13T09:00:00Z", ip: "10.10.10.1" },
];

export const featureFlags: FeatureFlag[] = [
  { id: "ff1", key: "whatsapp_channel", name: "WhatsApp Channel", description: "Enable WhatsApp messaging channel for customer communication.", group: "channels", enabled: true, requiresRestart: false },
  { id: "ff2", key: "webchat_widget", name: "WebChat Widget", description: "Embed a live chat widget on your website.", group: "channels", enabled: true, requiresRestart: false },
  { id: "ff3", key: "sms_channel", name: "SMS Channel", description: "Enable SMS messaging for notifications and communication.", group: "channels", enabled: false, requiresRestart: true },
  { id: "ff4", key: "email_channel", name: "Email Channel", description: "Enable email integration for ticketing and outreach.", group: "channels", enabled: true, requiresRestart: false },
  { id: "ff14", key: "voice_channel", name: "Voice Channel", description: "Enable inbound and outbound voice calling capabilities.", group: "channels", enabled: false, requiresRestart: true },
  { id: "ff5", key: "ai_assistant", name: "AI Assistant", description: "AI-powered response suggestions and auto-replies.", group: "ai", enabled: true, requiresRestart: false },
  { id: "ff6", key: "ai_sentiment", name: "Sentiment Analysis", description: "Automatically analyze customer message sentiment.", group: "ai", enabled: false, requiresRestart: false },
  { id: "ff7", key: "ai_translation", name: "Auto Translation", description: "Real-time message translation between languages.", group: "ai", enabled: false, requiresRestart: true },
  { id: "ff8", key: "advanced_reports", name: "Advanced Reports", description: "Access to detailed analytics and custom report builder.", group: "reporting", enabled: true, requiresRestart: false },
  { id: "ff9", key: "export_reports", name: "Export Reports", description: "Export reports as PDF, CSV, or Excel.", group: "reporting", enabled: true, requiresRestart: false },
  { id: "ff10", key: "scheduled_reports", name: "Scheduled Reports", description: "Automatically send reports on a schedule.", group: "reporting", enabled: false, requiresRestart: false },
  { id: "ff11", key: "workflow_automation", name: "Workflow Automation", description: "Create automated workflows with triggers and actions.", group: "automation", enabled: true, requiresRestart: false },
  { id: "ff12", key: "auto_assignment", name: "Auto Assignment", description: "Automatically assign tickets to agents based on rules.", group: "automation", enabled: true, requiresRestart: false },
  { id: "ff13", key: "sla_management", name: "SLA Management", description: "Set and track service level agreements.", group: "automation", enabled: false, requiresRestart: true },
];

export const apiKeys: ApiKey[] = [
  { id: "ak1", tenantId: "t1", name: "Production API Key", key: "sk_live_a1b2c3d4e5f6g7h8i9j0klmnopqrstu", scope: "read:all,write:all", createdAt: "2025-01-15T10:00:00Z", expiresAt: "2026-01-15T10:00:00Z", lastUsed: "2025-02-17T09:00:00Z" },
  { id: "ak2", tenantId: "t1", name: "Staging Key", key: "sk_test_z9y8x7w6v5u4t3s2r1q0ponmlkjihgfe", scope: "read:all", createdAt: "2025-02-01T08:00:00Z", expiresAt: "2025-08-01T08:00:00Z", lastUsed: "2025-02-16T14:00:00Z" },
  { id: "ak3", tenantId: "t1", name: "Webhook Listener", key: "sk_live_webhook123456789abcdefghijklmn", scope: "webhook:receive", createdAt: "2025-01-20T12:00:00Z", expiresAt: "2026-01-20T12:00:00Z" },
  { id: "ak4", tenantId: "t2", name: "Main API Key", key: "sk_live_globex_a1b2c3d4e5f6g7h8i9j0kl", scope: "read:all,write:users", createdAt: "2025-02-10T09:00:00Z", expiresAt: "2026-02-10T09:00:00Z", lastUsed: "2025-02-17T07:30:00Z" },
];

export const usageTrend = [
  { month: "Sep", users: 320, apiCalls: 45000, storage: 2100 },
  { month: "Oct", users: 380, apiCalls: 52000, storage: 2400 },
  { month: "Nov", users: 410, apiCalls: 61000, storage: 2800 },
  { month: "Dec", users: 390, apiCalls: 58000, storage: 3100 },
  { month: "Jan", users: 450, apiCalls: 72000, storage: 3500 },
  { month: "Feb", users: 490, apiCalls: 89000, storage: 3900 },
];

export const activeUsersTrend = [
  { day: "Mon", active: 320 },
  { day: "Tue", active: 380 },
  { day: "Wed", active: 410 },
  { day: "Thu", active: 390 },
  { day: "Fri", active: 350 },
  { day: "Sat", active: 180 },
  { day: "Sun", active: 150 },
];
