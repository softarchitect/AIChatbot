"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Upload, Globe, ArrowLeftRight, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { Tenant } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { BrandingPreviewCard } from "@/components/branding-preview-card";
import { toast } from "sonner";

export default function WhiteLabelPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const accessToken = useSessionStore((s) => s.accessToken);
  const params = useParams();
  const tenantId = params.tenantId as string;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loadingTenant, setLoadingTenant] = useState(true);
  const [saving, setSaving] = useState(false);
  const canManageBranding = hasPermission("manage_branding");

  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [accentColor, setAccentColor] = useState("#06b6d4");
  const [headerText, setHeaderText] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [rtlPreview, setRtlPreview] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";

    async function loadTenant() {
      if (!useApi || !accessToken) {
        setLoadingTenant(false);
        return;
      }
      try {
        const response = await fetch(`/api/v1/tenants/${tenantId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "x-tenant-id": tenantId,
          },
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result?.data) {
          const t = result.data as Tenant;
          setTenant(t);
          setPrimaryColor(t.primaryColor);
          setAccentColor(t.accentColor);
          setHeaderText(t.headerText ?? "");
          setWelcomeMessage(t.welcomeMessage ?? "");
          setCustomDomain(t.customDomain ?? "");
          setLogoUrl(t.logoUrl ?? "");
          setLastSavedAt(new Date());
        }
      } finally {
        setLoadingTenant(false);
      }
    }

    void loadTenant();
  }, [accessToken, tenantId]);

  if (loadingTenant) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!tenant) return <p className="py-12 text-sm text-muted-foreground">Tenant data is unavailable.</p>;

  const saveBranding = async () => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi || !accessToken) {
      toast.error("API mode is not enabled.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/v1/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "x-tenant-id": tenantId,
        },
        body: JSON.stringify({
          primaryColor,
          accentColor,
          headerText,
          welcomeMessage,
          customDomain,
          logoUrl,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to save branding");
      }
      if (result?.data) {
        setTenant(result.data as Tenant);
        setLastSavedAt(new Date());
      }
      toast.success("Branding saved successfully.");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to save branding.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">White-Label Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize the branding and appearance for this tenant.
          </p>
          {lastSavedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Last saved: {lastSavedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
        <Button
          onClick={() => void saveBranding()}
          className="gap-2"
          disabled={!canManageBranding || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Settings */}
        <div className="space-y-6">
          {/* Logo Upload */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Logo</CardTitle>
              <CardDescription>Upload your tenant logo (PNG, SVG recommended)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="w-full space-y-2">
                  <Button variant="outline" size="sm" disabled>
                    Upload Logo
                  </Button>
                  <p className="text-xs text-muted-foreground">Max 2MB, 200x200px</p>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://cdn.yourdomain.com/logo.png"
                    disabled={!canManageBranding}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Brand Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1.5 flex-1">
                  <Label>Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-border"
                      disabled={!canManageBranding}
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="font-mono text-sm"
                      disabled={!canManageBranding}
                    />
                  </div>
                </div>
                <div className="space-y-1.5 flex-1">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded-lg border border-border"
                      disabled={!canManageBranding}
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono text-sm"
                      disabled={!canManageBranding}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Text */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Header Text</Label>
                <Input
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="Your Portal Name"
                  disabled={!canManageBranding}
                />
              </div>
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  placeholder="Welcome to your dashboard..."
                  disabled={!canManageBranding}
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Domain</Label>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="portal.yourdomain.com"
                    disabled={!canManageBranding}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Live Preview</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {rtlPreview ? "RTL" : "LTR"}
              </span>
              <Switch checked={rtlPreview} onCheckedChange={setRtlPreview} />
            </div>
          </div>

          <BrandingPreviewCard
            tenantNameInitial={tenant.name[0]}
            primaryColor={primaryColor}
            accentColor={accentColor}
            headerText={headerText || tenant.headerText}
            welcomeMessage={welcomeMessage || tenant.welcomeMessage}
            customDomain={customDomain}
            rtlPreview={rtlPreview}
          />
        </div>
      </div>
    </div>
  );
}
