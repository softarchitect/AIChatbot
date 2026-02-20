"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";

const editTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  domain: z.string().min(3, "Domain is required"),
  language: z.string(),
  timezone: z.string(),
  plan: z.enum(["free", "starter", "professional", "enterprise"]),
  status: z.enum(["active", "inactive", "suspended"]),
});

type EditTenantForm = z.infer<typeof editTenantSchema>;

export default function EditTenantPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.tenantId as string;
  const accessToken = useSessionStore((s) => s.accessToken);
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const canManageTenants = hasPermission("manage_tenants");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditTenantForm>({
    resolver: zodResolver(editTenantSchema),
    defaultValues: {
      name: "",
      domain: "",
      language: "en",
      timezone: "UTC",
      plan: "starter",
      status: "active",
    },
  });
  const language = watch("language");
  const timezone = watch("timezone");
  const plan = watch("plan");
  const status = watch("status");

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    async function loadTenant() {
      if (!useApi || !accessToken) {
        setLoading(false);
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
        if (!response.ok || !result?.data) {
          throw new Error(result?.error ?? "Failed to load tenant");
        }
        reset({
          name: result.data.name,
          domain: result.data.domain,
          language: result.data.language,
          timezone: result.data.timezone,
          plan: result.data.plan,
          status: result.data.status,
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to load tenant.");
      } finally {
        setLoading(false);
      }
    }
    void loadTenant();
  }, [accessToken, tenantId, reset]);

  const onSubmit = async (values: EditTenantForm, stayOnPage = false) => {
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
        body: JSON.stringify(values),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to update tenant");
      }
      const updatedTenant = result?.data;
      if (updatedTenant) {
        reset({
          name: updatedTenant.name,
          domain: updatedTenant.domain,
          language: updatedTenant.language,
          timezone: updatedTenant.timezone,
          plan: updatedTenant.plan,
          status: updatedTenant.status,
        });
      }
      toast.success("Tenant updated successfully.");
      if (stayOnPage) {
        return;
      }
      router.push("/app/tenants?updated=1");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update tenant.");
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

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Edit Tenant</CardTitle>
          <CardDescription>Update tenant profile, plan, and status.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((values) => onSubmit(values, false))} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Tenant Name</Label>
                <Input id="name" {...register("name")} disabled={!canManageTenants || saving} />
                {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" {...register("domain")} disabled={!canManageTenants || saving} />
                {errors.domain ? <p className="text-xs text-destructive">{errors.domain.message}</p> : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={(v) => setValue("language", v)} disabled={!canManageTenants || saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={(v) => setValue("timezone", v)} disabled={!canManageTenants || saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                    <SelectItem value="Asia/Riyadh">Asia/Riyadh</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={(v) => setValue("plan", v as EditTenantForm["plan"])} disabled={!canManageTenants || saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setValue("status", v as EditTenantForm["status"])} disabled={!canManageTenants || saving}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={!canManageTenants || saving}
                onClick={handleSubmit((values) => onSubmit(values, true))}
                className="gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save & Continue Editing
              </Button>
              <Button type="submit" disabled={!canManageTenants || saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save & Back to List
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
