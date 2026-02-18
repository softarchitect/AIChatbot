"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, ToggleLeft, ToggleRight, AlertTriangle, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { featureFlags, type FeatureFlag } from "@/lib/mock/data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const groupLabels: Record<string, string> = {
  channels: "Channels",
  ai: "AI & Intelligence",
  reporting: "Reporting",
  automation: "Automation",
};

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(featureFlags);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return flags;
    return flags.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [flags, search]);

  const groups = Array.from(new Set(filtered.map((f) => f.group)));

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    const flag = flags.find((f) => f.id === id);
    toast.success(
      `${flag?.name} ${flag?.enabled ? "disabled" : "enabled"}`
    );
  };

  const bulkToggle = (enable: boolean) => {
    setFlags((prev) => prev.map((f) => ({ ...f, enabled: enable })));
    toast.success(`All flags ${enable ? "enabled" : "disabled"}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Feature Flags</h2>
          <p className="text-sm text-muted-foreground">
            Toggle features on or off for this tenant.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => bulkToggle(true)} className="gap-2">
            <ToggleRight className="h-4 w-4" />
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(false)} className="gap-2">
            <ToggleLeft className="h-4 w-4" />
            Disable All
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search flags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-10"
        />
      </div>

      {/* Grouped Flags */}
      {groups.map((group) => (
        <Card key={group} className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              {groupLabels[group] ?? group}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {filtered
              .filter((f) => f.group === group)
              .map((flag, i) => (
                <motion.div
                  key={flag.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex-1 min-w-0 me-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{flag.name}</p>
                      {flag.requiresRestart && (
                        <Badge
                          variant="outline"
                          className="gap-1 text-[10px] px-1.5 py-0 bg-warning/10 text-warning border-warning/20"
                        >
                          <RefreshCw className="h-2.5 w-2.5" />
                          Restart
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">
                      {flag.description}
                    </p>
                  </div>
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={() => toggleFlag(flag.id)}
                  />
                </motion.div>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
