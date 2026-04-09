import { MODEL_IDS, LEAD_TIMES } from "./config";
import { toISODate } from "./utils";

export { MODEL_IDS };
import { MODEL_LABELS } from "./config";
export { MODEL_LABELS };

const CACHE_KEY = "forecast_verification_v2";
const CACHE_TTL = 12 * 60 * 60 * 1000;

const DAILY_PARAMS = "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum";

export function clearCache(lat, lon) {
  if (lat != null && lon != null) {
    localStorage.removeItem(CACHE_KEY + "_" + Math.round(lat * 10000) + "_" + Math.round(lon * 10000));
  } else {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(CACHE_KEY)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
}

function getCacheKey(lat, lon) {
  return CACHE_KEY + "_" + Math.round(lat * 10000) + "_" + Math.round(lon * 10000);
}

function getCachedData(lat, lon) {
  try {
    const raw = localStorage.getItem(getCacheKey(lat, lon));
    if (!raw) return null;
    const { timestamp, data } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(getCacheKey(lat, lon));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(lat, lon, data) {
  try {
    localStorage.setItem(getCacheKey(lat, lon), JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // storage full
  }
}

function modelKey(id) {
  return id.replace(/_/g, "");
}

function ensureRow(dateMap, d) {
  if (!dateMap[d]) {
    const dt = new Date(d + "T00:00:00");
    dateMap[d] = {
      d,
      y: dt.getFullYear(),
      doy: Math.floor((dt - new Date(dt.getFullYear(), 0, 0)) / 86400000),
    };
  }
  return dateMap[d];
}

function aggregateHourlyToDaily(hourlyTimes, hourlyValues) {
  const daily = {};
  for (let i = 0; i < hourlyTimes.length; i++) {
    if (hourlyValues[i] == null) continue;
    const day = hourlyTimes[i].slice(0, 10);
    if (!daily[day]) daily[day] = [];
    daily[day].push(hourlyValues[i]);
  }
  return daily;
}

function dailyMeans(hourlyTimes, hourlyValues) {
  const groups = aggregateHourlyToDaily(hourlyTimes, hourlyValues);
  const days = Object.keys(groups).sort();
  return { days, values: days.map(d => groups[d].length > 0 ? groups[d].reduce((a, b) => a + b, 0) / groups[d].length : null) };
}

function dailySums(hourlyTimes, hourlyValues) {
  const groups = aggregateHourlyToDaily(hourlyTimes, hourlyValues);
  const days = Object.keys(groups).sort();
  return { days, values: days.map(d => groups[d].reduce((a, b) => a + b, 0)) };
}

export async function fetchAllData(onProgress, location) {
  const lat = location?.lat ?? 41.7151;
  const lon = location?.lon ?? 44.8271;

  const cached = getCachedData(lat, lon);
  if (cached) {
    onProgress?.("Using cached data");
    return cached;
  }

  const today = new Date();
  const endDate = toISODate(today);
  const startDate = "2023-01-01";

  const allData = { models: {}, rows: [], previousRuns: {}, location: { lat, lon } };
  const dateMap = {};

  // 1. ERA5 reanalysis
  onProgress?.("Fetching ERA5 reanalysis...");
  const eraUrl = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=${DAILY_PARAMS}&models=era5&timezone=auto`;
  const eraResp = await fetch(eraUrl);
  const eraJson = await eraResp.json();
  const eraTimes = eraJson.daily?.time || [];
  for (let i = 0; i < eraTimes.length; i++) {
    const d = eraTimes[i];
    const row = ensureRow(dateMap, d);
    row.ot_mean = eraJson.daily.temperature_2m_mean?.[i];
    row.ot_max = eraJson.daily.temperature_2m_max?.[i];
    row.ot_min = eraJson.daily.temperature_2m_min?.[i];
    row.op = eraJson.daily.precipitation_sum?.[i];
  }

  // 2. Historical forecasts
  for (const m of MODEL_IDS) {
    const key = modelKey(m);
    allData.models[m] = key;

    onProgress?.(`Fetching ${MODEL_LABELS[m]}...`);
    try {
      const url = `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=${DAILY_PARAMS}&models=${m}&timezone=auto`;
      const resp = await fetch(url);
      const json = await resp.json();
      const times = json.daily?.time || [];
      for (let i = 0; i < times.length; i++) {
        const d = times[i];
        const row = ensureRow(dateMap, d);
        row[`ft_${key}_mean`] = json.daily.temperature_2m_mean?.[i];
        row[`ft_${key}_max`] = json.daily.temperature_2m_max?.[i];
        row[`ft_${key}_min`] = json.daily.temperature_2m_min?.[i];
        row[`fp_${key}`] = json.daily.precipitation_sum?.[i];
      }
    } catch (e) {
      console.warn(`Failed to fetch ${m}:`, e);
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // 3. Forward forecast (next 7 days)
  for (const m of MODEL_IDS) {
    const key = modelKey(m);
    onProgress?.(`Fetching live ${MODEL_LABELS[m]}...`);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=${DAILY_PARAMS}&models=${m}&timezone=auto`;
      const resp = await fetch(url);
      const json = await resp.json();
      const times = json.daily?.time || [];
      for (let i = 0; i < times.length; i++) {
        const d = times[i];
        const row = ensureRow(dateMap, d);
        const hasHistorical = row[`ft_${key}_mean`] != null || row[`ft_${key}_max`] != null || row[`ft_${key}_min`] != null || row[`fp_${key}`] != null;
        if (!hasHistorical) {
          row[`fwt_${key}_mean`] = json.daily.temperature_2m_mean?.[i];
          row[`fwt_${key}_max`] = json.daily.temperature_2m_max?.[i];
          row[`fwt_${key}_min`] = json.daily.temperature_2m_min?.[i];
          row[`fwp_${key}`] = json.daily.precipitation_sum?.[i];
        }
      }
    } catch (e) {
      console.warn(`Forward forecast ${m}:`, e);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // 4. Previous Runs API for lead-time skill
  const prevRunsVars = [
    "temperature_2m",
    "temperature_2m_previous_day1",
    "temperature_2m_previous_day2",
    "temperature_2m_previous_day3",
    "temperature_2m_previous_day5",
    "precipitation",
    "precipitation_previous_day1",
    "precipitation_previous_day2",
    "precipitation_previous_day3",
    "precipitation_previous_day5",
  ].join(",");

  for (const m of MODEL_IDS) {
    onProgress?.(`Fetching previous runs ${MODEL_LABELS[m]}...`);
    try {
      const url = `https://previous-runs-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${prevRunsVars}&models=${m}&timezone=auto&past_days=92`;
      const resp = await fetch(url);
      const json = await resp.json();
      const times = json.hourly?.time || [];

      const result = { dates: {}, model: m };

      const tempAgg = {};
      const precipAgg = {};

      for (const lt of LEAD_TIMES) {
        const varName = lt === 0 ? "temperature_2m" : `temperature_2m_previous_day${lt}`;
        const vals = json.hourly?.[varName] || [];
        const agg = dailyMeans(times, vals);
        tempAgg[lt] = agg;

        const precipVar = lt === 0 ? "precipitation" : `precipitation_previous_day${lt}`;
        const pVals = json.hourly?.[precipVar] || [];
        const pAgg = dailySums(times, pVals);
        precipAgg[lt] = pAgg;
      }

      const allDates = new Set();
      for (const lt of LEAD_TIMES) {
        tempAgg[lt].days.forEach(d => allDates.add(d));
      }

      for (const day of [...allDates].sort()) {
        const entry = {};
        for (const lt of LEAD_TIMES) {
          const idx = tempAgg[lt].days.indexOf(day);
          entry[`temp_day${lt}`] = idx >= 0 ? tempAgg[lt].values[idx] : null;
          const pidx = precipAgg[lt].days.indexOf(day);
          entry[`precip_day${lt}`] = pidx >= 0 ? precipAgg[lt].values[pidx] : null;
        }
        result.dates[day] = entry;
      }

      allData.previousRuns[m] = result;
    } catch (e) {
      console.warn(`Previous runs ${m}:`, e);
      allData.previousRuns[m] = { dates: {}, model: m };
    }
    await new Promise(r => setTimeout(r, 300));
  }

  allData.rows = Object.values(dateMap).sort((a, b) => a.d.localeCompare(b.d));

  onProgress?.("Done!");
  setCachedData(lat, lon, allData);
  return allData;
}