"use client";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, TableSkeleton } from "@/components/shared";

export function DataTable({
  columns,
  loading,
  hasRows,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  children,
  skeletonRows = 5,
}: {
  columns: React.ReactNode;
  loading?: boolean;
  hasRows: boolean;
  emptyIcon: React.ElementType;
  emptyTitle: string;
  emptyDescription: string;
  children: React.ReactNode;
  skeletonRows?: number;
}) {
  if (loading) {
    return <TableSkeleton rows={skeletonRows} cols={5} />;
  }

  if (!hasRows) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">{columns}</TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </div>
  );
}
