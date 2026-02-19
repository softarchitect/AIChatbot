"use client";

import { useState, useMemo } from "react";
import { Search, ToggleLeft, ToggleRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { featureFlags, type FeatureFlag } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";
import { FeatureFlagToggleRow } from "@/components/feature-flag-toggle-row";

const groupLabels: Record<string, string> = {
  channels: "Channels",
  ai: "AI & Intelligence",
  reporting: "Reporting",
  automation: "Automation",
};

export default function FeatureFlagsPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [flags, setFlags] = useState<FeatureFlag[]>(featureFlags);
  const [search, setSearch] = useState("");
  const canManageFeatureFlags = hasPermission("manage_feature_flags");

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
    if (!canManageFeatureFlags) {
      toast.error("Insufficient permissions");
      return;
    }
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
    const flag = flags.find((f) => f.id === id);
    toast.success(
      `${flag?.name} ${flag?.enabled ? "disabled" : "enabled"}`
    );
  };

  const bulkToggle = (enable: boolean) => {
    if (!canManageFeatureFlags) {
      toast.error("Insufficient permissions");
      return;
    }
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
          <Button variant="outline" size="sm" onClick={() => bulkToggle(true)} className="gap-2" disabled={!canManageFeatureFlags}>
            <ToggleRight className="h-4 w-4" />
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => bulkToggle(false)} className="gap-2" disabled={!canManageFeatureFlags}>
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
                <FeatureFlagToggleRow
                  key={flag.id}
                  flag={flag}
                  index={i}
                  disabled={!canManageFeatureFlags}
                  onToggle={toggleFlag}
                />
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
