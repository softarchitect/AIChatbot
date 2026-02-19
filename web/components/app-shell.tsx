"use client";

import { motion } from "framer-motion";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export function AppShell({
  dir,
  sidebarCollapsed,
  children,
}: {
  dir: "ltr" | "rtl";
  sidebarCollapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div dir={dir} className="min-h-screen bg-background">
      <AppSidebar />
      <AppTopbar />
      <motion.main
        initial={false}
        animate={{ paddingInlineStart: sidebarCollapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen pt-16"
      >
        <div className="p-6 lg:p-8">{children}</div>
      </motion.main>
    </div>
  );
}
