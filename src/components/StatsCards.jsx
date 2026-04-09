import { YEAR_COLORS } from "../config";
import { getObsTempKey, getFcTempKey } from "../utils";

export default function StatsCards({ rawData, model, variable }) {
  if (!rawData) return null;
  const modelKey = rawData.models?.[model];
  if (!modelKey) return null;

  const rows = rawData.rows;
  const yrs = [...new Set(rows.map(r => r.y))].sort();
  const obsKey = getObsTempKey(variable);
  const fcKey = getFcTempKey(variable, modelKey);

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      {yrs.map(yr => {
        const yrRows = rows.filter(r => r.y === yr);
        const tPairs = yrRows.filter(r => r[fcKey] != null && r[obsKey] != null);
        const pPairs = yrRows.filter(r => r[`fp_${modelKey}`] != null && r.op != null);
        const tMAE = tPairs.length ? tPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
        const pMAE = pPairs.length ? pPairs.reduce((s, r) => s + Math.abs(r[`fp_${modelKey}`] - r.op), 0) / pPairs.length : null;
        const c = YEAR_COLORS[yr] || "#999";

        return (
          <div key={yr} style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, padding: "10px 14px", flex: "1 1 140px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 6 }}>{yr}</div>
            <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.8 }}>
              <div>Temp MAE: <span style={{ color: "#e0e0e0" }}>{tMAE != null ? tMAE.toFixed(2) + "°C" : "—"}</span></div>
              <div>Precip MAE: <span style={{ color: "#e0e0e0" }}>{pMAE != null ? pMAE.toFixed(2) + " mm" : "—"}</span></div>
              <div>Days: <span style={{ color: "#e0e0e0" }}>{tPairs.length}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}