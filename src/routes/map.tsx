import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GridMap } from "@/components/GridMap";
import { exposure, formatDay, grids, meta } from "@/lib/era5";

const TITLE = "Gridded maps — ERA5 January 2025 | SIH Geo-Climate";
const DESC =
  "Day-by-day gridded rainfall, temperature, wind, terrain and derived exposure across 8–13.5°N, 76–80.5°E from ERA5 reanalysis.";

export const Route = createFileRoute("/map")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: MapPage,
});

type LayerKey = "rain" | "temp" | "wind" | "elevation" | "exposure";

const LAYERS: { key: LayerKey; label: string; unit: string; kind: "rain" | "temp" | "wind"; decimals: number }[] = [
  { key: "rain", label: "Rainfall total", unit: "mm", kind: "rain", decimals: 2 },
  { key: "temp", label: "Mean temperature", unit: "°C", kind: "temp", decimals: 1 },
  { key: "wind", label: "Mean 10 m wind", unit: "m/s", kind: "wind", decimals: 2 },
  { key: "elevation", label: "Terrain elevation", unit: "m", kind: "temp", decimals: 0 },
  { key: "exposure", label: "Derived exposure", unit: "index", kind: "wind", decimals: 2 },
];

function MapPage() {
  const [layerKey, setLayerKey] = useState<LayerKey>("rain");
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  const layer = LAYERS.find((l) => l.key === layerKey)!;

  const exposureGrid = useMemo(() => {
    const rows = grids.latitude.length;
    const cols = grids.longitude.length;
    const g: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0));
    exposure.cells.forEach((c, i) => {
      g[Math.floor(i / cols)]![i % cols] = c.exposure_index;
    });
    return g;
  }, []);

  const field = useMemo(() => {
    if (layerKey === "elevation") return grids.terrain.elevation;
    if (layerKey === "exposure") return exposureGrid;
    if (layerKey === "temp")
      return dayIndex === null
        ? averageGrids(grids.daily_temp_c)
        : grids.daily_temp_c[dayIndex]!;
    if (layerKey === "wind")
      return dayIndex === null ? averageGrids(grids.daily_wind_ms) : grids.daily_wind_ms[dayIndex]!;
    return dayIndex === null ? grids.month_rain_total_mm : grids.daily_rain_mm[dayIndex]!;
  }, [layerKey, dayIndex, exposureGrid]);

  const timeless = layerKey === "elevation" || layerKey === "exposure";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">0.25° grid · {meta.grid.rows}×{meta.grid.cols}</p>
        <h1 className="mt-2 text-3xl font-semibold">Gridded fields</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Each square is one ERA5 grid cell. North is at the top; values come straight from the January 2025 files.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="panel h-fit p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Layer</h2>
          <div className="mt-3 flex flex-col gap-2">
            {LAYERS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => setLayerKey(l.key)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  l.key === layerKey
                    ? "border-primary bg-primary/15 text-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {l.label}
                <span className="mono-num ml-1 text-[10px] text-muted-foreground">{l.unit}</span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Day</h2>
            <select
              value={dayIndex ?? ""}
              disabled={timeless}
              onChange={(e) => setDayIndex(e.target.value === "" ? null : Number(e.target.value))}
              className="mt-2 w-full rounded-md border border-border bg-surface-raised px-2 py-2 text-sm disabled:opacity-40"
            >
              <option value="">Whole month</option>
              {grids.dates.map((d, i) => (
                <option key={d} value={i}>
                  {formatDay(d)}
                </option>
              ))}
            </select>
            {timeless ? (
              <p className="mt-2 text-xs text-muted-foreground">This layer is fixed for the whole period.</p>
            ) : null}
          </div>

          {layerKey === "exposure" ? (
            <p className="mt-4 rounded-md border border-accent/40 bg-accent/10 p-2 text-[11px] leading-relaxed">
              Derived indicator, not a forecast. {exposure.method}
            </p>
          ) : null}
        </aside>

        <section className="panel p-5">
          <h2 className="text-lg font-semibold">
            {layer.label}
            {!timeless ? ` — ${dayIndex === null ? "January 2025" : formatDay(grids.dates[dayIndex]!)}` : ""}
          </h2>
          <div className="mt-4">
            <GridMap field={field} kind={layer.kind} unit={layer.unit} decimals={layer.decimals} />
          </div>
        </section>
      </div>
    </div>
  );
}

function averageGrids(stack: number[][][]) {
  const rows = stack[0]!.length;
  const cols = stack[0]![0]!.length;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => stack.reduce((s, g) => s + g[r]![c]!, 0) / stack.length),
  );
}
