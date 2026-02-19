"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Upload, Globe, ArrowLeftRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { tenants } from "@/lib/mock/data";
import { useSessionStore } from "@/lib/store";
import { BrandingPreviewCard } from "@/components/branding-preview-card";
import { toast } from "sonner";

export default function WhiteLabelPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const params = useParams();
  const tenant = tenants.find((t) => t.id === params.tenantId);
  const canManageBranding = hasPermission("manage_branding");

  const [primaryColor, setPrimaryColor] = useState(tenant?.primaryColor ?? "#2563eb");
  const [accentColor, setAccentColor] = useState(tenant?.accentColor ?? "#06b6d4");
  const [headerText, setHeaderText] = useState(tenant?.headerText ?? "");
  const [welcomeMessage, setWelcomeMessage] = useState(tenant?.welcomeMessage ?? "");
  const [customDomain, setCustomDomain] = useState(tenant?.customDomain ?? "");
  const [rtlPreview, setRtlPreview] = useState(false);

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">White-Label Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize the branding and appearance for this tenant.
          </p>
        </div>
        <Button
          onClick={() => toast.success("Branding saved successfully.")}
          className="gap-2"
          disabled={!canManageBranding}
        >
          <Save className="h-4 w-4" />
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
                <div>
                  <Button variant="outline" size="sm">
                    Upload Logo
                  </Button>
                  <p className="mt-1 text-xs text-muted-foreground">Max 2MB, 200x200px</p>
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
