"use client";

import { useParams, useRouter } from "next/navigation";
import { Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageTransition } from "@/components/shared";
import { useSessionStore } from "@/lib/store";

const channelMeta: Record<string, { name: string; feature: string }> = {
  whatsapp: { name: "WhatsApp", feature: "whatsapp_channel" },
  webchat: { name: "WebChat", feature: "webchat_widget" },
  sms: { name: "SMS", feature: "sms_channel" },
  email: { name: "Email", feature: "email_channel" },
  voice: { name: "Voice", feature: "voice_channel" },
};

export default function ChannelPlaceholderPage() {
  const params = useParams();
  const router = useRouter();
  const hasFeatureEnabled = useSessionStore((s) => s.hasFeatureEnabled);

  const channel = String(params.channel);
  const meta = channelMeta[channel];

  if (!meta) {
    return (
      <PageTransition>
        <div className="py-16 text-center text-muted-foreground">Channel not found.</div>
      </PageTransition>
    );
  }

  const enabled = hasFeatureEnabled(meta.feature);

  return (
    <PageTransition>
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <Button variant="ghost" className="gap-2" onClick={() => router.push("/app/channels")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Button>
        <Card className="border-border">
          <CardHeader>
            <CardTitle>{meta.name} Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {enabled ? (
              <p className="text-muted-foreground">
                {meta.name} is enabled for the current tenant. Full channel setup is planned for Phase 2.
              </p>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Locked for current tenant settings
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upgrade the tenant plan or enable the related feature flag to access this channel.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
