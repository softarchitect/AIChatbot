"use client";

import { Badge } from "@/components/ui/badge";
import type { AuditLog } from "@/lib/mock/data";
import { SlideOverDrawer } from "@/components/slideover-drawer";

export function AuditLogDetailDrawer({
  log,
  open,
  onOpenChange,
}: {
  log: AuditLog | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <SlideOverDrawer
      open={open}
      onOpenChange={onOpenChange}
      title="Log Details"
      description="Full details for this audit log entry."
    >
      {log ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Actor</p>
              <p className="font-medium text-foreground">{log.actor}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium text-foreground">{log.actorEmail}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Action</p>
              <Badge variant="outline">{log.action}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Target</p>
              <p className="font-medium text-foreground">{log.target}</p>
            </div>
            <div>
              <p className="text-muted-foreground">IP Address</p>
              <p className="font-mono text-foreground">{log.ip}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Timestamp</p>
              <p className="font-medium text-foreground">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Details (JSON)</p>
            <pre className="overflow-x-auto rounded-lg bg-muted/50 p-4 text-xs font-mono text-muted-foreground">
              {JSON.stringify(log.details, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </SlideOverDrawer>
  );
}
