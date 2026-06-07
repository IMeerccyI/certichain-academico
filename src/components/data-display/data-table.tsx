import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type DataTableColumn<Row> = {
  align?: "left" | "right";
  header: string;
  key: string;
  render: (row: Row) => ReactNode;
};

type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  getRowKey: (row: Row) => string;
  rows: Row[];
};

export function DataTable<Row>({ columns, getRowKey, rows }: DataTableProps<Row>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-black/30">
      <table className="w-full min-w-[38rem] text-left text-xs">
        <thead className="bg-black/55 text-muted-foreground">
          <tr>
            {columns.map((column) => (
              <th
                className={cn(
                  "px-3 py-2 font-medium",
                  column.align === "right" && "text-right",
                )}
                key={column.key}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/70">
          {rows.map((row) => (
            <tr className="text-foreground/85" key={getRowKey(row)}>
              {columns.map((column) => (
                <td
                  className={cn(
                    "px-3 py-3",
                    column.align === "right" && "text-right",
                  )}
                  key={column.key}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
