"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Lock, Sparkles, MessageSquare, Mail, Phone, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";

const channels = [
  { name: "WhatsApp", slug: "whatsapp", feature: "whatsapp_channel", icon: MessageSquare, color: "text-success" },
  { name: "WebChat", slug: "webchat", feature: "webchat_widget", icon: Globe, color: "text-primary" },
  { name: "SMS", slug: "sms", feature: "sms_channel", icon: Phone, color: "text-chart-3" },
  { name: "Email", slug: "email", feature: "email_channel", icon: Mail, color: "text-chart-2" },
  { name: "Voice", slug: "voice", feature: "voice_channel", icon: Phone, color: "text-chart-4" },
];

export default function ChannelsPage() {
  const hasFeatureEnabled = useSessionStore((s) => s.hasFeatureEnabled);
  const { t } = useTranslation();

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Badge variant="outline" className="gap-1.5 bg-primary/10 text-primary border-primary/20">
              <Sparkles className="h-3 w-3" />
              {t("phase2.title")}
            </Badge>
            <h1 className="text-2xl font-bold text-foreground text-balance">
              Channel Management
            </h1>
            <p className="mx-auto max-w-md leading-relaxed text-muted-foreground">
              {t("phase2.desc")} Manage WhatsApp, WebChat, SMS, Email, and Voice channels
              all from one unified dashboard.
            </p>
          </div>

          {/* Channel Cards Preview */}
          <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mt-8">
            {channels.map((channel, i) => (
              <motion.div
                key={channel.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <Card className="border-border opacity-60">
                  <CardContent className="flex items-center gap-3 p-4">
                    <channel.icon className={`h-5 w-5 ${channel.color}`} />
                    <span className="text-sm font-medium text-foreground">{channel.name}</span>
                    {hasFeatureEnabled(channel.feature) ? (
                      <Link href={`/app/channels/${channel.slug}`} className="ml-auto">
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </Link>
                    ) : (
                      <Lock className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <p className="text-sm text-muted-foreground">
            {t("phase2.locked")}
          </p>
          <Button variant="outline" disabled>
            Contact Sales to Upgrade
          </Button>
        </motion.div>
      </div>
    </PageTransition>
  );
}
