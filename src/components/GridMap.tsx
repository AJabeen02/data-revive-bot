import { useMemo, useState } from "react";
import { grids, ramp } from "@/lib/era5";

type Kind = "rain" | "temp" | "wind";

export function GridMap({
  field,
  kind,
  unit,
  decimals = 1,
}: {
  field: number[][];
  kind: Kind;
  unit: string;
  decimals?: number;
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const { min, max } = useMemo(() => {
    const flat = field.flat();
    return { min: Math.min(...flat), max: Math.max(...flat) };
  }, [field]);

  const lats = grids.latitude;
  const lons = grids.longitude;
  const elev = grids.terrain.elevation;

  return (
    <div>
      <div
        className="mx-auto grid max-w-[460px] gap-px rounded-md border border-border bg-grid-line p-px"
        style={{ gridTemplateColumns: `repeat(${lons.length}, minmax(0, 1fr))` }}
        onMouseLeave={() => setHover(null)}
      >
        {field.map((row, r) =>
          row.map((v, c) => (
            <button
              key={`${r}-${c}`}
              type="button"
              aria-label={`${lats[r]}°N ${lons[c]}°E: ${v} ${unit}`}
              onMouseEnter={() => setHover({ r, c })}
              onFocus={() => setHover({ r, c })}
              className="aspect-square transition-[outline] outline-0 focus-visible:outline-2 focus-visible:outline-primary"
              style={{
                backgroundColor: ramp(v, min, max, kind),
                outline: hover && hover.r === r && hover.c === c ? "2px solid var(--primary)" : undefined,
              }}
            />
          )),
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="mono-num">
            {min.toFixed(decimals)} {unit}
          </span>
          <span
            className="h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${ramp(min, min, max, kind)}, ${ramp((min + max) / 2, min, max, kind)}, ${ramp(max, min, max, kind)})`,
            }}
          />
          <span className="mono-num">
            {max.toFixed(decimals)} {unit}
          </span>
        </div>
        <span className="mono-num">
          {lats[lats.length - 1]}–{lats[0]}°N · {lons[0]}–{lons[lons.length - 1]}°E · 0.25° grid
        </span>
      </div>

      <div className="mt-3 min-h-[3.25rem] rounded-md border border-border bg-surface-raised px-3 py-2 text-xs">
        {hover ? (
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span className="mono-num">
              {lats[hover.r]}°N, {lons[hover.c]}°E
            </span>
            <span>
              Value:{" "}
              <span className="mono-num text-primary">
                {field[hover.r]![hover.c]!.toFixed(decimals)} {unit}
              </span>
            </span>
            <span>
              Elevation: <span className="mono-num">{elev[hover.r]![hover.c]} m</span>
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground">Point at a cell to read its measured value.</span>
        )}
      </div>
    </div>
  );
}
