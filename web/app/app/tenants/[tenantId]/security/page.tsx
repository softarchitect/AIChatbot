"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Check, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";

interface ChecklistItem {
  label: string;
  done: boolean;
}

export default function SecurityPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const [sessionExpiry, setSessionExpiry] = useState([60]);
  const [refreshEnabled, setRefreshEnabled] = useState(true);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [googleOAuth, setGoogleOAuth] = useState(true);
  const [microsoftOAuth, setMicrosoftOAuth] = useState(false);
  const canManageSecurity = hasPermission("manage_security");

  const checklist: ChecklistItem[] = [
    { label: "MFA enabled for all admins", done: mfaEnabled },
    { label: "Token refresh enabled", done: refreshEnabled },
    { label: "Session timeout under 120 min", done: sessionExpiry[0] <= 120 },
    { label: "At least one OAuth provider enabled", done: googleOAuth || microsoftOAuth },
    { label: "Strong password policy enforced", done: true },
    { label: "Rate limiting configured", done: true },
  ];

  const completedCount = checklist.filter((c) => c.done).length;
  const progress = Math.round((completedCount / checklist.length) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Security Settings</h2>
          <p className="text-sm text-muted-foreground">
            Configure session, authentication, and security policies.
          </p>
        </div>
        <Button onClick={() => toast.success("Security settings saved.")} className="gap-2" disabled={!canManageSecurity}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Session Settings */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Session Configuration</CardTitle>
            <CardDescription>Control how user sessions are managed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Token Expiry (minutes)</Label>
                <span className="text-sm font-mono font-medium text-foreground">
                  {sessionExpiry[0]} min
                </span>
              </div>
              <Slider
                value={sessionExpiry}
                onValueChange={setSessionExpiry}
                max={480}
                min={15}
                step={15}
                disabled={!canManageSecurity}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 60-120 minutes for most use cases.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Token Refresh</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Allow silent token refresh before expiry
                </p>
              </div>
              <Switch checked={refreshEnabled} onCheckedChange={setRefreshEnabled} disabled={!canManageSecurity} />
            </div>
          </CardContent>
        </Card>

        {/* MFA & OAuth */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Authentication</CardTitle>
            <CardDescription>Multi-factor and OAuth provider settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label>Multi-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Require MFA for all users
                </p>
              </div>
              <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} disabled={!canManageSecurity} />
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                OAuth Providers
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Google</span>
                </div>
                <Switch checked={googleOAuth} onCheckedChange={setGoogleOAuth} disabled={!canManageSecurity} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Microsoft</span>
                </div>
                <Switch checked={microsoftOAuth} onCheckedChange={setMicrosoftOAuth} disabled={!canManageSecurity} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Checklist */}
        <Card className="border-border lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Security Checklist
                </CardTitle>
                <CardDescription>
                  {completedCount} of {checklist.length} checks passing
                </CardDescription>
              </div>
              <span className="text-2xl font-bold text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-3 h-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {checklist.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                    item.done ? "bg-success/5" : "bg-destructive/5"
                  )}
                >
                  {item.done ? (
                    <Check className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <X className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <span className={cn(
                    "text-foreground",
                    !item.done && "text-muted-foreground"
                  )}>
                    {item.label}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
