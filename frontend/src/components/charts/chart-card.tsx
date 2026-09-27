"use client";

import { useState } from "react";
import { ChartLine, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export interface LegendItem {
  label: string;
  color: string;
  shape?: "line" | "square";
}

export interface ChartTable {
  columns: string[];
  rows: (string | number)[][];
}

export function ChartCard({
  title,
  description,
  legend,
  table,
  action,
  className,
  children,
}: {
  title: string;
  description?: string;
  legend?: LegendItem[];
  table: ChartTable;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<"chart" | "table">("chart");

  return (
    <Card className={className}>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {action}
          <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label={t("common.viewAs")}>
            <ViewButton active={view === "chart"} onClick={() => setView("chart")} label={t("common.chartView")}>
              <ChartLine className="h-3.5 w-3.5" />
            </ViewButton>
            <ViewButton active={view === "table"} onClick={() => setView("table")} label={t("common.tableView")}>
              <Table2 className="h-3.5 w-3.5" />
            </ViewButton>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {legend && legend.length > 1 && view === "chart" ? (
          <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5">
            {legend.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <span
                  className={cn(
                    "inline-block",
                    item.shape === "square" ? "h-2.5 w-2.5 rounded-[3px]" : "h-0.5 w-4 rounded-full"
                  )}
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </li>
            ))}
          </ul>
        ) : null}

        {view === "chart" ? (
          children
        ) : (
          <div className="max-h-80 overflow-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs text-slate-500">
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} scope="col" className="px-4 py-2.5 font-semibold">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 tabular-nums">
                {table.rows.map((row) => (
                  <tr key={String(row[0])}>
                    {row.map((cell, index) => (
                      <td
                        key={index}
                        className={cn("px-4 py-2", index === 0 ? "font-medium text-ink" : "text-slate-600")}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ViewButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "cursor-pointer rounded-md p-1.5 transition-all",
        active ? "bg-white text-ink shadow-soft" : "text-slate-400 hover:text-ink"
      )}
    >
      {children}
    </button>
  );
}
