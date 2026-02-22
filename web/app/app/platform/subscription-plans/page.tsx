"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useSessionStore } from "@/lib/store";
import { featureFlags } from "@/lib/mock/data";
import { toast } from "sonner";

type Plan = {
  id: string;
  name: string;
  trialDays: number;
  agentLimit: number;
  enabledFeatureKeys: string[];
  status: "active" | "inactive";
};

export default function SubscriptionPlansPage() {
  const accessToken = useSessionStore((s) => s.accessToken);
  const currentUser = useSessionStore((s) => s.currentUser);
  const platformOwnerEmail = (process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL ?? "owner@saasphere.io").toLowerCase();
  const isPlatformOwner = currentUser?.email?.toLowerCase() === platformOwnerEmail;
  const isPlatformOperator = isPlatformOwner || Boolean(currentUser?.isPlatformSubAdmin);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/v1/platform/subscription-plans", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.status === 403) {
          setAccessDenied(true);
          setPlans([]);
          return;
        }
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(result?.data)) {
          throw new Error(result?.error ?? "Failed to load plans.");
        }
        setAccessDenied(false);
        setPlans(result.data as Plan[]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load plans.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  const updatePlanState = (id: string, patch: Partial<Plan>) => {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  const savePlan = async (plan: Plan) => {
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    setSavingId(plan.id);
    try {
      const response = await fetch("/api/v1/platform/subscription-plans", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(plan),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.data) {
        throw new Error(result?.error ?? "Failed to save plan.");
      }
      updatePlanState(plan.id, result.data as Partial<Plan>);
      toast.success(`${plan.name} updated.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save plan.");
    } finally {
      setSavingId(null);
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
              Your sub-admin account is missing the `manage_subscription_plans` permission.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Subscription Plans</h1>
        <p className="text-sm text-muted-foreground">
          Configure trial duration, agent limits, feature defaults and plan status.
        </p>
      </div>
      {plans.map((plan) => (
        <Card key={plan.id} className="border-border">
          <CardHeader>
            <CardTitle className="text-base">{plan.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input value={plan.name} onChange={(e) => updatePlanState(plan.id, { name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Trial Days</Label>
                <Input
                  type="number"
                  min={1}
                  value={plan.trialDays}
                  onChange={(e) => updatePlanState(plan.id, { trialDays: Number(e.target.value || 1) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Agent Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={plan.agentLimit}
                  onChange={(e) => updatePlanState(plan.id, { agentLimit: Number(e.target.value || 1) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={plan.status === "active"}
                onCheckedChange={(checked) =>
                  updatePlanState(plan.id, { status: checked ? "active" : "inactive" })
                }
              />
              <span className="text-sm text-foreground">Plan active</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {featureFlags.map((feature) => {
                const checked = plan.enabledFeatureKeys.includes(feature.key);
                return (
                  <label key={feature.key} className="flex items-center gap-2 rounded-md border border-border p-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => {
                        const next = new Set(plan.enabledFeatureKeys);
                        if (value) next.add(feature.key);
                        else next.delete(feature.key);
                        updatePlanState(plan.id, { enabledFeatureKeys: Array.from(next) });
                      }}
                    />
                    <span className="text-sm text-foreground">{feature.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void savePlan(plan)} disabled={savingId === plan.id} className="gap-2">
                {savingId === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
