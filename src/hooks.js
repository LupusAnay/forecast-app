import { useMemo } from "react";
import { RAIN_THRESHOLD } from "./config";
import { getObsTempKey, getFcTempKey } from "./utils";

export function useYearlyData(rawData) {
  return useMemo(() => {
    if (!rawData) return { yrs: [], yearRows: {} };
    const rows = rawData.rows;
    const yrs = [...new Set(rows.map(r => r.y))].sort();
    const yearRows = {};
    for (const yr of yrs) {
      yearRows[yr] = rows.filter(r => r.y === yr).sort((a, b) => a.doy - b.doy);
    }
    return { yrs, yearRows };
  }, [rawData]);
}

export function useModelStats(rawData, model, variable) {
  return useMemo(() => {
    if (!rawData) return null;
    const modelKey = rawData.models?.[model];
    if (!modelKey) return null;

    const rows = rawData.rows;
    const obsKey = getObsTempKey(variable);
    const fcKey = getFcTempKey(variable, modelKey);

    const yrs = [...new Set(rows.map(r => r.y))].sort();
    const perYear = {};
    for (const yr of yrs) {
      const yrRows = rows.filter(r => r.y === yr);
      const tPairs = yrRows.filter(r => r[fcKey] != null && r[obsKey] != null);
      const pPairs = yrRows.filter(r => r[`fp_${modelKey}`] != null && r.op != null);

      const tMAE = tPairs.length
        ? tPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / tPairs.length
        : null;
      const tRMSE = tPairs.length
        ? Math.sqrt(tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]) ** 2, 0) / tPairs.length)
        : null;
      const tBias = tPairs.length
        ? tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]), 0) / tPairs.length
        : null;
      const pMAE = pPairs.length
        ? pPairs.reduce((s, r) => s + Math.abs(r[`fp_${modelKey}`] - r.op), 0) / pPairs.length
        : null;

      perYear[yr] = { tMAE, tRMSE, tBias, pMAE, dayCount: tPairs.length };
    }

    const allTPairs = rows.filter(r => r[fcKey] != null && r[obsKey] != null);
    const allPPairs = rows.filter(r => r[`fp_${modelKey}`] != null && r.op != null);
    const overall = {
      tMAE: allTPairs.length ? allTPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / allTPairs.length : null,
      tRMSE: allTPairs.length ? Math.sqrt(allTPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]) ** 2, 0) / allTPairs.length) : null,
      tBias: allTPairs.length ? allTPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]), 0) / allTPairs.length : null,
      pMAE: allPPairs.length ? allPPairs.reduce((s, r) => s + Math.abs(r[`fp_${modelKey}`] - r.op), 0) / allPPairs.length : null,
      dayCount: allTPairs.length,
    };

    return { modelKey, obsKey, fcKey, yrs, perYear, overall };
  }, [rawData, model, variable]);
}

export function useAllModelStats(rawData, variable) {
  return useMemo(() => {
    if (!rawData) return [];
    const rows = rawData.rows;
    const obsKey = getObsTempKey(variable);

    return Object.entries(rawData.models).map(([modelId, key]) => {
      const fcKey = getFcTempKey(variable, key);
      const tPairs = rows.filter(r => r[fcKey] != null && r[obsKey] != null);
      const tMAE = tPairs.length ? tPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
      const tRMSE = tPairs.length ? Math.sqrt(tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]) ** 2, 0) / tPairs.length) : null;
      const tBias = tPairs.length ? tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
      return { id: modelId, label: null, tMAE, tRMSE, tBias, n: tPairs.length };
    });
  }, [rawData, variable]);
}

export function useRainStats(rawData) {
  return useMemo(() => {
    if (!rawData) return [];
    const rows = rawData.rows;

    return Object.entries(rawData.models).map(([modelId, key]) => {
      const pPairs = rows.filter(r => r[`fp_${key}`] != null && r.op != null);
      let hits = 0, misses = 0, falseAlarms = 0;
      for (const r of pPairs) {
        const fcRain = r[`fp_${key}`] >= RAIN_THRESHOLD;
        const obsRain = r.op >= RAIN_THRESHOLD;
        if (fcRain && obsRain) hits++;
        else if (!fcRain && obsRain) misses++;
        else if (fcRain && !obsRain) falseAlarms++;
      }
      const pod = (hits + misses) > 0 ? hits / (hits + misses) : null;
      const far = (hits + falseAlarms) > 0 ? falseAlarms / (hits + falseAlarms) : null;
      const csi = (hits + misses + falseAlarms) > 0 ? hits / (hits + misses + falseAlarms) : null;
      const freqBias = (hits + misses) > 0 ? (hits + falseAlarms) / (hits + misses) : null;
      const cyclistScore = (pod != null && far != null) ? pod * 0.7 + (1 - far) * 0.3 : null;

      return { id: modelId, pod, far, csi, freqBias, cyclistScore, hits, misses, falseAlarms, rainDays: hits + misses, n: pPairs.length };
    });
  }, [rawData]);
}