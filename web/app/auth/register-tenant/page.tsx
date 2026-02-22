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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const schema = z.object({
  companyName: z.string().min(2),
  domain: z.string().min(3),
  adminName: z.string().min(2),
  adminEmail: z.string().email(),
  password: z.string().min(8),
  phoneCountry: z.string().min(1),
  phoneNumber: z.string().min(6),
});

type RegisterForm = z.infer<typeof schema>;

export default function RegisterTenantPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      phoneCountry: "+966",
    },
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
      setVerifyUrl(result?.data?.verifyUrl ?? null);
      toast.success("Registration successful. Please verify your email before login.");
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select defaultValue="+966" onValueChange={(v) => setValue("phoneCountry", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+966">Saudi Arabia (+966)</SelectItem>
                    <SelectItem value="+971">UAE (+971)</SelectItem>
                    <SelectItem value="+20">Egypt (+20)</SelectItem>
                    <SelectItem value="+1">USA (+1)</SelectItem>
                    <SelectItem value="+44">UK (+44)</SelectItem>
                  </SelectContent>
                </Select>
                {errors.phoneCountry && <p className="text-xs text-destructive">{errors.phoneCountry.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input placeholder="5XXXXXXXX" {...register("phoneNumber")} />
                {errors.phoneNumber && <p className="text-xs text-destructive">{errors.phoneNumber.message}</p>}
              </div>
            </div>
            {verifyUrl ? (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Email verification link generated:{" "}
                <a href={verifyUrl} className="text-primary underline" target="_blank" rel="noreferrer">
                  Open verification link
                </a>
              </div>
            ) : null}
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
