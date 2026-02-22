"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const schema = z.object({
  companyName: z.string().min(2),
  domain: z.string().min(3),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  password: z.string().min(8),
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterTenantPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: RegisterForm) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/v1/public/register-tenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          language: "en",
          timezone: "Asia/Riyadh",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to register tenant.");
      }
      toast.success("Registration successful. You can now sign in.");
      router.push("/auth/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-xl border-border">
        <CardHeader>
          <CardTitle>Register Your Company</CardTitle>
          <CardDescription>
            Create your tenant account and start with a default trial plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input placeholder="Acodet" {...register("companyName")} />
                {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input placeholder="acodet.sa" {...register("domain")} />
                {errors.domain && <p className="text-xs text-destructive">{errors.domain.message}</p>}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Admin Name</Label>
                <Input placeholder="Company Admin" {...register("adminName")} />
                {errors.adminName && <p className="text-xs text-destructive">{errors.adminName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Admin Email</Label>
                <Input type="email" placeholder="admin@acodet.sa" {...register("adminEmail")} />
                {errors.adminEmail && <p className="text-xs text-destructive">{errors.adminEmail.message}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="Minimum 8 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" type="button" onClick={() => router.push("/auth/login")}>
                Back to Login
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Tenant...
                  </>
                ) : (
                  "Create Trial Account"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
