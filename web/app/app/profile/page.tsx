"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Globe, Moon, Sun, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RoleBadge, PageTransition } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";

export default function ProfilePage() {
  const { theme, setTheme } = useTheme();
  const { currentUser, accessToken, locale, setLocale } = useSessionStore();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [email, setEmail] = useState(currentUser?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  const saveProfile = async () => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi) {
      toast.success("Profile updated successfully.");
      return;
    }
    if (!accessToken) {
      toast.error("Session expired. Please sign in again.");
      return;
    }
    setSaving(true);
    try {
      const profileResponse = await fetch("/api/v1/auth/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name, email }),
      });
      const profileResult = await profileResponse.json().catch(() => ({}));
      if (!profileResponse.ok) {
        throw new Error(profileResult?.error ?? "Failed to update profile.");
      }

      if (newPassword) {
        const passResponse = await fetch("/api/v1/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        });
        const passResult = await passResponse.json().catch(() => ({}));
        if (!passResponse.ok) {
          throw new Error(passResult?.error ?? "Failed to change password.");
        }
        setCurrentPassword("");
        setNewPassword("");
      }
      toast.success("Profile updated successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Profile Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-foreground">{currentUser?.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
                {currentUser?.role && <RoleBadge role={currentUser.role} />}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Full Name</Label>
                <Input
                  id="profile-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Preferences</CardTitle>
            <CardDescription>Configure language and appearance settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Language</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred language</p>
                </div>
              </div>
              <Select value={locale} onValueChange={(v) => setLocale(v as "en" | "ar")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === "dark" ? (
                  <Moon className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Sun className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">Theme</p>
                  <p className="text-xs text-muted-foreground">Choose your preferred theme</p>
                </div>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Password</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={() => void saveProfile()}
            disabled={saving}
            className="gap-2"
          >
            {saving ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
