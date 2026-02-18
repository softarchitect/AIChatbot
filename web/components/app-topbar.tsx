"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Moon,
  Sun,
  Globe,
  ArrowLeftRight,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSessionStore } from "@/lib/store";
import { useTranslation } from "@/lib/i18n";

export function AppTopbar() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const {
    currentUser,
    currentTenant,
    locale,
    setLocale,
    toggleDir,
    dir,
    sidebarCollapsed,
    logout,
  } = useSessionStore();
  const { t } = useTranslation(locale);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push("/auth/login");
  };

  const initials = currentUser?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() ?? "U";

  return (
    <motion.header
      initial={false}
      animate={{ paddingInlineStart: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="fixed inset-x-0 top-0 z-30 h-16 border-b border-border bg-background/90 backdrop-blur-md"
    >
      <div className="flex h-full items-center justify-between gap-4 px-6">
        {/* Search */}
        <div className="flex flex-1 items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("common.search")}
              className="ps-10 bg-secondary/50 border-border/50 focus:bg-background"
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setSearchOpen(false)}
            />
          </div>
          {currentTenant && (
            <Badge variant="outline" className="hidden md:flex gap-1.5 shrink-0">
              <span className="h-2 w-2 rounded-full bg-success" />
              {currentTenant.name}
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocale(locale === "en" ? "ar" : "en")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
          </Button>

          {/* RTL Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDir}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle RTL"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute end-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{currentUser?.name}</span>
                  <span className="text-xs text-muted-foreground">{currentUser?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/app/profile")}>
                <User className="mr-2 h-4 w-4" />
                {t("nav.profile")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/profile")}>
                <Settings className="mr-2 h-4 w-4" />
                {t("nav.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t("nav.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}
