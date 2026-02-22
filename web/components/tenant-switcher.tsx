"use client";

import { useEffect, useState } from "react";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/lib/store";
import { tenants as mockTenants, type Tenant } from "@/lib/mock/data";

export function TenantSwitcher({ collapsed, inTopbar = false }: { collapsed?: boolean; inTopbar?: boolean }) {
  const [open, setOpen] = useState(false);
  const [tenantOptions, setTenantOptions] = useState<Tenant[]>(mockTenants);
  const { currentTenant, switchTenant, accessToken } = useSessionStore();

  useEffect(() => {
    const useApi = process.env.NEXT_PUBLIC_USE_API_AUTH === "true";
    if (!useApi || !accessToken) {
      setTenantOptions(mockTenants);
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/v1/tenants", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !Array.isArray(result?.data)) return;
        setTenantOptions(result.data as Tenant[]);
      } catch {
        // keep current options
      }
    })();
  }, [accessToken]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between border-border/50 bg-secondary/50 hover:bg-secondary",
            collapsed ? "w-10 px-0" : inTopbar ? "w-56" : "w-full"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 text-primary" />
            {!collapsed && (
              <span className="truncate text-sm">{currentTenant?.name ?? "Select tenant"}</span>
            )}
          </div>
          {!collapsed && <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tenant..." className="h-9" />
          <CommandList>
            <CommandEmpty>No tenant found.</CommandEmpty>
            <CommandGroup>
              {tenantOptions.map((tenant) => (
                <CommandItem
                  key={tenant.id}
                  value={tenant.name}
                  onSelect={() => {
                    switchTenant(tenant.id);
                    setOpen(false);
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span className="text-sm">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground">{tenant.domain}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      currentTenant?.id === tenant.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
