#!/usr/bin/env python3
"""
ERA5 (Jan 2025) preparation pipeline for the SIH Geo-Climate dashboard.

Source (NEW dataset, replaces SRTM/GPM/IMDAA/BharathBench):
  data/new/data_stream-oper_stepType-accum.nc     -> tp
  data/new/data_stream-oper_stepType-instant.nc   -> u10, v10, d2m, t2m, sp
  data/new/terrain_slope.nc                       -> elevation, slope, aspect,
                                                     orographic_lift_max, relief_class

Outputs (public/data/era5/*.json) contain ONLY values computed from the files
above. No synthetic, simulated or invented data is produced.

Unit conversions applied (documented, non-destructive):
  tp   m      -> mm    (x1000)
  t2m  K      -> degC  (-273.15)
  d2m  K      -> degC  (-273.15)
  sp   Pa     -> hPa   (/100)
  wind u10/v10 -> speed sqrt(u^2+v^2) m/s, direction (meteorological, deg)
"""

import json
import os

import numpy as np
import xarray as xr

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "data", "new")
OUT = os.path.join(BASE, "public", "data", "era5")
os.makedirs(OUT, exist_ok=True)

acc = xr.open_dataset(os.path.join(SRC, "data_stream-oper_stepType-accum.nc"))
ins = xr.open_dataset(os.path.join(SRC, "data_stream-oper_stepType-instant.nc"))
ter = xr.open_dataset(os.path.join(SRC, "terrain_slope.nc"))

lats = acc.latitude.values.astype(float)
lons = acc.longitude.values.astype(float)
times = acc.valid_time.values

tp = acc.tp.values * 1000.0            # mm / hour
t2m = ins.t2m.values - 273.15          # degC
d2m = ins.d2m.values - 273.15          # degC
sp = ins.sp.values / 100.0             # hPa
u10 = ins.u10.values
v10 = ins.v10.values
wspd = np.sqrt(u10**2 + v10**2)        # m/s
wdir = (270.0 - np.degrees(np.arctan2(v10, u10))) % 360.0

nt, ny, nx = tp.shape
r1 = lambda a: float(round(float(a), 1))
r2 = lambda a: float(round(float(a), 2))


def iso(t):
    return str(np.datetime_as_string(t, unit="h")) + ":00:00Z"


# ---------------------------------------------------------------- meta
missing = {
    v: int(np.isnan(a).sum())
    for v, a in [("tp", tp), ("t2m", t2m), ("d2m", d2m), ("sp", sp), ("u10", u10), ("v10", v10)]
}
meta = {
    "dataset": "ECMWF ERA5 hourly reanalysis on single levels",
    "source_files": [
        "data_stream-oper_stepType-accum.nc",
        "data_stream-oper_stepType-instant.nc",
        "terrain_slope.nc",
    ],
    "institution": str(acc.attrs.get("institution", "")),
    "conventions": str(acc.attrs.get("Conventions", "")),
    "grid": {
        "resolution_deg": 0.25,
        "rows": ny,
        "cols": nx,
        "north": r2(lats.max()),
        "south": r2(lats.min()),
        "west": r2(lons.min()),
        "east": r2(lons.max()),
        "leaflet_bounds": [[r2(lats.min()), r2(lons.min())], [r2(lats.max()), r2(lons.max())]],
    },
    "time": {
        "start": iso(times[0]),
        "end": iso(times[-1]),
        "steps": int(nt),
        "step_hours": 1,
    },
    "records": int(nt * ny * nx),
    "missing_values": missing,
    "variables": [
        {"name": "tp", "label": "Total precipitation", "source_units": "m", "display_units": "mm/h"},
        {"name": "t2m", "label": "2 m temperature", "source_units": "K", "display_units": "\u00b0C"},
        {"name": "d2m", "label": "2 m dew point", "source_units": "K", "display_units": "\u00b0C"},
        {"name": "sp", "label": "Surface pressure", "source_units": "Pa", "display_units": "hPa"},
        {"name": "u10", "label": "10 m U wind", "source_units": "m s**-1", "display_units": "m/s"},
        {"name": "v10", "label": "10 m V wind", "source_units": "m s**-1", "display_units": "m/s"},
    ],
    "terrain": {
        "title": str(ter.attrs.get("title", "")),
        "source": str(ter.attrs.get("source", "")),
    },
}

# ---------------------------------------------------------------- hourly series
hourly = {
    "times": [iso(t) for t in times],
    "rain_mean_mm": [r2(x) for x in tp.mean(axis=(1, 2))],
    "rain_max_mm": [r2(x) for x in tp.max(axis=(1, 2))],
    "temp_mean_c": [r1(x) for x in t2m.mean(axis=(1, 2))],
    "temp_max_c": [r1(x) for x in t2m.max(axis=(1, 2))],
    "dewpoint_mean_c": [r1(x) for x in d2m.mean(axis=(1, 2))],
    "wind_mean_ms": [r2(x) for x in wspd.mean(axis=(1, 2))],
    "wind_max_ms": [r2(x) for x in wspd.max(axis=(1, 2))],
    "pressure_mean_hpa": [r1(x) for x in sp.mean(axis=(1, 2))],
}

# ---------------------------------------------------------------- daily rollup
days = np.array([str(np.datetime_as_string(t, unit="D")) for t in times])
uniq = sorted(set(days.tolist()))
daily = []
daily_rain_grid, daily_temp_grid, daily_wind_grid = [], [], []
for d in uniq:
    m = days == d
    dtp, dt2, dws, dsp = tp[m], t2m[m], wspd[m], sp[m]
    daily.append(
        {
            "date": d,
            "rain_total_mm": r2(dtp.sum(axis=0).mean()),
            "rain_max_cell_mm": r2(dtp.sum(axis=0).max()),
            "rain_peak_hourly_mm": r2(dtp.max()),
            "temp_mean_c": r1(dt2.mean()),
            "temp_max_c": r1(dt2.max()),
            "temp_min_c": r1(dt2.min()),
            "wind_mean_ms": r2(dws.mean()),
            "wind_max_ms": r2(dws.max()),
            "pressure_mean_hpa": r1(dsp.mean()),
        }
    )
    daily_rain_grid.append(np.round(dtp.sum(axis=0), 2).tolist())
    daily_temp_grid.append(np.round(dt2.mean(axis=0), 1).tolist())
    daily_wind_grid.append(np.round(dws.mean(axis=0), 2).tolist())

# ---------------------------------------------------------------- terrain grid
terrain = {
    "latitude": [r2(x) for x in ter.latitude.values],
    "longitude": [r2(x) for x in ter.longitude.values],
    "elevation": np.round(ter.elevation.values, 1).tolist(),
    "slope": np.round(ter.slope.values, 4).tolist(),
    "aspect": np.round(ter.aspect.values, 1).tolist(),
    "orographic_lift_max": np.round(ter.orographic_lift_max.values, 5).tolist(),
    "relief_class": ter.relief_class.values.astype(int).tolist(),
    "stats": {
        "elevation_min_m": r1(np.nanmin(ter.elevation.values)),
        "elevation_max_m": r1(np.nanmax(ter.elevation.values)),
        "elevation_mean_m": r1(np.nanmean(ter.elevation.values)),
        "slope_max_deg": float(round(float(np.nanmax(ter.slope.values)), 4)),
        "orographic_lift_max_ms": float(round(float(np.nanmax(ter.orographic_lift_max.values)), 5)),
    },
}

# ---------------------------------------------------------------- grids bundle
grids = {
    "latitude": [r2(x) for x in lats],
    "longitude": [r2(x) for x in lons],
    "dates": uniq,
    "daily_rain_mm": daily_rain_grid,
    "daily_temp_c": daily_temp_grid,
    "daily_wind_ms": daily_wind_grid,
    "month_rain_total_mm": np.round(tp.sum(axis=0), 2).tolist(),
    "terrain": terrain,
}

# ---------------------------------------------------------------- hourly rain grid
hourly_rain = {
    "times": hourly["times"],
    "latitude": grids["latitude"],
    "longitude": grids["longitude"],
    "rain_mm": np.round(tp, 2).tolist(),
}

# ------------------------------------------------- derived exposure (real data only)
# Per grid cell, from measured January 2025 values + ERA5-derived terrain.
month_rain = tp.sum(axis=0)
peak_rain = tp.max(axis=0)
peak_wind = wspd.max(axis=0)
slope = ter.slope.values
lift = ter.orographic_lift_max.values
elev = ter.elevation.values


def norm(a):
    lo, hi = float(np.nanmin(a)), float(np.nanmax(a))
    return np.zeros_like(a, dtype=float) if hi <= lo else (a - lo) / (hi - lo)


exposure = 0.4 * norm(month_rain) + 0.25 * norm(peak_rain) + 0.2 * norm(slope) + 0.15 * norm(peak_wind)
cells = []
for i in range(ny):
    for j in range(nx):
        cells.append(
            {
                "lat": r2(lats[i]),
                "lon": r2(lons[j]),
                "month_rain_mm": r2(month_rain[i, j]),
                "peak_hourly_rain_mm": r2(peak_rain[i, j]),
                "peak_wind_ms": r2(peak_wind[i, j]),
                "elevation_m": r1(elev[i, j]),
                "slope_deg": float(round(float(slope[i, j]), 4)),
                "orographic_lift_ms": float(round(float(lift[i, j]), 5)),
                "exposure_index": float(round(float(exposure[i, j]), 3)),
            }
        )
derived = {
    "method": (
        "exposure_index = 0.40*norm(January 2025 total rainfall) + 0.25*norm(peak hourly rainfall) "
        "+ 0.20*norm(ERA5-derived terrain slope) + 0.15*norm(peak 10 m wind speed). "
        "Min-max normalised across the 23x19 grid. Derived indicator, not a forecast."
    ),
    "cells": cells,
}

for name, payload in [
    ("meta.json", meta),
    ("hourly.json", hourly),
    ("daily.json", {"days": daily}),
    ("grids.json", grids),
    ("hourly_rain_grid.json", hourly_rain),
    ("derived_exposure.json", derived),
]:
    p = os.path.join(OUT, name)
    with open(p, "w") as f:
        json.dump(payload, f, separators=(",", ":"))
    print(f"[ok] {name} {os.path.getsize(p)/1024:.0f} KB")
