"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Save, SlidersHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useSessionStore } from "@/lib/store";
import { featureFlags } from "@/lib/mock/data";
import { toast } from "sonner";

type TrialConfig = {
  maxAgents: number;
  enabledFeatureKeys: string[];
  trialDays: number;
};

const trialFeatureCandidates = featureFlags.map((f) => ({
  key: f.key,
  label: f.name,
}));

export default function TrialConfigPage() {
  const accessToken = useSessionStore((s) => s.accessToken);
  const currentUser = useSessionStore((s) => s.currentUser);
  const platformOwnerEmail = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  const isPlatformOwner = currentUser?.email?.toLowerCase() === platformOwnerEmail;
  const isPlatformOperator = isPlatformOwner || Boolean(currentUser?.isPlatformSubAdmin);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [config, setConfig] = useState<TrialConfig>({
    maxAgents: 3,
    enabledFeatureKeys: ["webchat_widget", "email_channel"],
    trialDays: 14,
  });

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi) {
      setLoading(false);
      return;
    }
    if (!accessToken) {
      setLoading(false);
      toast.error("Session expired. Please sign in again.");
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/v1/platform/trial-config", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status === 403) {
          setAccessDenied(true);
          return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.data) {
          throw new Error(result?.error ?? "Failed to load trial configuration.");
        }
        setAccessDenied(false);
        setConfig(result.data as TrialConfig);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load trial configuration.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const groupedFeatures = useMemo(
    () => trialFeatureCandidates.sort((a, b) => a.label.localeCompare(b.label)),
    []
  );

  const toggleFeature = (featureKey: string, enabled: boolean) => {
    setConfig((prev) => {
      const current = new Set(prev.enabledFeatureKeys);
      if (enabled) current.add(featureKey);
      else current.delete(featureKey);
      return { ...prev, enabledFeatureKeys: Array.from(current) };
    });
  };

  const saveConfig = async () => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi) {
      toast.success("Trial configuration saved.");
      return;
    }
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/v1/platform/trial-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(config),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.data) {
        throw new Error(result?.error ?? "Failed to save trial configuration.");
      }
      setConfig(result.data as TrialConfig);
      toast.success("Trial configuration updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save trial configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isPlatformOperator) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>Platform operators only.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl py-10">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Permission Required</CardTitle>
            <CardDescription>
              Your sub-admin account is missing the `manage_trial_config` permission.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-primary/10 p-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Trial Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Set default trial limits applied to newly self-registered tenants.
          </p>
        </div>
      </div>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Limits</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maxAgents">Max agents on trial</Label>
            <Input
              id="maxAgents"
              type="number"
              min={1}
              value={config.maxAgents}
              onChange={(e) => setConfig((prev) => ({ ...prev, maxAgents: Number(e.target.value || 1) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="trialDays">Trial days</Label>
            <Input
              id="trialDays"
              type="number"
              min={1}
              value={config.trialDays}
              onChange={(e) => setConfig((prev) => ({ ...prev, trialDays: Number(e.target.value || 1) }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Enabled Trial Features</CardTitle>
          <CardDescription>New trial tenants will receive these features turned on.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {groupedFeatures.map((feature) => {
            const checked = config.enabledFeatureKeys.includes(feature.key);
            return (
              <label
                key={feature.key}
                className="flex items-center gap-2 rounded-md border border-border p-3 text-sm"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(value) => toggleFeature(feature.key, Boolean(value))}
                />
                <span>{feature.label}</span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button className="gap-2" onClick={saveConfig} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Trial Configuration
        </Button>
      </div>
    </div>
  );
}
