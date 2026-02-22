"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, CircleX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Missing verification token.");
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`);
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result?.error ?? "Verification failed.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Verification failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg border-border">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>Confirm your email address to activate tenant login.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying your email...
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <CircleX className="h-4 w-4" />
              {error}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Email verified successfully.
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => router.push("/auth/login")}>Go to Login</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
