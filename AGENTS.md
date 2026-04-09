# AGENTS.md

## Build & run commands

- `npm install` — install dependencies
- `npm run dev` — start Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview production build locally

There is no linter or typechecker configured. Build errors are the only automated check.

## Project conventions

- **No component library** — all styling is inline `style={{}}` objects, no CSS files
- **Dark theme only** — background `#1a1a2e`, panels `#16213e`, accent `#e07a5f`, text `#e0e0e0`/`#888`/`#666`
- **Font** — JetBrains Mono, loaded via Google Fonts in `index.html`
- **State** — all global state lives in `App.jsx`, passed down as props. No context or state libraries.
- **Data flow** — `data.js` fetches from Open-Meteo APIs in parallel batches (ERA5 single, then 7 historical, 7 live, 7 previous-runs concurrently with group pauses). Caches merged result in localStorage (`forecast_verification_v2_{lat}_{lon}`), components receive `rawData` prop
- **Plotly** — imported as `plotly.js-dist-min`, used via `Plotly.react()` for updates. Zoom state is preserved across re-renders by saving/restoring axis ranges. Purge only on unmount.
- **Precipitation** — shown as cumulative sums in the overlay chart, not as daily values with rolling average
- **Lead time selector** — `Analysis` (Day 0) uses historical forecast analysis; `Day 1/2/3/5` uses Previous Runs API data for current year only. Past years always show analysis. Provides `leadTime` prop to YearOverlay as integer (0, 1, 2, 3, 5).
- **File naming** — PascalCase for components, camelCase for utilities

## Data structure

`rawData` from `fetchAllData()` has this shape:
```
{
  models: { "ecmwf_ifs": "ecmwfifs", ... },  // model id → short key
  rows: [ { d, y, doy, ot_mean, ot_max, ot_min, op, ft_ecmwfifs_mean, ft_ecmwfifs_max, ft_ecmwfifs_min, fp_ecmwfifs, fwt_*, fwp_*, ... } ],
  previousRuns: { "ecmwf_ifs": { dates: { "2026-01-01": { temp_day0, temp_day1, ..., precip_day0, ... } } } },
  location: { lat, lon }
}
```

Key helpers in `utils.js`:
- `getObsTempKey(variable)` → `"ot_mean"` | `"ot_max"` | `"ot_min"`
- `getFcTempKey(variable, modelKey)` → `"ft_ecmwfifs_mean"` etc.
- `getFwdTempKey(variable, modelKey)` → `"fwt_ecmwfifs_mean"` etc.

## When making changes

- Run `npm run build` to verify the project compiles
- Year colors are single strings in `config.js` (e.g. `2024: "#e07a5f"`), not objects
- The Previous Runs API uses variable name suffixes (`_previous_day3`), not query parameters
- ERA5 archive API **must** have `models=era5` — without it returns ECMWF IFS data silently
- Location is persisted in localStorage under `forecast_verification_location`
- Each location gets its own data cache key to avoid stale data after location changes