"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, Globe, ArrowLeftRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { tenants } from "@/lib/mock/data";
import { toast } from "sonner";

export default function WhiteLabelPage() {
  const params = useParams();
  const tenant = tenants.find((t) => t.id === params.tenantId);

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
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="font-mono text-sm"
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
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="font-mono text-sm"
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
                />
              </div>
              <div className="space-y-2">
                <Label>Welcome Message</Label>
                <Textarea
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  rows={3}
                  placeholder="Welcome to your dashboard..."
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

          <motion.div
            layout
            dir={rtlPreview ? "rtl" : "ltr"}
            className="rounded-xl border border-border bg-card overflow-hidden shadow-lg"
          >
            {/* Preview Header */}
            <div
              className="flex items-center gap-3 p-4"
              style={{ backgroundColor: primaryColor }}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white font-bold text-sm">
                {tenant.name[0]}
              </div>
              <span className="font-semibold text-white">
                {headerText || tenant.headerText}
              </span>
            </div>

            {/* Preview Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {welcomeMessage || tenant.welcomeMessage}
              </p>
              <div className="flex gap-3">
                <button
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Primary Action
                </button>
                <button
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  Secondary
                </button>
              </div>
              <div className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="text-xs font-medium text-foreground">Sample Widget</span>
                </div>
                <div className="h-2 rounded-full bg-muted" style={{ width: "60%" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ backgroundColor: accentColor, width: "75%" }}
                  />
                </div>
              </div>
            </div>

            {/* Domain Footer */}
            {customDomain && (
              <div className="border-t border-border px-6 py-3">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  {customDomain}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
