import { useRef, useEffect } from "react";
import Plotly from "plotly.js-dist-min";
import { YEAR_COLORS, MONTH_TICKS, MONTHS } from "../config";
import { rollingAvg, doyToLabel, getObsTempKey, getFcTempKey, getFwdTempKey } from "../utils";

export default function YearOverlay({ rawData, model, smoothing, variable, tab }) {
  const ref = useRef(null);
  const modelKey = rawData?.models?.[model];

  const traces = (() => {
    if (!rawData || !modelKey) return [];
    const rows = rawData.rows;
    const yrs = [...new Set(rows.map(r => r.y))].sort();
    const allTraces = [];
    const obsKey = getObsTempKey(variable);
    const fcKey = getFcTempKey(variable, modelKey);
    const fwdKey = getFwdTempKey(variable, modelKey);

    for (const yr of yrs) {
      const yrRows = rows.filter(r => r.y === yr).sort((a, b) => a.doy - b.doy);
      const doys = yrRows.map(r => r.doy);
      const c = YEAR_COLORS[yr] || "#999";
      const isTemp = tab === "temp";

      const fcRaw = yrRows.map(r => isTemp ? r[fcKey] : r[`fp_${modelKey}`]);
      const obsRaw = yrRows.map(r => isTemp ? r[obsKey] : r.op);
      const fwdRaw = yrRows.map(r => isTemp ? r[fwdKey] : r[`fwp_${modelKey}`]);

      allTraces.push({ x: doys, y: rollingAvg(fcRaw, smoothing), name: yr + " forecast", color: c, dash: "dash", legendgroup: yr + "fc" });
      allTraces.push({ x: doys, y: rollingAvg(obsRaw, smoothing), name: yr + " observed", color: c, dash: "solid", legendgroup: yr + "obs" });

      if (fwdRaw.some(v => v != null)) {
        const lastHistIdx = fcRaw.reduce((li, v, i) => v != null ? i : li, -1);
        const conn = [...fwdRaw];
        if (lastHistIdx >= 0) conn[lastHistIdx] = fcRaw[lastHistIdx];
        allTraces.push({ x: doys, y: conn, name: yr + " live forecast", color: c, dash: "dot", width: 2.5, legendgroup: yr + "fwd" });
      }
    }
    return allTraces;
  })();

  useEffect(() => {
    if (!ref.current || !traces.length) return;

    const plotTraces = traces.map(s => ({
      x: s.x, y: s.y, name: s.name, type: "scatter", mode: "lines",
      line: { color: s.color, width: s.width || 1.8, dash: s.dash || "solid" },
      hovertemplate: "%{text}: %{y:.1f}" + (tab === "temp" ? "°C" : " mm") + "<extra>" + s.name + "</extra>",
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
      yaxis: { title: tab === "temp" ? "°C" : "mm", gridcolor: "#1f2f4f", zerolinecolor: "#1f2f4f" },
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
        Solid = ERA5 reanalysis (ground truth). Dashed = historical forecast. Dotted = live 7-day forecast. Vertical line = today.
      </p>
    </div>
  );
}