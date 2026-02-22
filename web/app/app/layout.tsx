"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSessionStore } from "@/lib/store";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, accessToken, sidebarCollapsed, dir, currentUser, logout } = useSessionStore();
  const [hydrated, setHydrated] = useState(false);
  const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
  const hasValidSession = isAuthenticated && (!useApi || !!accessToken);

  // Wait for zustand persist to rehydrate from localStorage
  useEffect(() => {
    const unsub = useSessionStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });
    // If already hydrated (fast path)
    if (useSessionStore.persist.hasHydrated()) {
      setHydrated(true);
    }
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    if (useApi && !accessToken) {
      // Clear stale persisted mock session and force fresh API login.
      logout();
      router.replace("/auth/login");
    }
  }, [accessToken, hydrated, isAuthenticated, logout, router, useApi]);

  useEffect(() => {
    if (!hydrated || !currentUser) return;
    if (currentUser.role === "agent") {
      const allowed = pathname.startsWith("/app/agent/") || pathname === "/app/profile" || pathname.startsWith("/app/channels");
      if (!allowed) {
        router.replace("/app/agent/dashboard");
      }
    }
  }, [currentUser, hydrated, pathname, router]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === "rtl" ? "ar" : "en";
  }, [dir]);

  if (!hydrated || !hasValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AppShell dir={dir} sidebarCollapsed={sidebarCollapsed}>{children}</AppShell>;
}
