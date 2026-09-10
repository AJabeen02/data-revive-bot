export function StatCard({
  label,
  value,
  unit,
  sub,
  tag,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  tag?: string;
}) {
  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        {tag ? (
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            {tag}
          </span>
        ) : null}
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="mono-num text-3xl font-semibold text-foreground">{value}</span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </div>
      {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}
