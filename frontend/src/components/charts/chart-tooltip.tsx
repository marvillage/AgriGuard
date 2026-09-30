export interface TooltipRow {
  name?: string | number;
  value?: string | number | readonly (string | number)[];
  color?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
}: {
  active?: boolean;
  payload?: readonly TooltipRow[];
  label?: string | number;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-40 rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 text-xs shadow-lift backdrop-blur">
      <p className="mb-1.5 font-semibold text-ink">{label}</p>
      <ul className="space-y-1">
        {payload.map((row) => (
          <li key={String(row.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-500">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: row.color }} />
              {row.name}
            </span>
            <span className="font-semibold text-ink tabular-nums">
              {String(row.value)}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const chartColors = {
  series1: "#2a78d6",
  series2: "#eb6834",
  series3: "#1baf7a",
  series4: "#eda100",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  surface: "var(--chart-surface)",
};
