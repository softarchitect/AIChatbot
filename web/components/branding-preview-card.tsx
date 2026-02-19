"use client";

import { motion } from "framer-motion";
import { Globe } from "lucide-react";

export function BrandingPreviewCard({
  tenantNameInitial,
  primaryColor,
  accentColor,
  headerText,
  welcomeMessage,
  customDomain,
  rtlPreview,
}: {
  tenantNameInitial: string;
  primaryColor: string;
  accentColor: string;
  headerText: string;
  welcomeMessage: string;
  customDomain: string;
  rtlPreview: boolean;
}) {
  return (
    <motion.div
      layout
      dir={rtlPreview ? "rtl" : "ltr"}
      className="overflow-hidden rounded-xl border border-border bg-card shadow-lg"
    >
      <div className="flex items-center gap-3 p-4" style={{ backgroundColor: primaryColor }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
          {tenantNameInitial}
        </div>
        <span className="font-semibold text-white">{headerText}</span>
      </div>

      <div className="space-y-4 p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{welcomeMessage}</p>
        <div className="flex gap-3">
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
            Primary Action
          </button>
          <button className="rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: accentColor }}>
            Secondary
          </button>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span className="text-xs font-medium text-foreground">Sample Widget</span>
          </div>
          <div className="h-2 w-[60%] rounded-full bg-muted">
            <div className="h-2 w-[75%] rounded-full" style={{ backgroundColor: accentColor }} />
          </div>
        </div>
      </div>

      {customDomain ? (
        <div className="border-t border-border px-6 py-3">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3 w-3" />
            {customDomain}
          </p>
        </div>
      ) : null}
    </motion.div>
  );
}
