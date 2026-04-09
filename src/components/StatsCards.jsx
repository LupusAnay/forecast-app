import { YEAR_COLORS } from "../config";
import { useModelStats } from "../hooks";
import { formatBias, biasLabel, biasColor } from "../utils";

function accFormat(v) {
  if (v == null) return "—";
  return v.toFixed(3);
}

export default function StatsCards({ rawData, model, variable, season }) {
  const stats = useModelStats(rawData, model, variable, season);
  if (!stats) return null;

  const { yrs, perYear } = stats;

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      {yrs.map(yr => {
        const s = perYear[yr];
        const c = YEAR_COLORS[yr] || "#999";
        return (
          <div key={yr} style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, padding: "10px 14px", flex: "1 1 140px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: c, marginBottom: 6 }}>{yr}</div>
            <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.8 }}>
              <div>MAE: <span style={{ color: "#e0e0e0" }}>{s.tMAE != null ? s.tMAE.toFixed(2) + "°C" : "—"}</span></div>
              <div>RMSE: <span style={{ color: "#e0e0e0" }}>{s.tRMSE != null ? s.tRMSE.toFixed(2) + "°C" : "—"}</span></div>
              <div>Bias: <span style={{ color: biasColor(s.tBias) }}>{formatBias(s.tBias)}</span> <span style={{ color: "#666" }}>{biasLabel(s.tBias)}</span></div>
              <div>Precip MAE: <span style={{ color: "#e0e0e0" }}>{s.pMAE != null ? s.pMAE.toFixed(2) + " mm" : "—"}</span></div>
              <div>ACC: <span style={{ color: "#e0e0e0" }}>{accFormat(s.acc)}</span></div>
              <div>Days: <span style={{ color: "#e0e0e0" }}>{s.dayCount}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}