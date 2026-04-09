export const DEFAULT_LAT = 41.7151;
export const DEFAULT_LON = 44.8271;
export const DEFAULT_LOCATION_NAME = "Tbilisi";
export const LAT = DEFAULT_LAT;
export const LON = DEFAULT_LON;
export const LOCATION_NAME = DEFAULT_LOCATION_NAME;

export const MODELS = [
  { id: "ecmwf_ifs", label: "ECMWF IFS", windy: true },
  { id: "gfs_global", label: "GFS", windy: true },
  { id: "icon_global", label: "ICON", windy: true },
  { id: "icon_eu", label: "ICON-EU", windy: true },
  { id: "meteofrance_arpege_world", label: "Météo-France", windy: false },
  { id: "jma_gsm", label: "JMA", windy: false },
  { id: "gem_global", label: "GEM", windy: false },
];

export const MODEL_IDS = MODELS.map(m => m.id);

export const MODEL_LABELS = {};
MODELS.forEach(m => { MODEL_LABELS[m.id] = m.label; });

export const YEAR_COLORS = {
  2023: "#d4a373",
  2024: "#e07a5f",
  2025: "#81b29a",
  2026: "#7fb8d8",
};

export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const MONTH_TICKS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
export const RAIN_THRESHOLD = 0.5;

export const VARIABLES = [
  { id: "temperature_2m_mean", label: "Mean" },
  { id: "temperature_2m_max", label: "Day High" },
  { id: "temperature_2m_min", label: "Night Low" },
];

export const SMOOTHING_OPTIONS = [1, 3, 7, 14, 30];

export const LEAD_TIMES = [0, 1, 2, 3, 5];

export const LEAD_TIME_OPTIONS = [
  { value: 0, label: "Analysis" },
  { value: 1, label: "Day 1" },
  { value: 2, label: "Day 2" },
  { value: 3, label: "Day 3" },
  { value: 5, label: "Day 5" },
];

export const SEASONS = [
  { id: "all", label: "All Year", months: null },
  { id: "DJF", label: "Winter (DJF)", months: [11, 0, 1] },
  { id: "MAM", label: "Spring (MAM)", months: [2, 3, 4] },
  { id: "JJA", label: "Summer (JJA)", months: [5, 6, 7] },
  { id: "SON", label: "Autumn (SON)", months: [8, 9, 10] },
];