import { YEAR_COLORS, MONTHS } from "../config";
import { tempColor, getObsTempKey } from "../utils";

export default function MonthlyTemp({ rawData, variable }) {
  if (!rawData) return null;

  const obsKey = getObsTempKey(variable);
  const label = variable === "temperature_2m_mean" ? "MEAN" : variable === "temperature_2m_max" ? "MAX" : "MIN";

  const rows = rawData.rows;
  const yrs = [...new Set(rows.map(r => r.y))].sort();
  const grid = {};
  for (const yr of yrs) { grid[yr] = {}; for (let m = 0; m < 12; m++) grid[yr][m] = []; }
  for (const r of rows) {
    const month = new Date(r.d + "T00:00:00").getMonth();
    if (r[obsKey] != null) grid[r.y][month].push(r[obsKey]);
  }

  const monthlyData = {};
  for (const yr of yrs) {
    monthlyData[yr] = {};
    for (let m = 0; m < 12; m++) {
      const temps = grid[yr][m];
      monthlyData[yr][m] = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    }
  }

  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#f2cc8f", margin: "0 0 10px", letterSpacing: "0.05em" }}>MONTHLY {label} TEMPERATURE (ERA5, °C)</h2>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ ...th, position: "sticky", left: 0, background: "#16213e" }}>Year</th>
            {MONTHS.map(m => <th key={m} style={{ ...th, textAlign: "center" }}>{m}</th>)}
            <th style={{ ...th, textAlign: "center", color: "#aaa", fontWeight: 700 }}>Avg</th>
          </tr></thead>
          <tbody>
            {yrs.map(yr => {
              const c = YEAR_COLORS[yr] || "#999";
              const vals = Array.from({ length: 12 }, (_, m) => monthlyData[yr][m]);
              const valid = vals.filter(v => v != null);
              const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
              return (
                <tr key={yr} style={{ borderBottom: "1px solid #1f2f4f" }}>
                  <td style={{ ...td, color: c, fontWeight: 700, position: "sticky", left: 0, background: "#16213e" }}>{yr}</td>
                  {vals.map((v, m) => <td key={m} style={{ ...td, textAlign: "center", color: tempColor(v) }}>{v != null ? v.toFixed(1) : "—"}</td>)}
                  <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#e0e0e0" }}>{avg != null ? avg.toFixed(1) : "—"}</td>
                </tr>
              );
            })}
            <tr style={{ borderTop: "2px solid #333" }}>
              <td style={{ ...td, color: "#888", fontWeight: 600, fontStyle: "italic", position: "sticky", left: 0, background: "#16213e" }}>Mean</td>
              {Array.from({ length: 12 }, (_, m) => {
                const vals = yrs.map(yr => monthlyData[yr][m]).filter(v => v != null);
                const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
                return <td key={m} style={{ ...td, textAlign: "center", color: "#888" }}>{avg != null ? avg.toFixed(1) : "—"}</td>;
              })}
              <td style={{ ...td, textAlign: "center", color: "#888", fontWeight: 600 }}>{(() => {
                const all = Array.from({ length: 12 }, (_, m) => yrs.map(yr => monthlyData[yr][m]).filter(v => v != null)).flat();
                return all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : "—";
              })()}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}