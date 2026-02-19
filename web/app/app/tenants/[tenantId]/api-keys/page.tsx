"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  Copy,
  Eye,
  EyeOff,
  Trash2,
  Key,
  Loader2,
  Terminal,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog, EmptyState } from "@/components/shared";
import { useSessionStore } from "@/lib/store";
import { apiKeys } from "@/lib/mock/data";
import { toast } from "sonner";

const createKeySchema = z.object({
  name: z.string().min(2, "Name is required"),
  scope: z.string(),
  expiration: z.string(),
});

type CreateKeyForm = z.infer<typeof createKeySchema>;

function maskKey(key: string) {
  return key.slice(0, 8) + "..." + key.slice(-4);
}

export default function ApiKeysPage() {
  const hasPermission = useSessionStore((s) => s.hasPermission);
  const params = useParams();
  const tenantId = params.tenantId as string;
  const canViewApiKeys = hasPermission("view_api_keys");
  const canManageApiKeys = hasPermission("manage_api_keys");
  const keys = apiKeys.filter((k) => k.tenantId === tenantId);

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateKeyForm>({
    resolver: zodResolver(createKeySchema),
    defaultValues: { scope: "read:all", expiration: "1y" },
  });

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const onCreate = async (data: CreateKeyForm) => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success(`API key "${data.name}" created successfully.`);
    setSubmitting(false);
    setCreateOpen(false);
    reset();
  };

  const onRevoke = () => {
    toast.success("API key revoked.");
    setRevokeTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2" disabled={!canManageApiKeys}>
          <Plus className="h-4 w-4" />
          Generate Key
        </Button>
      </div>

      {/* Keys List */}
      {!canViewApiKeys ? (
        <EmptyState
          icon={Key}
          title="Insufficient permissions"
          description="You do not have access to view API keys."
        />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys"
          description="Generate an API key to access the API programmatically."
          action={
            <Button onClick={() => setCreateOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Key
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {keys.map((key, i) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="border-border">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      <span className="font-medium text-foreground">{key.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {key.scope}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                        {revealedKeys.has(key.id) ? key.key : maskKey(key.key)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleReveal(key.id)}
                        aria-label={revealedKeys.has(key.id) ? "Hide key" : "Reveal key"}
                      >
                        {revealedKeys.has(key.id) ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => copyKey(key.key)}
                        aria-label="Copy key"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(key.createdAt).toLocaleDateString()} &middot; Expires{" "}
                      {new Date(key.expiresAt).toLocaleDateString()}
                      {key.lastUsed && (
                        <> &middot; Last used {new Date(key.lastUsed).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive hover:text-destructive shrink-0"
                    onClick={() => setRevokeTarget(key.id)}
                    disabled={!canManageApiKeys}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Revoke
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Example Snippet */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            Example Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted/50 p-4 text-xs font-mono text-muted-foreground overflow-x-auto">
{`curl -X POST https://api.saasphere.io/v1/onboard \\
  -H "Authorization: Bearer sk_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tenant_id": "${tenantId}",
    "user_email": "newuser@company.com",
    "role": "agent"
  }'`}
          </pre>
        </CardContent>
      </Card>

      {/* Create Key Modal */}
      <Dialog open={createOpen && canManageApiKeys} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input id="key-name" placeholder="Production Key" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Scope</Label>
              <Select defaultValue="read:all" onValueChange={(v) => setValue("scope", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="read:all">Read All</SelectItem>
                  <SelectItem value="read:all,write:all">Read & Write All</SelectItem>
                  <SelectItem value="read:users">Read Users</SelectItem>
                  <SelectItem value="webhook:receive">Webhook Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiration</Label>
              <Select defaultValue="1y" onValueChange={(v) => setValue("expiration", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                  <SelectItem value="6m">6 Months</SelectItem>
                  <SelectItem value="1y">1 Year</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        title="Revoke API Key"
        description="Are you sure you want to revoke this API key? Any integrations using this key will stop working immediately."
        confirmLabel="Revoke Key"
        onConfirm={onRevoke}
        destructive
      />
    </div>
  );
}
