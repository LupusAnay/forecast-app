import { YEAR_COLORS } from "../config";
import { useModelStats } from "../hooks";
import { formatBias, biasLabel, biasColor } from "../utils";

export default function StatsCards({ rawData, model, variable }) {
  const stats = useModelStats(rawData, model, variable);
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
              <div>Temp MAE: <span style={{ color: "#e0e0e0" }}>{s.tMAE != null ? s.tMAE.toFixed(2) + "°C" : "—"}</span></div>
              <div>Precip MAE: <span style={{ color: "#e0e0e0" }}>{s.pMAE != null ? s.pMAE.toFixed(2) + " mm" : "—"}</span></div>
              <div>Days: <span style={{ color: "#e0e0e0" }}>{s.dayCount}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}