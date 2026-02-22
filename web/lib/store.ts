import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, Tenant } from "./mock/data";
import { tenants } from "./mock/data";

function createFallbackTenant(tenantId: string, tenantName?: string): Tenant {
  return {
    id: tenantId,
    name: tenantName ?? "Tenant",
    domain: "",
    status: "active",
    plan: "free",
    language: "en",
    timezone: "UTC",
    primaryColor: "#2563eb",
    accentColor: "#06b6d4",
    headerText: "Tenant Portal",
    welcomeMessage: "Welcome.",
    createdAt: new Date().toISOString(),
    activeUsers: 0,
    totalUsers: 0,
    storageUsedMb: 0,
    apiCallsThisMonth: 0,
  };
}

interface SessionState {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: Role;
    avatar?: string;
  } | null;
  currentTenant: Tenant | null;
  locale: "en" | "ar";
  dir: "ltr" | "rtl";
  sidebarCollapsed: boolean;
  isLoading: boolean;
  rolePermissionsByTenant: Record<string, Record<Role, string[]>>;
  tenantFeatureFlagsByTenant: Record<string, Record<string, boolean>>;

  login: (email: string, password: string) => Promise<boolean>;
  oauthLogin: (provider: "google" | "microsoft", idToken: string) => Promise<boolean>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  setLocale: (locale: "en" | "ar") => void;
  toggleDir: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean) => void;
  hydrateTenantPermissions: (tenantId: string, accessToken: string) => Promise<void>;
  hydrateTenantFeatureFlags: (tenantId: string, accessToken: string) => Promise<void>;
  setTenantFeatureFlags: (
    tenantId: string,
    flags: Array<{ key: string; enabled: boolean }>
  ) => void;
  hasPermission: (permission: string) => boolean;
  hasFeatureEnabled: (featureKey: string) => boolean;
}

const rolePermissionsMap: Record<Role, string[]> = {
  admin: [
    "view_users", "edit_users", "manage_roles",
    "view_workflows", "manage_workflows",
    "view_analytics", "manage_analytics",
    "view_conversations", "manage_conversations", "manage_escalations",
    "view_ai_config", "manage_ai_config",
    "view_integrations", "manage_integrations",
    "view_channels", "manage_channels",
    "view_feature_flags", "manage_feature_flags",
    "view_audit_logs", "export_audit_logs",
    "manage_api_keys", "view_api_keys",
    "manage_branding", "manage_security", "manage_billing",
    "manage_tenants", "view_tenants",
  ],
  supervisor: [
    "view_users", "edit_users",
    "view_workflows",
    "view_analytics",
    "view_conversations", "manage_conversations", "manage_escalations",
    "view_ai_config",
    "view_channels",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
    "manage_branding",
    "view_tenants",
  ],
  agent: [
    "view_users",
    "view_conversations", "manage_conversations",
    "view_ai_config",
    "view_channels",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
  ],
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  currentUser: null,
  currentTenant: null,
  locale: "en",
  dir: "ltr",
  sidebarCollapsed: false,
  isLoading: false,
  rolePermissionsByTenant: {},
  tenantFeatureFlagsByTenant: {},

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";

    if (useApi) {
      try {
        const response = await fetch("/api/v1/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
          set({ isLoading: false });
          return false;
        }

        const result = await response.json();
        const role = result.user.role as Role;
        const firstTenantId = result.user.tenantIds?.[0];
        const firstTenant = firstTenantId
          ? (tenants.find((t) => t.id === firstTenantId) ?? createFallbackTenant(firstTenantId))
          : null;

        set({
          isAuthenticated: true,
          accessToken: result.accessToken ?? null,
          refreshToken: result.refreshToken ?? null,
          currentUser: {
            id: result.user.id,
            name: result.user.name,
            email: result.user.email,
            role,
          },
          currentTenant: firstTenant ?? null,
          isLoading: false,
        });
        if (result.accessToken && firstTenant?.id) {
          void get().hydrateTenantPermissions(firstTenant.id, result.accessToken);
          void get().hydrateTenantFeatureFlags(firstTenant.id, result.accessToken);
        }
        return true;
      } catch {
        set({ isLoading: false });
        return false;
      }
    }

    await new Promise((r) => setTimeout(r, 1200));
    const role: Role =
      email.includes("admin") ? "admin" : email.includes("super") ? "supervisor" : "agent";
    set({
      isAuthenticated: true,
      currentUser: {
        id: "u-current",
        name: email.includes("admin")
          ? "Sarah Chen"
          : email.includes("super")
            ? "James Wilson"
            : "Maria Garcia",
        email,
        role,
      },
      currentTenant: tenants[0],
      isLoading: false,
    });
    return true;
  },

  oauthLogin: async (provider, idToken) => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/v1/auth/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, idToken }),
      });
      if (!response.ok) {
        set({ isLoading: false });
        return false;
      }
      const result = await response.json();
      const role = result.user.role as Role;
      const firstTenantId = result.user.tenantIds?.[0];
      const firstTenant = firstTenantId
        ? (tenants.find((t) => t.id === firstTenantId) ?? createFallbackTenant(firstTenantId))
        : null;

      set({
        isAuthenticated: true,
        accessToken: result.accessToken ?? null,
        refreshToken: result.refreshToken ?? null,
        currentUser: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role,
        },
        currentTenant: firstTenant ?? null,
        isLoading: false,
      });
      if (result.accessToken && firstTenant?.id) {
        void get().hydrateTenantPermissions(firstTenant.id, result.accessToken);
        void get().hydrateTenantFeatureFlags(firstTenant.id, result.accessToken);
      }
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    set({
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      currentUser: null,
      currentTenant: null,
      rolePermissionsByTenant: {},
      tenantFeatureFlagsByTenant: {},
    });
  },

  switchTenant: (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    const resolvedTenant = tenant ?? createFallbackTenant(tenantId);
    set({ currentTenant: resolvedTenant });
    const token = get().accessToken;
    if (token) {
      void get().hydrateTenantPermissions(resolvedTenant.id, token);
      void get().hydrateTenantFeatureFlags(resolvedTenant.id, token);
    }
  },

  setLocale: (locale) => {
    set({ locale, dir: locale === "ar" ? "rtl" : "ltr" });
  },

  toggleDir: () => {
    const current = get().dir;
    set({ dir: current === "ltr" ? "rtl" : "ltr" });
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  hydrateTenantPermissions: async (tenantId, accessToken) => {
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/roles-permissions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.data) return;
      set((state) => ({
        rolePermissionsByTenant: {
          ...state.rolePermissionsByTenant,
          [tenantId]: result.data as Record<Role, string[]>,
        },
      }));
    } catch {
      // no-op fallback to default local map
    }
  },

  hydrateTenantFeatureFlags: async (tenantId, accessToken) => {
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}/feature-flags`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(result?.data)) return;
      const nextFlags = (result.data as Array<{ key: string; enabled: boolean }>).reduce(
        (acc, flag) => {
          acc[flag.key] = Boolean(flag.enabled);
          return acc;
        },
        {} as Record<string, boolean>
      );
      set((state) => ({
        tenantFeatureFlagsByTenant: {
          ...state.tenantFeatureFlagsByTenant,
          [tenantId]: nextFlags,
        },
      }));
    } catch {
      // no-op fallback to plan map
    }
  },

  setTenantFeatureFlags: (tenantId, flags) => {
    const nextFlags = flags.reduce(
      (acc, flag) => {
        acc[flag.key] = Boolean(flag.enabled);
        return acc;
      },
      {} as Record<string, boolean>
    );
    set((state) => ({
      tenantFeatureFlagsByTenant: {
        ...state.tenantFeatureFlagsByTenant,
        [tenantId]: nextFlags,
      },
    }));
  },

  hasPermission: (permission: string) => {
    const user = get().currentUser;
    if (!user) return false;
    const tenantId = get().currentTenant?.id;
    if (tenantId) {
      const tenantMap = get().rolePermissionsByTenant[tenantId];
      if (tenantMap?.[user.role]) {
        return tenantMap[user.role].includes(permission);
      }
    }
    return rolePermissionsMap[user.role]?.includes(permission) ?? false;
  },

  hasFeatureEnabled: (featureKey: string) => {
    const tenant = get().currentTenant;
    if (!tenant) return false;
    const tenantFlags = get().tenantFeatureFlagsByTenant[tenant.id];
    if (tenantFlags && featureKey in tenantFlags) {
      return tenantFlags[featureKey];
    }

    const planFeatures: Record<string, string[]> = {
      free: ["webchat_widget"],
      starter: ["webchat_widget", "email_channel"],
      professional: ["webchat_widget", "email_channel", "whatsapp_channel"],
      enterprise: ["webchat_widget", "email_channel", "whatsapp_channel", "sms_channel", "voice_channel"],
    };

    return planFeatures[tenant.plan]?.includes(featureKey) ?? false;
  },
}),
    {
      name: "saasphere-session",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentUser: state.currentUser,
        currentTenant: state.currentTenant,
        locale: state.locale,
        dir: state.dir,
        sidebarCollapsed: state.sidebarCollapsed,
        rolePermissionsByTenant: state.rolePermissionsByTenant,
        tenantFeatureFlagsByTenant: state.tenantFeatureFlagsByTenant,
      }),
    }
  )
);
