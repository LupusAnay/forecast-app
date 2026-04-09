import { useRef, useEffect, useMemo } from "react";
import Plotly from "plotly.js-dist-min";
import { YEAR_COLORS, MONTHS, SEASONS } from "../config";
import { rollingAvg, doyToLabel, getObsTempKey, getFcTempKey, getFwdTempKey } from "../utils";
import Panel from "./Panel";

function cumulativeSum(arr) {
  let cum = 0;
  return arr.map(v => {
    if (v == null) return null;
    cum += v;
    return cum;
  });
}

const SEASON_DOF_RANGES = {
  MAM: [60, 152],
  JJA: [152, 244],
  SON: [244, 335],
};

const SEASON_MONTH_INDICES = {
  MAM: [2, 3, 4],
  JJA: [5, 6, 7],
  SON: [8, 9, 10],
  DJF: [11, 0, 1],
};

const MONTH_TICKS_BASE = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

function filterRowsBySeason(rows, season) {
  if (!season || season === "all") return { rows, offset: 0 };
  const def = SEASONS.find(s => s.id === season);
  if (!def || !def.months) return { rows, offset: 0 };
  const monthSet = new Set(def.months);
  const isDJF = season === "DJF";
  const offset = isDJF ? -365 : 0;
  const filtered = rows.filter(r => {
    const m = new Date(r.d + "T00:00:00").getMonth();
    return monthSet.has(m);
  });
  if (isDJF) {
    const mapped = filtered.map(r => {
      const isDec = new Date(r.d + "T00:00:00").getMonth() === 11;
      return { ...r, doy: isDec ? r.doy - 365 : r.doy };
    });
    return { rows: mapped, offset };
  }
  return { rows: filtered, offset: 0 };
}

export default function YearOverlay({ rawData, model, smoothing, variable, tab, leadTime, season }) {
  const ref = useRef(null);
  const modelKey = rawData?.models?.[model];
  const isTemp = tab === "temp";
  const seasonLabel = SEASONS.find(s => s.id === season)?.label || "All Year";

  const { traces, xAxisConfig } = useMemo(() => {
    if (!rawData || !modelKey) return { traces: [], xAxisConfig: null };
    const allRows = rawData.rows;
    const { rows, offset } = filterRowsBySeason(allRows, season);
    if (!rows.length) return { traces: [], xAxisConfig: null };
    const yrs = [...new Set(rows.map(r => r.y))].sort();
    const allTraces = [];
    const obsKey = getObsTempKey(variable);
    const fcKey = getFcTempKey(variable, modelKey);
    const fwdKey = getFwdTempKey(variable, modelKey);
    const currentYear = new Date().getFullYear();
    const prevRuns = rawData.previousRuns?.[model];
    const useLeadTime = leadTime > 0 && prevRuns;

    for (const yr of yrs) {
      const yrRows = rows.filter(r => r.y === yr).sort((a, b) => a.doy - b.doy);
      const doys = yrRows.map(r => r.doy);
      const c = YEAR_COLORS[yr] || "#999";

      const fcRaw = yrRows.map(r => isTemp ? r[fcKey] : r[`fp_${modelKey}`]);
      const obsRaw = yrRows.map(r => isTemp ? r[obsKey] : r.op);
      const fwdRaw = yrRows.map(r => isTemp ? r[fwdKey] : r[`fwp_${modelKey}`]);

      if (useLeadTime && yr === currentYear) {
        const ltTempKey = `temp_day${leadTime}`;
        const ltPrecipKey = `precip_day${leadTime}`;
        const analysisFcVal = [];
        const predictionFcVal = [];

        for (let i = 0; i < yrRows.length; i++) {
          const row = yrRows[i];
          const prevEntry = prevRuns.dates?.[row.d];
          const ltVal = prevEntry ? (isTemp ? prevEntry[ltTempKey] : prevEntry[ltPrecipKey]) : null;

          if (ltVal != null) {
            analysisFcVal.push(null);
            predictionFcVal.push(ltVal);
          } else {
            analysisFcVal.push(isTemp ? row[fcKey] : row[`fp_${modelKey}`]);
            predictionFcVal.push(null);
          }
        }

        if (isTemp) {
          allTraces.push({ x: doys, y: rollingAvg(analysisFcVal, smoothing), name: yr + " analysis", color: c, dash: "dash", legendgroup: String(yr), showlegend: false });
          allTraces.push({ x: doys, y: rollingAvg(predictionFcVal, smoothing), name: yr + ` day${leadTime} prediction`, color: c, dash: "dot", legendgroup: String(yr), showlegend: false });
        } else {
          allTraces.push({ x: doys, y: cumulativeSum(analysisFcVal), name: yr + " analysis", color: c, dash: "dash", legendgroup: String(yr), showlegend: false });
          allTraces.push({ x: doys, y: cumulativeSum(predictionFcVal), name: yr + ` day${leadTime} prediction`, color: c, dash: "dot", legendgroup: String(yr), showlegend: false });
        }
      } else {
        if (isTemp) {
          allTraces.push({ x: doys, y: rollingAvg(fcRaw, smoothing), name: yr + " forecast", color: c, dash: "dash", legendgroup: String(yr), showlegend: false });
        } else {
          allTraces.push({ x: doys, y: cumulativeSum(fcRaw), name: yr + " forecast", color: c, dash: "dash", legendgroup: String(yr), showlegend: false });
        }
      }

      if (isTemp) {
        allTraces.push({ x: doys, y: rollingAvg(obsRaw, smoothing), name: String(yr), color: c, dash: "solid", legendgroup: String(yr), showlegend: true });
      } else {
        allTraces.push({ x: doys, y: cumulativeSum(obsRaw), name: String(yr), color: c, dash: "solid", legendgroup: String(yr), showlegend: true });
      }

      if (fwdRaw.some(v => v != null)) {
        const lastHistFc = useLeadTime && yr === currentYear
          ? yrRows.map(r => {
              const prevEntry = prevRuns.dates?.[r.d];
              const ltVal = prevEntry ? (isTemp ? prevEntry[`temp_day${leadTime}`] : prevEntry[`precip_day${leadTime}`]) : null;
              return ltVal != null ? ltVal : (isTemp ? r[fcKey] : r[`fp_${modelKey}`]);
            })
          : fcRaw;

        if (isTemp) {
          const lastHistIdx = lastHistFc.reduce((li, v, i) => v != null ? i : li, -1);
          const conn = [...fwdRaw];
          if (lastHistIdx >= 0) conn[lastHistIdx] = lastHistFc[lastHistIdx];
          allTraces.push({ x: doys, y: conn, name: yr + " live forecast", color: c, dash: "dot", width: 2.5, opacity: 0.5, legendgroup: String(yr), showlegend: false });
        } else {
          const lastFcCum = cumulativeSum(lastHistFc);
          const lastFcIdx = lastHistFc.reduce((li, v, i) => v != null ? i : li, -1);
          const baseCum = lastFcIdx >= 0 ? (lastFcCum[lastFcIdx] ?? 0) : 0;
          let fwdCum = 0;
          const fwdCumValues = fwdRaw.map((v, i) => {
            if (v == null) return null;
            if (i <= lastFcIdx) return lastFcCum[i] ?? null;
            fwdCum += v;
            return baseCum + fwdCum;
          });
          allTraces.push({ x: doys, y: fwdCumValues, name: yr + " live forecast", color: c, dash: "dot", width: 2.5, opacity: 0.5, legendgroup: String(yr), showlegend: false });
        }
      }
    }

    let xCfg;
    if (season && season !== "all" && SEASON_DOF_RANGES[season]) {
      const [start, end] = SEASON_DOF_RANGES[season];
      const mi = SEASON_MONTH_INDICES[season];
      const ticks = mi.map(m => MONTH_TICKS_BASE[m]);
      const labels = mi.map(m => MONTHS[m]);
      xCfg = { range: [start - 5, end + 5], tickvals: ticks, ticktext: labels };
    } else if (season === "DJF") {
      const ticks = [-365 + 335, -365 + 365, 1, 32, 59 + 5];
      const labels = ["Dec", "Jan", "Feb", "Mar"];
      xCfg = { range: [ticks[0] - 5, ticks[ticks.length - 1] + 5], tickvals: ticks, ticktext: labels };
    } else {
      xCfg = null;
    }

    return { traces: allTraces, xAxisConfig: xCfg };
  }, [rawData, modelKey, variable, smoothing, isTemp, leadTime, season]);

  const legendNote = useMemo(() => {
    let note = "";
    if (leadTime > 0) {
      note = isTemp
        ? "Solid = ERA5 observed. Dashed = analysis (where no prediction data). Dotted = predicted " + leadTime + "d ahead (Previous Runs API). Semi-transparent = live forecast (not yet observed)."
        : "Solid = ERA5 observed (cumulative). Dashed = analysis (cumulative). Dotted = predicted " + leadTime + "d ahead (cumulative). Semi-transparent = live forecast.";
    } else {
      note = isTemp
        ? "Solid = ERA5 reanalysis (ground truth). Dashed = historical forecast. Semi-transparent = live 7-day forecast."
        : "Solid = ERA5 observed (cumulative). Dashed = forecast (cumulative). Semi-transparent = live 7-day forecast.";
    }
    if (season && season !== "all") note += " Showing " + seasonLabel + ".";
    return note;
  }, [leadTime, isTemp, season, seasonLabel]);

  useEffect(() => {
    if (!ref.current || !traces.length) return;

    const unit = isTemp ? "°C" : " mm";
    const yTitle = isTemp ? "°C" : "cumulative mm";

    const plotTraces = traces.map(s => ({
      x: s.x, y: s.y, name: s.name, type: "scatter", mode: "lines",
      line: { color: s.color, width: s.width || 1.8, dash: s.dash || "solid" },
      opacity: s.opacity ?? 1,
      hovertemplate: "%{text}: %{y:.1f}" + unit + "<extra>" + s.name + "</extra>",
      text: s.x.map(doy => doyToLabel(doy + (doy < 0 ? 365 : 0))),
      showlegend: s.showlegend !== false,
      legendgroup: s.legendgroup,
    }));

    const todayDoy = (() => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 0); return Math.floor((now - start) / 86400000); })();

    const baseXAxis = {
      gridcolor: "#1f2f4f", zerolinecolor: "#1f2f4f",
      rangeslider: { bgcolor: "#111827", bordercolor: "#333", thickness: 0.08 },
    };

    let xaxis;
    if (xAxisConfig) {
      xaxis = {
        ...baseXAxis,
        autorange: false,
        range: xAxisConfig.range,
        tickvals: xAxisConfig.tickvals,
        ticktext: xAxisConfig.ticktext,
      };
    } else {
      xaxis = {
        ...baseXAxis,
        autorange: true,
        tickvals: MONTH_TICKS_BASE,
        ticktext: MONTHS,
      };
    }

    const layout = {
      paper_bgcolor: "#16213e", plot_bgcolor: "#16213e",
      font: { family: "JetBrains Mono, monospace", color: "#aaa", size: 11 },
      margin: { l: 50, r: 20, t: 10, b: 60 }, height: 420,
      xaxis,
      yaxis: { title: yTitle, gridcolor: "#1f2f4f", zerolinecolor: "#1f2f4f" },
      legend: { bgcolor: "rgba(0,0,0,0)", font: { size: 10 }, orientation: "h", y: -0.28 },
      dragmode: "zoom", hovermode: "x unified",
      uirevision: season || "all",
      shapes: season && season !== "all" ? [] : [{ type: "line", x0: todayDoy, x1: todayDoy, y0: 0, y1: 1, yref: "paper", line: { color: "#e07a5f44", width: 1, dash: "dot" } }],
      annotations: season && season !== "all" ? [] : [{ x: todayDoy, y: 1, yref: "paper", text: "today", showarrow: false, font: { color: "#e07a5f88", size: 9 }, yanchor: "bottom" }],
    };

    const config = {
      displayModeBar: true, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toImage"],
      displaylogo: false, responsive: true, scrollZoom: true,
    };

    Plotly.react(ref.current, plotTraces, layout, config);
  }, [traces, isTemp, xAxisConfig]);

  useEffect(() => {
    return () => { if (ref.current) { try { Plotly.purge(ref.current); } catch(e) {} } };
  }, []);

  return (
    <Panel style={{ borderRadius: 8, padding: 8, marginBottom: 14 }}>
      <div ref={ref} style={{ width: "100%" }} />
      <p style={{ fontSize: 10, color: "#444", lineHeight: 1.6, margin: "8px 0 0" }}>
        {legendNote}
      </p>
    </Panel>
  );
}