/**
 * Single access point for the ERA5 January-2025 dataset that powers the
 * dashboard. All values are produced by scripts/prepare_era5.py directly from
 * the NetCDF source files in data/new/ — nothing here is synthetic.
 */
import metaJson from "@/data/era5/meta.json";
import hourlyJson from "@/data/era5/hourly.json";
import dailyJson from "@/data/era5/daily.json";
import gridsJson from "@/data/era5/grids.json";
import exposureJson from "@/data/era5/derived_exposure.json";

export type Meta = typeof metaJson;
export type Hourly = typeof hourlyJson;
export type DailyRow = (typeof dailyJson)["days"][number];
export type Grids = typeof gridsJson;
export type ExposureCell = (typeof exposureJson)["cells"][number];

export const meta = metaJson;
export const hourly = hourlyJson;
export const daily = dailyJson.days as DailyRow[];
export const grids = gridsJson;
export const exposure = exposureJson;

export const HOURLY_RAIN_GRID_URL = "/data/era5/hourly_rain_grid.json";

export function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDay(iso: string) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Month-wide summary statistics, computed from the hourly/daily series. */
export function monthSummary() {
  const rainTotal = daily.reduce((s, d) => s + d.rain_total_mm, 0);
  const wettest = daily.reduce((a, b) => (b.rain_total_mm > a.rain_total_mm ? b : a));
  const peakHourIdx = hourly.rain_max_mm.indexOf(Math.max(...hourly.rain_max_mm));
  const windPeakIdx = hourly.wind_max_ms.indexOf(Math.max(...hourly.wind_max_ms));
  return {
    rainTotal,
    wettest,
    peakHour: {
      time: hourly.times[peakHourIdx]!,
      value: hourly.rain_max_mm[peakHourIdx]!,
    },
    peakWind: {
      time: hourly.times[windPeakIdx]!,
      value: hourly.wind_max_ms[windPeakIdx]!,
    },
    tempMax: Math.max(...daily.map((d) => d.temp_max_c)),
    tempMin: Math.min(...daily.map((d) => d.temp_min_c)),
  };
}

/** Blue-teal ramp for rainfall, amber-red ramp for heat, used by the grid maps. */
export function ramp(value: number, min: number, max: number, kind: "rain" | "temp" | "wind") {
  const t = max <= min ? 0 : Math.min(1, Math.max(0, (value - min) / (max - min)));
  if (kind === "rain") return `oklch(${0.28 + t * 0.42} ${0.03 + t * 0.14} ${250 - t * 60} / ${0.25 + t * 0.75})`;
  if (kind === "temp") return `oklch(${0.45 + t * 0.35} ${0.05 + t * 0.16} ${255 - t * 200})`;
  return `oklch(${0.35 + t * 0.4} ${0.03 + t * 0.13} ${300 - t * 160})`;
}
