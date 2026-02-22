"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessionStore } from "@/lib/store";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, oauthLogin, isLoading, authError, clearAuthError } = useSessionStore();
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendVerifyUrl, setResendVerifyUrl] = useState("");
  const [oauthLoading, setOauthLoading] = useState<"google" | "microsoft" | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "owner@saasphere.io",
      password: "password123",
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setLocalError("");
    setResendMessage("");
    setResendVerifyUrl("");
    clearAuthError();
    const success = await login(data.email, data.password);
    if (success) {
      router.push("/app/dashboard");
    }
  };

  const loadGoogleScript = async () => {
    if (typeof window === "undefined") return;
    if ((window as unknown as { google?: unknown }).google) return;
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-google-identity='true']");
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Failed to load Google script.")), {
          once: true,
        });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.dataset.googleIdentity = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google script."));
      document.head.appendChild(script);
    });
  };

  const getGoogleIdToken = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.");
    }
    await loadGoogleScript();
    const google = (window as unknown as { google?: any }).google;
    if (!google?.accounts?.id) {
      throw new Error("Google Identity is unavailable.");
    }
    return await new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Google sign-in timed out. Please try again.")),
        60000
      );
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential?: string }) => {
          window.clearTimeout(timeout);
          if (!response?.credential) {
            reject(new Error("Google did not return an ID token."));
            return;
          }
          resolve(response.credential);
        },
      });
      google.accounts.id.prompt();
    });
  };

  const onGoogleOAuth = async () => {
    setLocalError("");
    setResendMessage("");
    setResendVerifyUrl("");
    clearAuthError();
    setOauthLoading("google");
    try {
      const idToken = await getGoogleIdToken();
      const success = await oauthLogin("google", idToken);
      if (!success) {
        setLocalError("Google sign-in failed. Ensure your email is onboarded in this system.");
        return;
      }
      router.push("/app/dashboard");
    } catch (oauthError) {
      const message = oauthError instanceof Error ? oauthError.message : "Google sign-in failed.";
      setLocalError(message);
    } finally {
      setOauthLoading(null);
    }
  };

  const onMicrosoftOAuth = async () => {
    setLocalError("");
    setResendMessage("");
    setResendVerifyUrl("");
    clearAuthError();
    setOauthLoading("microsoft");
    try {
      const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
      if (!clientId) {
        throw new Error("NEXT_PUBLIC_MICROSOFT_CLIENT_ID is missing.");
      }
      const { PublicClientApplication } = await import("@azure/msal-browser");
      const msalApp = new PublicClientApplication({
        auth: {
          clientId,
          authority: "https://login.microsoftonline.com/common",
        },
      });
      await msalApp.initialize();
      const result = await msalApp.loginPopup({
        scopes: ["openid", "profile", "email", "User.Read"],
        prompt: "select_account",
      });
      if (!result.idToken) {
        throw new Error("Microsoft did not return an ID token.");
      }
      const success = await oauthLogin("microsoft", result.idToken);
      if (!success) {
        setLocalError("Microsoft sign-in failed. Ensure your email is onboarded in this system.");
        return;
      }
      router.push("/app/dashboard");
    } catch (oauthError) {
      const message =
        oauthError instanceof Error ? oauthError.message : "Microsoft sign-in failed.";
      setLocalError(message);
    } finally {
      setOauthLoading(null);
    }
  };

  const error = authError ?? localError;
  const emailValue = watch("email");
  const canResendVerification = error.toLowerCase().includes("email is not verified");

  const onResendVerification = async () => {
    if (!emailValue) return;
    setResending(true);
    setResendMessage("");
    setResendVerifyUrl("");
    try {
      const response = await fetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error ?? "Failed to resend verification.");
      }
      setResendVerifyUrl(result?.verifyUrl ?? "");
      setResendMessage("Verification link generated.");
    } catch (e) {
      setResendMessage(e instanceof Error ? e.message : "Failed to resend verification.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_oklch(0.65_0.10_240_/_0.25),_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_oklch(0.70_0.08_200_/_0.15),_transparent_60%)]" />
        <div className="relative z-10 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur-sm text-primary-foreground font-bold">
              S
            </div>
            <span className="text-xl font-semibold text-primary-foreground">SaaSphere</span>
          </div>
          <div className="max-w-lg">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-4xl font-bold leading-tight text-primary-foreground text-balance"
            >
              Manage your multi-tenant platform with confidence.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5 }}
              className="mt-4 text-lg text-primary-foreground/70 leading-relaxed"
            >
              Enterprise-grade tenant management, RBAC, feature flags, and real-time insights at your fingertips.
            </motion.p>
          </div>
          <div className="flex items-center gap-8">
            {[
              { value: "500+", label: "Tenants Managed" },
              { value: "99.9%", label: "Uptime SLA" },
              { value: "50K+", label: "Active Users" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
              >
                <p className="text-2xl font-bold text-primary-foreground">{stat.value}</p>
                <p className="text-sm text-primary-foreground/60">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Right - Login Form */}
      <div className="flex w-full flex-col justify-center px-6 lg:w-1/2 lg:px-16 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-auto w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold">
              S
            </div>
            <span className="text-xl font-semibold text-foreground">SaaSphere</span>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account to continue
          </p>

          {/* OAuth Buttons */}
          <div className="mt-8 flex flex-col gap-3">
            <Button
              variant="outline"
              className="w-full gap-3 h-11"
              type="button"
              onClick={onGoogleOAuth}
              disabled={isLoading || oauthLoading !== null}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {oauthLoading === "google" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting Google...
                </>
              ) : (
                "Continue with Google"
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full gap-3 h-11"
              type="button"
              onClick={onMicrosoftOAuth}
              disabled={isLoading || oauthLoading !== null}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
              </svg>
              {oauthLoading === "microsoft" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting Microsoft...
                </>
              ) : (
                "Continue with Microsoft"
              )}
            </Button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">or continue with email</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                className="h-11"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button type="button" className="text-xs text-primary hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="h-11 pe-10"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
                {canResendVerification ? (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onResendVerification}
                      disabled={resending || !emailValue}
                    >
                      {resending ? "Resending..." : "Resend Verification Link"}
                    </Button>
                  </div>
                ) : null}
                {resendMessage ? (
                  <p className="mt-2 text-xs text-foreground">
                    {resendMessage}
                    {resendVerifyUrl ? (
                      <>
                        {" "}
                        <a
                          href={resendVerifyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          Open verification link
                        </a>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </motion.div>
            )}

            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Hint: Use{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">owner@saasphere.io</code>{" "}
            (platform owner),{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">admin@acme.com</code>{" "}
            (admin),{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">super@acme.com</code>{" "}
            (supervisor), or{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">agent@acme.com</code>{" "}
            (agent). Password:{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">password123</code>.
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            New company?{" "}
            <Link href="/auth/register-tenant" className="text-primary hover:underline">
              Register a trial tenant
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}
