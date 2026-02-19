"use client";

import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { FeatureFlag } from "@/lib/mock/data";

export function FeatureFlagToggleRow({
  flag,
  index,
  disabled,
  onToggle,
}: {
  flag: FeatureFlag;
  index: number;
  disabled?: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <div className="min-w-0 flex-1 me-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-foreground">{flag.name}</p>
          {flag.requiresRestart ? (
            <Badge
              variant="outline"
              className="gap-1 bg-warning/10 px-1.5 py-0 text-[10px] text-warning border-warning/20"
            >
              <RefreshCw className="h-2.5 w-2.5" />
              Restart
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{flag.description}</p>
      </div>
      <Switch checked={flag.enabled} onCheckedChange={() => onToggle(flag.id)} disabled={disabled} />
    </motion.div>
  );
}
