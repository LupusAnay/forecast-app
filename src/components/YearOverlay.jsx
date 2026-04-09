import { useRef, useEffect } from "react";
import Plotly from "plotly.js-dist-min";
import { YEAR_COLORS, MONTH_TICKS, MONTHS } from "../config";
import { rollingAvg, doyToLabel, getObsTempKey, getFcTempKey, getFwdTempKey } from "../utils";

function cumulativeSum(arr) {
  let cum = 0;
  return arr.map(v => {
    if (v == null) return null;
    cum += v;
    return cum;
  });
}

export default function YearOverlay({ rawData, model, smoothing, variable, tab, leadTime }) {
  const ref = useRef(null);
  const modelKey = rawData?.models?.[model];
  const isTemp = tab === "temp";

  const traces = (() => {
    if (!rawData || !modelKey) return [];
    const rows = rawData.rows;
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

      // Build forecast trace (may be split into two segments for current year + lead time)
      if (useLeadTime && yr === currentYear) {
        // Split current year forecast into: analysis (old dates) + prediction (recent dates from previous runs)
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
          // Analysis segment (dashed, where no lead-time data)
          allTraces.push({ x: doys, y: rollingAvg(analysisFcVal, smoothing), name: yr + " analysis", color: c, dash: "dash", legendgroup: yr + "fc" });
          // Prediction segment (dotted, actual N-day-ahead forecast)
          allTraces.push({ x: doys, y: rollingAvg(predictionFcVal, smoothing), name: yr + ` day${leadTime} prediction`, color: c, dash: "dot", legendgroup: yr + "fcpred" });
        } else {
          allTraces.push({ x: doys, y: cumulativeSum(analysisFcVal), name: yr + " analysis", color: c, dash: "dash", legendgroup: yr + "fc" });
          allTraces.push({ x: doys, y: cumulativeSum(predictionFcVal), name: yr + ` day${leadTime} prediction`, color: c, dash: "dot", legendgroup: yr + "fcpred" });
        }
      } else {
        // Past years or analysis mode: regular forecast trace
        if (isTemp) {
          allTraces.push({ x: doys, y: rollingAvg(fcRaw, smoothing), name: yr + " forecast", color: c, dash: "dash", legendgroup: yr + "fc" });
        } else {
          allTraces.push({ x: doys, y: cumulativeSum(fcRaw), name: yr + " forecast", color: c, dash: "dash", legendgroup: yr + "fc" });
        }
      }

      // Observed (always solid)
      if (isTemp) {
        allTraces.push({ x: doys, y: rollingAvg(obsRaw, smoothing), name: yr + " observed", color: c, dash: "solid", legendgroup: yr + "obs" });
      } else {
        allTraces.push({ x: doys, y: cumulativeSum(obsRaw), name: yr + " observed", color: c, dash: "solid", legendgroup: yr + "obs" });
      }

      // Forward (live 7-day) forecast — semi-transparent for current year only
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
          allTraces.push({ x: doys, y: conn, name: yr + " live forecast", color: c, dash: "dot", width: 2.5, opacity: 0.5, legendgroup: yr + "fwd" });
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
          allTraces.push({ x: doys, y: fwdCumValues, name: yr + " live forecast", color: c, dash: "dot", width: 2.5, opacity: 0.5, legendgroup: yr + "fwd" });
        }
      }
    }
    return allTraces;
  })();

  const legendNote = (() => {
    if (leadTime > 0) {
      return isTemp
        ? "Solid = ERA5 observed. Dashed = analysis (where no prediction data). Dotted = predicted " + leadTime + "d ahead (Previous Runs API). Semi-transparent = live forecast (not yet observed)."
        : "Solid = ERA5 observed (cumulative). Dashed = analysis (cumulative). Dotted = predicted " + leadTime + "d ahead (cumulative). Semi-transparent = live forecast.";
    }
    return isTemp
      ? "Solid = ERA5 reanalysis (ground truth). Dashed = historical forecast. Semi-transparent = live 7-day forecast."
      : "Solid = ERA5 observed (cumulative). Dashed = forecast (cumulative). Semi-transparent = live 7-day forecast.";
  })();

  useEffect(() => {
    if (!ref.current || !traces.length) return;

    const unit = isTemp ? "°C" : " mm";
    const yTitle = isTemp ? "°C" : "cumulative mm";

    const plotTraces = traces.map(s => ({
      x: s.x, y: s.y, name: s.name, type: "scatter", mode: "lines",
      line: { color: s.color, width: s.width || 1.8, dash: s.dash || "solid" },
      opacity: s.opacity ?? 1,
      hovertemplate: "%{text}: %{y:.1f}" + unit + "<extra>" + s.name + "</extra>",
      text: s.x.map(doy => doyToLabel(doy)),
      showlegend: s.showlegend !== false,
      legendgroup: s.legendgroup,
    }));

    const todayDoy = (() => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 0); return Math.floor((now - start) / 86400000); })();

    const layout = {
      paper_bgcolor: "#16213e", plot_bgcolor: "#16213e",
      font: { family: "JetBrains Mono, monospace", color: "#aaa", size: 11 },
      margin: { l: 50, r: 20, t: 10, b: 60 }, height: 420,
      xaxis: {
        tickvals: MONTH_TICKS, ticktext: MONTHS,
        gridcolor: "#1f2f4f", zerolinecolor: "#1f2f4f",
        rangeslider: { bgcolor: "#111827", bordercolor: "#333", thickness: 0.08 },
      },
      yaxis: { title: yTitle, gridcolor: "#1f2f4f", zerolinecolor: "#1f2f4f" },
      legend: { bgcolor: "rgba(0,0,0,0)", font: { size: 10 }, orientation: "h", y: -0.28 },
      dragmode: "zoom", hovermode: "x unified",
      shapes: [{ type: "line", x0: todayDoy, x1: todayDoy, y0: 0, y1: 1, yref: "paper", line: { color: "#e07a5f44", width: 1, dash: "dot" } }],
      annotations: [{ x: todayDoy, y: 1, yref: "paper", text: "today", showarrow: false, font: { color: "#e07a5f88", size: 9 }, yanchor: "bottom" }],
    };

    const config = {
      displayModeBar: true, modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toImage"],
      displaylogo: false, responsive: true, scrollZoom: true,
    };

    let savedXRange, savedYRange;
    try {
      const el = ref.current;
      savedXRange = el._fullLayout?.xaxis?.range;
      savedYRange = el._fullLayout?.yaxis?.range;
    } catch {}

    Plotly.react(ref.current, plotTraces, layout, config);

    if (savedXRange || savedYRange) {
      const relayoutUpdate = {};
      if (savedXRange) relayoutUpdate["xaxis.range"] = savedXRange;
      if (savedYRange) relayoutUpdate["yaxis.range"] = savedYRange;
      Plotly.relayout(ref.current, relayoutUpdate);
    }
  }, [traces, tab]);

  useEffect(() => {
    return () => { if (ref.current) { try { Plotly.purge(ref.current); } catch(e) {} } };
  }, []);

  return (
    <div style={{ background: "#16213e", borderRadius: 8, padding: 8, border: "1px solid #222", marginBottom: 14 }}>
      <div ref={ref} style={{ width: "100%" }} />
      <p style={{ fontSize: 10, color: "#444", lineHeight: 1.6, margin: "8px 0 0" }}>
        {legendNote}
      </p>
    </div>
  );
}