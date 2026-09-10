import { createFileRoute } from "@tanstack/react-router";
import { meta, daily, monthSummary } from "@/lib/era5";

export const Route = createFileRoute("/api/public/era5/summary")({
  server: {
    handlers: {
      GET: () => {
        const s = monthSummary();
        return Response.json({
          dataset: meta.dataset,
          source_files: meta.source_files,
          grid: meta.grid,
          time: meta.time,
          records: meta.records,
          missing_values: meta.missing_values,
          summary: {
            month_rain_total_mm: Number(s.rainTotal.toFixed(2)),
            wettest_day: s.wettest.date,
            peak_hourly_rain_mm: s.peakHour.value,
            peak_hourly_rain_time: s.peakHour.time,
            peak_wind_ms: s.peakWind.value,
            temp_max_c: s.tempMax,
            temp_min_c: s.tempMin,
            days: daily.length,
          },
        });
      },
    },
  },
});
