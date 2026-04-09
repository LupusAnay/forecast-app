# Forecast Verification

Weather forecast accuracy dashboard comparing 7 NWP models against ERA5 reanalysis ground truth. Features a location selector — works for any city, not just Tbilisi.

## What it shows

- **Year overlay chart** — year-over-year temperature/precipitation with scroll-zoom, drag-pan, and range slider (zoom preserved across parameter changes)
- **Stats cards** — per-year MAE for selected model + variable
- **Year ranking** — years ranked warmest to coolest by ERA5 observations
- **Monthly tables** — temperature heatmap and precipitation totals by month × year
- **Temperature accuracy** — models ranked by MAE/RMSE/bias (responds to variable selector: mean, day high, night low)
- **Rain prediction skill** — cyclist score (70% detection + 30% precision), POD, FAR, CSI, rain bias
- **Forecast skill by lead time** — temperature MAE and rain POD degradation from Day 0–5 (~3 month rolling window)
- **Location search** — city search with geocoding + browser geolocation, persisted in localStorage

## Project structure

```
src/
  main.jsx                        — React entry
  App.jsx                         — Layout, state, tab routing
  config.js                       — Constants: location defaults, models, colors, thresholds
  data.js                         — API fetching, caching, data merging
  utils.js                        — rollingAvg, doyToLabel, tempColor, key helpers
  components/
    LocationSelector.jsx          — City search + geolocation button
    GlobalControls.jsx            — Model, smoothing, variable, tab selectors
    YearOverlay.jsx               — Main Plotly chart (year-over-year overlay)
    StatsCards.jsx                — Per-year MAE cards for selected model
    YearRanking.jsx               — Years ranked by observed climate
    TempAccuracy.jsx              — Models ranked by temperature MAE/RMSE/bias
    RainSkill.jsx                 — Models ranked by rain detection (cyclist score)
    MonthlyTemp.jsx               — Heatmap: mean temp by month × year
    MonthlyPrecip.jsx             — Table: total precip by month × year
    ForecastSkill.jsx             — Lead-time degradation (Previous Runs API)
.github/workflows/
  deploy.yml                      — Build + deploy to GitHub Pages on push
  collect.yml                     — Daily cron: archive forecast snapshots
scripts/
  collect-forecast.js             — Node script: fetch all models, save to data/snapshots/
data/snapshots/                   — Daily forecast JSON files (written by cron)
```

## Data sources (all Open-Meteo, no API key)

| API | Purpose | Notes |
|-----|---------|-------|
| Archive API `models=era5` | ERA5 reanalysis ground truth | Must pass `models=era5` explicitly |
| Historical Forecast API | Archived model predictions (2023–present) | One request per model |
| Forecast API | Live 7-day forecast | Shown as dotted lines |
| Previous Runs API | Lead-time verification (~3 month rolling) | Hourly data, aggregated to daily in code |

## Global selectors

All charts and tables respond simultaneously to:

- **Model** — which NWP model to display in the overlay and stats cards
- **Smoothing** — raw, 3d, 7d (default), 14d, 30d rolling average
- **Variable** — mean temp, day high, night low (affects temp-related panels only)
- **Tab** — temperature / precipitation view
- **Location** — search city name or use browser geolocation

## Run locally

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

1. Create a repo on GitHub (e.g. `forecast-app`)
2. Edit `vite.config.js` — set `base` to match your repo name:
   ```js
   base: '/forecast-app/',
   ```
3. Push:
   ```bash
   git init && git add -A && git commit -m "initial"
   git remote add origin git@github.com:YOU/forecast-app.git
   git branch -M main && git push -u origin main
   ```
4. In GitHub: Settings → Pages → Source → **GitHub Actions**
5. Site lives at `https://YOU.github.io/forecast-app/`

## Caveats

- ERA5 lags ~5 days behind present — recent observations may be null
- Previous Runs API has ~3 month rolling window — older lead-time data returns null
- Precipitation verification is inherently noisy at daily resolution
- Day 0 in ForecastSkill uses the model's own analysis as reference (ERA5 lags), so it's not independent verification
- ERA5 is 25km reanalysis, not station data

## Tech stack

- Vite + React 18 (SPA, no routing)
- Plotly.js for charts
- No component library — plain inline styles, CSS variables, JetBrains Mono
- Dark theme: `#1a1a2e` background, `#16213e` panels, `#e07a5f` accent