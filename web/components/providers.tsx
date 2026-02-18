"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          classNames: {
            toast: "bg-card text-card-foreground border-border",
          },
        }}
      />
    </ThemeProvider>
  );
}
