"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useSessionStore } from "@/lib/store";
import { messagesByLocale } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  const locale = useSessionStore((s) => s.locale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const safeLocale = mounted ? locale : "en";

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <NextIntlClientProvider locale={safeLocale} messages={messagesByLocale[safeLocale]}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            classNames: {
              toast: "bg-card text-card-foreground border-border",
            },
          }}
        />
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
