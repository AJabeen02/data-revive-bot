import { createFileRoute } from "@tanstack/react-router";
import { formatHour, grids, meta } from "@/lib/era5";

const TITLE = "Data provenance — ERA5 January 2025 | SIH Geo-Climate";
const DESC =
  "Source files, variables, units, grid dimensions and missing-value counts for the ERA5 reanalysis dataset behind the dashboard.";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const t = grids.terrain.stats;
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Provenance</p>
        <h1 className="mt-2 text-3xl font-semibold">What this dashboard is built on</h1>
        <p className="mt-2 text-sm text-muted-foreground">{meta.dataset} — {meta.institution}.</p>
      </header>

      <section className="panel p-5">
        <h2 className="text-lg font-semibold">Source files</h2>
        <ul className="mono-num mt-3 space-y-1 text-sm text-muted-foreground">
          {meta.source_files.map((f) => (
            <li key={f}>data/new/{f}</li>
          ))}
        </ul>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Coverage</h2>
        <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <Row k="Period" v={`${formatHour(meta.time.start)} → ${formatHour(meta.time.end)} UTC`} />
          <Row k="Time steps" v={`${meta.time.steps} hourly (${meta.time.step_hours} h)`} />
          <Row
            k="Area"
            v={`${meta.grid.south}–${meta.grid.north}°N, ${meta.grid.west}–${meta.grid.east}°E`}
          />
          <Row k="Grid" v={`${meta.grid.rows} × ${meta.grid.cols} at ${meta.grid.resolution_deg}°`} />
          <Row k="Records" v={`${meta.records.toLocaleString("en-GB")} per variable-hour-cell`} />
          <Row k="Missing values" v={Object.values(meta.missing_values).every((n) => n === 0) ? "None" : "See table"} />
        </dl>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Variables</h2>
        <div className="mt-3 overflow-auto rounded-md border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-raised text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Meaning</th>
                <th className="px-3 py-2 font-medium">File units</th>
                <th className="px-3 py-2 font-medium">Shown as</th>
                <th className="px-3 py-2 text-right font-medium">Missing</th>
              </tr>
            </thead>
            <tbody>
              {meta.variables.map((v) => (
                <tr key={v.name} className="border-t border-border/60">
                  <td className="mono-num px-3 py-2 text-primary">{v.name}</td>
                  <td className="px-3 py-2">{v.label}</td>
                  <td className="mono-num px-3 py-2 text-muted-foreground">{v.source_units}</td>
                  <td className="mono-num px-3 py-2">{v.display_units}</td>
                  <td className="mono-num px-3 py-2 text-right">
                    {(meta.missing_values as Record<string, number>)[v.name] ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Terrain layer</h2>
        <p className="mt-1 text-sm text-muted-foreground">{meta.terrain.source}</p>
        <dl className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
          <Row k="Elevation range" v={`${t.elevation_min_m} – ${t.elevation_max_m} m`} />
          <Row k="Mean elevation" v={`${t.elevation_mean_m} m`} />
          <Row k="Maximum slope" v={`${t.slope_max_deg}°`} />
          <Row k="Max orographic lift" v={`${t.orographic_lift_max_ms} m/s`} />
        </dl>
      </section>

      <section className="panel mt-6 p-5">
        <h2 className="text-lg font-semibold">Open data endpoints</h2>
        <ul className="mono-num mt-3 space-y-2 text-sm">
          <li>
            <a className="text-primary hover:underline" href="/api/public/era5/summary">
              /api/public/era5/summary
            </a>
          </li>
          <li>
            <a className="text-primary hover:underline" href="/api/public/era5/daily">
              /api/public/era5/daily
            </a>
            <span className="text-muted-foreground"> ?date=2025-01-15</span>
          </li>
          <li>
            <a className="text-primary hover:underline" href="/data/era5/hourly_rain_grid.json">
              /data/era5/hourly_rain_grid.json
            </a>
            <span className="text-muted-foreground"> — 744 hourly rain grids</span>
          </li>
        </ul>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        No synthetic or gap-filled values are used anywhere in this dashboard. Unit conversions (m→mm, K→°C, Pa→hPa)
        are the only transformations applied to the original measurements.
      </p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
      <dd className="mono-num mt-1">{v}</dd>
    </div>
  );
}
