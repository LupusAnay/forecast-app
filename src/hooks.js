import { useMemo } from "react";
import { RAIN_THRESHOLD, SEASONS } from "./config";
import { getObsTempKey, getFcTempKey } from "./utils";

function filterBySeason(rows, season) {
  if (!season || season === "all") return rows;
  const def = SEASONS.find(s => s.id === season);
  if (!def) return rows;
  const monthSet = new Set(def.months);
  return rows.filter(r => {
    const m = new Date(r.d + "T00:00:00").getMonth();
    return monthSet.has(m);
  });
}

export function useYearlyData(rawData, season) {
  return useMemo(() => {
    if (!rawData) return { yrs: [], yearRows: {} };
    const rows = filterBySeason(rawData.rows, season);
    const yrs = [...new Set(rows.map(r => r.y))].sort();
    const yearRows = {};
    for (const yr of yrs) {
      yearRows[yr] = rows.filter(r => r.y === yr).sort((a, b) => a.doy - b.doy);
    }
    return { yrs, yearRows };
  }, [rawData, season]);
}

function computeClimatology(rows, obsKey) {
  const byDoy = {};
  for (const r of rows) {
    if (r[obsKey] != null) {
      if (!byDoy[r.doy]) byDoy[r.doy] = [];
      byDoy[r.doy].push(r[obsKey]);
    }
  }
  const clim = {};
  for (const doy of Object.keys(byDoy)) {
    const vals = byDoy[doy];
    clim[doy] = vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return clim;
}

function computeACC(pairs, climByKey) {
  if (pairs.length < 3) return null;
  const fcAnom = [];
  const obsAnom = [];
  for (const p of pairs) {
    const climVal = climByKey[p.key];
    if (climVal == null) continue;
    fcAnom.push(p.fc - climVal);
    obsAnom.push(p.obs - climVal);
  }
  if (fcAnom.length < 3) return null;
  const n = fcAnom.length;
  const fcMean = fcAnom.reduce((a, b) => a + b, 0) / n;
  const obsMean = obsAnom.reduce((a, b) => a + b, 0) / n;
  let num = 0, fcVar = 0, obsVar = 0;
  for (let i = 0; i < n; i++) {
    const fd = fcAnom[i] - fcMean;
    const od = obsAnom[i] - obsMean;
    num += fd * od;
    fcVar += fd * fd;
    obsVar += od * od;
  }
  const denom = Math.sqrt(fcVar * obsVar);
  return denom > 0 ? num / denom : null;
}

export function useModelStats(rawData, model, variable, season) {
  return useMemo(() => {
    if (!rawData) return null;
    const modelKey = rawData.models?.[model];
    if (!modelKey) return null;

    const rows = filterBySeason(rawData.rows, season);
    const obsKey = getObsTempKey(variable);
    const fcKey = getFcTempKey(variable, modelKey);

    const yrs = [...new Set(rows.map(r => r.y))].sort();
    const clim = computeClimatology(rows, obsKey);

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
      const acc = computeACC(
        tPairs.map(r => ({ key: r.doy, fc: r[fcKey], obs: r[obsKey] })),
        clim
      );

      perYear[yr] = { tMAE, tRMSE, tBias, pMAE, acc, dayCount: tPairs.length };
    }

    const allTPairs = rows.filter(r => r[fcKey] != null && r[obsKey] != null);
    const allPPairs = rows.filter(r => r[`fp_${modelKey}`] != null && r.op != null);
    const overall = {
      tMAE: allTPairs.length ? allTPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / allTPairs.length : null,
      tRMSE: allTPairs.length ? Math.sqrt(allTPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]) ** 2, 0) / allTPairs.length) : null,
      tBias: allTPairs.length ? allTPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]), 0) / allTPairs.length : null,
      pMAE: allPPairs.length ? allPPairs.reduce((s, r) => s + Math.abs(r[`fp_${modelKey}`] - r.op), 0) / allPPairs.length : null,
      acc: computeACC(
        allTPairs.map(r => ({ key: r.doy, fc: r[fcKey], obs: r[obsKey] })),
        clim
      ),
      dayCount: allTPairs.length,
    };

    return { modelKey, obsKey, fcKey, yrs, perYear, overall };
  }, [rawData, model, variable, season]);
}

export function useAllModelStats(rawData, variable, season) {
  return useMemo(() => {
    if (!rawData) return [];
    const rows = filterBySeason(rawData.rows, season);
    const obsKey = getObsTempKey(variable);

    const clim = computeClimatology(rows, obsKey);

    return Object.entries(rawData.models).map(([modelId, key]) => {
      const fcKey = getFcTempKey(variable, key);
      const tPairs = rows.filter(r => r[fcKey] != null && r[obsKey] != null);
      const tMAE = tPairs.length ? tPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
      const tRMSE = tPairs.length ? Math.sqrt(tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]) ** 2, 0) / tPairs.length) : null;
      const tBias = tPairs.length ? tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
      const acc = computeACC(
        tPairs.map(r => ({ key: r.doy, fc: r[fcKey], obs: r[obsKey] })),
        clim
      );
      return { id: modelId, label: null, tMAE, tRMSE, tBias, acc, n: tPairs.length };
    });
  }, [rawData, variable, season]);
}

export function useRainStats(rawData, season) {
  return useMemo(() => {
    if (!rawData) return [];
    const rows = filterBySeason(rawData.rows, season);

    return Object.entries(rawData.models).map(([modelId, key]) => {
      const pPairs = rows.filter(r => r[`fp_${key}`] != null && r.op != null);
      let hits = 0, misses = 0, falseAlarms = 0, correctNegatives = 0;
      for (const r of pPairs) {
        const fcRain = r[`fp_${key}`] >= RAIN_THRESHOLD;
        const obsRain = r.op >= RAIN_THRESHOLD;
        if (fcRain && obsRain) hits++;
        else if (!fcRain && obsRain) misses++;
        else if (fcRain && !obsRain) falseAlarms++;
        else correctNegatives++;
      }
      const total = hits + misses + falseAlarms + correctNegatives;
      const pod = (hits + misses) > 0 ? hits / (hits + misses) : null;
      const far = (hits + falseAlarms) > 0 ? falseAlarms / (hits + falseAlarms) : null;
      const csi = (hits + misses + falseAlarms) > 0 ? hits / (hits + misses + falseAlarms) : null;
      const freqBias = (hits + misses) > 0 ? (hits + falseAlarms) / (hits + misses) : null;
      const hitsRandom = total > 0 ? (hits + misses) * (hits + falseAlarms) / total : 0;
      const ets = (hits + misses + falseAlarms - hitsRandom) > 0
        ? (hits - hitsRandom) / (hits + misses + falseAlarms - hitsRandom) : null;
      const hss = total > 0
        ? 2 * (hits * correctNegatives - misses * falseAlarms) /
          ((hits + misses) * (misses + correctNegatives) + (hits + falseAlarms) * (falseAlarms + correctNegatives) || 1)
        : null;
      const cyclistScore = (pod != null && far != null) ? pod * 0.7 + (1 - far) * 0.3 : null;

      return { id: modelId, pod, far, csi, ets, hss, freqBias, cyclistScore, hits, misses, falseAlarms, correctNegatives, rainDays: hits + misses, n: pPairs.length };
    });
  }, [rawData, season]);
}

export function useAllModelPrecipStats(rawData, season) {
  return useMemo(() => {
    if (!rawData) return [];
    const rows = filterBySeason(rawData.rows, season);

    return Object.entries(rawData.models).map(([modelId, key]) => {
      const pPairs = rows.filter(r => r[`fp_${key}`] != null && r.op != null);
      const pMAE = pPairs.length ? pPairs.reduce((s, r) => s + Math.abs(r[`fp_${key}`] - r.op), 0) / pPairs.length : null;
      const pRMSE = pPairs.length ? Math.sqrt(pPairs.reduce((s, r) => s + (r[`fp_${key}`] - r.op) ** 2, 0) / pPairs.length) : null;
      const pBias = pPairs.length ? pPairs.reduce((s, r) => s + (r[`fp_${key}`] - r.op), 0) / pPairs.length : null;
      return { id: modelId, label: null, pMAE, pRMSE, pBias, n: pPairs.length };
    });
  }, [rawData, season]);
}