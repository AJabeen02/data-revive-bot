import { createFileRoute } from "@tanstack/react-router";
import { daily, meta } from "@/lib/era5";

export const Route = createFileRoute("/api/public/era5/daily")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const date = new URL(request.url).searchParams.get("date");
        const rows = date ? daily.filter((d) => d.date === date) : daily;
        if (date && rows.length === 0) {
          return Response.json({ error: "No record for that date in the dataset." }, { status: 404 });
        }
        return Response.json({ source: meta.dataset, units: { rain: "mm", temp: "degC", wind: "m/s", pressure: "hPa" }, days: rows });
      },
    },
  },
});
