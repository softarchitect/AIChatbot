"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { EmptyState, PageTransition } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { toast } from "sonner";
import { useState } from "react";

const createTenantSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  domain: z.string().min(3, "Domain is required"),
  adminEmail: z.string().email("Please enter a valid email"),
  language: z.string(),
  timezone: z.string(),
  plan: z.string(),
});

type CreateTenantForm = z.infer<typeof createTenantSchema>;

export default function CreateTenantPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const accessToken = useSessionStore((s) => s.accessToken);
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const canManageTenants = hasPermission("manage_tenants");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateTenantForm>({
    resolver: zodResolver(createTenantSchema),
    defaultValues: {
      language: "en",
      timezone: "America/New_York",
      plan: "starter",
    },
  });

  const onSubmit = async (data: CreateTenantForm) => {
    setSubmitting(true);
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    try {
      if (useApi) {
        if (!accessToken) {
          throw new Error("Session expired. Please sign in again.");
        }
        const response = await fetch("/api/v1/tenants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            name: data.name,
            domain: data.domain,
            adminEmail: data.adminEmail,
            language: data.language,
            timezone: data.timezone,
            plan: data.plan,
          }),
        });
        const raw = await response.text();
        const result = raw ? JSON.parse(raw) : {};
        if (!response.ok) {
          throw new Error(result?.error ?? `Failed to create tenant (HTTP ${response.status})`);
        }
      } else {
        await new Promise((r) => setTimeout(r, 1500));
      }
      toast.success(`Tenant "${data.name}" created successfully!`);
      router.push("/app/tenants");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to create tenant.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      {!canManageTenants ? (
        <EmptyState
          icon={Loader2}
          title="Insufficient permissions"
          description="Only platform owners can create tenants."
        />
      ) : (
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Back */}
        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Tenants
        </Button>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Create New Tenant</CardTitle>
            <CardDescription>
              Set up a new tenant with their initial configuration and assign an admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Tenant Name</Label>
                  <Input id="name" placeholder="Acme Corp" {...register("name")} />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input id="domain" placeholder="acme.example.com" {...register("domain")} />
                  {errors.domain && (
                    <p className="text-xs text-destructive">{errors.domain.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminEmail">Tenant Admin Email</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@acme.com"
                  {...register("adminEmail")}
                />
                {errors.adminEmail && (
                  <p className="text-xs text-destructive">{errors.adminEmail.message}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select
                    defaultValue="en"
                    onValueChange={(v) => setValue("language", v)}
                  >
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
                  <Select
                    defaultValue="America/New_York"
                    onValueChange={(v) => setValue("timezone", v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                      <SelectItem value="America/Chicago">Central (US)</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific (US)</SelectItem>
                      <SelectItem value="Europe/London">London (UK)</SelectItem>
                      <SelectItem value="Asia/Riyadh">Riyadh (SA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <Select
                    defaultValue="starter"
                    onValueChange={(v) => setValue("plan", v)}
                  >
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

              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Tenant"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
      )}
    </PageTransition>
  );
}
