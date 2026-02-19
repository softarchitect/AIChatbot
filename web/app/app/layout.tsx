"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useSessionStore } from "@/lib/store";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, sidebarCollapsed, dir } = useSessionStore();
  const [hydrated, setHydrated] = useState(false);

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
    if (hydrated && !isAuthenticated) {
      router.replace("/auth/login");
    }
  }, [isAuthenticated, hydrated, router]);

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = dir === "rtl" ? "ar" : "en";
  }, [dir]);

  if (!hydrated || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <AppShell dir={dir} sidebarCollapsed={sidebarCollapsed}>{children}</AppShell>;
}
