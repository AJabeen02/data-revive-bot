import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard } from "@/components/StatCard";
import { daily, formatDay, formatHour, hourly, meta, monthSummary } from "@/lib/era5";

const TITLE = "SIH Geo-Climate Intelligence — ERA5 January 2025";
const DESC =
  "Hourly ECMWF ERA5 reanalysis for South India (8–13.5°N, 76–80.5°E): rainfall, temperature, wind and pressure with daily summaries.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
    ],
  }),
  component: Overview,
});

const SERIES = [
  { key: "rain", label: "Rainfall", unit: "mm/h", hourlyKey: "rain_mean_mm", peakKey: "rain_max_mm" },
  { key: "temp", label: "Temperature", unit: "°C", hourlyKey: "temp_mean_c", peakKey: "temp_max_c" },
  { key: "wind", label: "10 m wind", unit: "m/s", hourlyKey: "wind_mean_ms", peakKey: "wind_max_ms" },
] as const;

function Overview() {
  const s = monthSummary();
  const [series, setSeries] = useState<(typeof SERIES)[number]>(SERIES[0]);
  const [dayIndex, setDayIndex] = useState<number | null>(null);

  const start = dayIndex === null ? 0 : dayIndex * 24;
  const end = dayIndex === null ? hourly.times.length : start + 24;
  const chartData = hourly.times.slice(start, end).map((t, i) => ({
    t,
    label: formatHour(t),
    mean: (hourly[series.hourlyKey] as number[])[start + i]!,
    peak: (hourly[series.peakKey] as number[])[start + i]!,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">ECMWF ERA5 reanalysis · hourly</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">South India climate intelligence</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {meta.time.steps} hourly steps from {formatHour(meta.time.start)} to {formatHour(meta.time.end)} UTC on a{" "}
          {meta.grid.rows}×{meta.grid.cols} grid at {meta.grid.resolution_deg}°. Every figure below is measured, not
          modelled.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Month rainfall"
          value={s.rainTotal.toFixed(1)}
          unit="mm"
          sub="Area-average total, January 2025"
          tag="tp"
        />
        <StatCard
          label="Peak hourly rain"
          value={s.peakHour.value.toFixed(2)}
          unit="mm/h"
          sub={`${formatHour(s.peakHour.time)} UTC`}
          tag="tp"
        />
        <StatCard
          label="Strongest 10 m wind"
          value={s.peakWind.value.toFixed(1)}
          unit="m/s"
          sub={`${formatHour(s.peakWind.time)} UTC`}
          tag="u10/v10"
        />
        <StatCard
          label="Temperature range"
          value={`${s.tempMin.toFixed(1)} – ${s.tempMax.toFixed(1)}`}
          unit="°C"
          sub="Grid minimum to maximum"
          tag="t2m"
        />
      </section>

      <section className="panel mt-6 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Hourly series</h2>
            <p className="text-xs text-muted-foreground">
              Area mean and grid maximum for each of the {meta.time.steps} hours.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {SERIES.map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setSeries(o)}
                className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                  o.key === series.key
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {o.label}
              </button>
            ))}
            <select
              value={dayIndex ?? ""}
              onChange={(e) => setDayIndex(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-md border border-border bg-surface-raised px-2 py-1.5 text-xs"
              aria-label="Zoom to one day"
            >
              <option value="">Whole month</option>
              {daily.map((d, i) => (
                <option key={d.date} value={i}>
                  {formatDay(d.date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="fillMean" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid-line)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                minTickGap={40}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={54}
                unit={` ${series.unit}`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(v: number, n) => [`${v} ${series.unit}`, n === "mean" ? "Area mean" : "Grid max"]}
              />
              <Area
                type="monotone"
                dataKey="mean"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#fillMean)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="peak"
                stroke="var(--accent)"
                strokeWidth={1}
                fill="none"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Daily summary</h2>
          <p className="text-xs text-muted-foreground">Each of the 31 days rolled up from its 24 hourly steps.</p>
          <div className="mt-4 max-h-96 overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-surface-raised text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Rain (mm)</th>
                  <th className="px-3 py-2 text-right font-medium">Wettest cell</th>
                  <th className="px-3 py-2 text-right font-medium">Temp min/max</th>
                  <th className="px-3 py-2 text-right font-medium">Wind max</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => (
                  <tr key={d.date} className="border-t border-border/60 hover:bg-secondary/50">
                    <td className="px-3 py-2">{formatDay(d.date)}</td>
                    <td className="mono-num px-3 py-2 text-right">{d.rain_total_mm.toFixed(2)}</td>
                    <td className="mono-num px-3 py-2 text-right">{d.rain_max_cell_mm.toFixed(2)}</td>
                    <td className="mono-num px-3 py-2 text-right">
                      {d.temp_min_c.toFixed(1)} / {d.temp_max_c.toFixed(1)}
                    </td>
                    <td className="mono-num px-3 py-2 text-right">{d.wind_max_ms.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Daily rainfall rhythm</h2>
          <p className="text-xs text-muted-foreground">
            Area-average daily total (mm). Wettest day: {formatDay(s.wettest.date)} at{" "}
            {s.wettest.rain_total_mm.toFixed(2)} mm.
          </p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="var(--grid-line)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(8)}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} mm`, "Area mean"]}
                />
                <Line
                  type="monotone"
                  dataKey="rain_total_mm"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
