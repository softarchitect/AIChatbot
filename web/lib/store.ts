import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, Tenant } from "./mock/data";
import { tenants } from "./mock/data";

interface SessionState {
  isAuthenticated: boolean;
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

  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchTenant: (tenantId: string) => void;
  setLocale: (locale: "en" | "ar") => void;
  toggleDir: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setLoading: (loading: boolean) => void;
  hasPermission: (permission: string) => boolean;
}

const rolePermissionsMap: Record<Role, string[]> = {
  admin: [
    "view_users", "edit_users", "manage_roles",
    "view_feature_flags", "manage_feature_flags",
    "view_audit_logs", "export_audit_logs",
    "manage_api_keys", "view_api_keys",
    "manage_branding", "manage_security", "manage_billing",
    "manage_tenants", "view_tenants",
  ],
  supervisor: [
    "view_users", "edit_users",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
    "manage_branding",
  ],
  agent: [
    "view_users",
    "view_feature_flags",
    "view_audit_logs",
    "view_api_keys",
  ],
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
  isAuthenticated: false,
  currentUser: null,
  currentTenant: null,
  locale: "en",
  dir: "ltr",
  sidebarCollapsed: false,
  isLoading: false,

  login: async (email: string, _password: string) => {
    set({ isLoading: true });
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1200));
    const role: Role = email.includes("admin")
      ? "admin"
      : email.includes("super")
        ? "supervisor"
        : "agent";
    set({
      isAuthenticated: true,
      currentUser: {
        id: "u-current",
        name: email.includes("admin") ? "Sarah Chen" : email.includes("super") ? "James Wilson" : "Maria Garcia",
        email,
        role,
      },
      currentTenant: tenants[0],
      isLoading: false,
    });
    return true;
  },

  logout: () => {
    set({
      isAuthenticated: false,
      currentUser: null,
      currentTenant: null,
    });
  },

  switchTenant: (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      set({ currentTenant: tenant });
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

  hasPermission: (permission: string) => {
    const user = get().currentUser;
    if (!user) return false;
    return rolePermissionsMap[user.role]?.includes(permission) ?? false;
  },
}),
    {
      name: "saasphere-session",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
        currentTenant: state.currentTenant,
        locale: state.locale,
        dir: state.dir,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
