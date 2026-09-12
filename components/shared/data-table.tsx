import * as React from "react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  className?: string;
  cell?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  emptyTitle = "No results",
  emptyDescription = "No records match the current view.",
  className,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <div className="w-full overflow-auto rounded-lg border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className="border-b bg-card last:border-b-0 transition-colors hover:bg-accent/50"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3 align-middle", column.className)}
                  >
                    {column.cell
                      ? column.cell(row)
                      : String((row as Record<string, unknown>)[column.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}