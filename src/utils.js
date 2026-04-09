import { MONTHS } from "./config";

export function rollingAvg(arr, w) {
  if (w <= 1) return arr;
  const half = Math.floor(w / 2);
  return arr.map((_, i) => {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
      if (arr[j] != null) { sum += arr[j]; n++; }
    }
    return n > 0 ? sum / n : null;
  });
}

export function doyToLabel(doy) {
  const d = new Date(2024, 0, 1);
  d.setDate(d.getDate() + doy - 1);
  return MONTHS[d.getMonth()] + " " + d.getDate();
}

export function tempColor(v) {
  if (v == null) return "#333";
  const t = Math.max(0, Math.min(1, (v + 5) / 35));
  return `rgb(${Math.round(60 + t * 195)},${Math.round(80 + (0.5 - Math.abs(t - 0.5)) * 2 * 100)},${Math.round(195 - t * 155)})`;
}

export function precipColor(v) {
  if (v == null) return "#333";
  const t = Math.min(1, v / 150);
  return `rgb(${Math.round(100 + (1 - t) * 100)},${Math.round(140 + t * 80)},${Math.round(180 + t * 75)})`;
}

export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

const TEMP_SUFFIX_MAP = {
  temperature_2m_mean: "mean",
  temperature_2m_max: "max",
  temperature_2m_min: "min",
};

function tempSuffix(variable) {
  return TEMP_SUFFIX_MAP[variable] || "mean";
}

export function getObsTempKey(variable) {
  return `ot_${tempSuffix(variable)}`;
}

export function getFcTempKey(variable, modelKey) {
  return `ft_${modelKey}_${tempSuffix(variable)}`;
}

export function getFwdTempKey(variable, modelKey) {
  return `fwt_${modelKey}_${tempSuffix(variable)}`;
}

export function formatBias(value) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}°`;
}

export function biasLabel(value) {
  if (value == null) return "";
  if (value > 0.05) return "warm";
  if (value < -0.05) return "cool";
  return "neutral";
}

export function biasColor(value) {
  if (value == null) return "#666";
  if (value > 0.05) return "#e07a5f";
  if (value < -0.05) return "#7fb8d8";
  return "#81b29a";
}

export function formatPrecipBias(value) {
  if (value == null) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)} mm`;
}

export function precipBiasLabel(value) {
  if (value == null) return "";
  if (value > 0.3) return "wet";
  if (value < -0.3) return "dry";
  return "neutral";
}

export function precipBiasColor(value) {
  if (value == null) return "#666";
  if (value > 0.3) return "#7fb8d8";
  if (value < -0.3) return "#e07a5f";
  return "#81b29a";
}

export function detectionColor(pod) {
  if (pod == null) return "#666";
  if (pod >= 0.8) return "#81b29a";
  if (pod >= 0.6) return "#f2cc8f";
  return "#e07a5f";
}

export function farColor(far) {
  if (far == null) return "#666";
  if (far <= 0.3) return "#81b29a";
  if (far <= 0.5) return "#f2cc8f";
  return "#e07a5f";
}

export function freqBiasColor(fb) {
  if (fb == null) return "#666";
  if (fb > 1.1) return "#7fb8d8";
  if (fb < 0.9) return "#e07a5f";
  return "#81b29a";
}

export function freqBiasLabel(fb) {
  if (fb == null) return "";
  if (fb > 1.05) return "wet";
  if (fb < 0.95) return "dry";
  return "neutral";
}