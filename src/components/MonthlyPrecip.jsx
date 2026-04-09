import { YEAR_COLORS, MONTHS } from "../config";
import { precipColor } from "../utils";

export default function MonthlyPrecip({ rawData }) {
  if (!rawData) return null;

  const rows = rawData.rows;
  const yrs = [...new Set(rows.map(r => r.y))].sort();
  const grid = {};
  for (const yr of yrs) { grid[yr] = {}; for (let m = 0; m < 12; m++) grid[yr][m] = []; }
  for (const r of rows) {
    const month = new Date(r.d + "T00:00:00").getMonth();
    if (r.op != null) grid[r.y][month].push(r.op);
  }

  const monthlyData = {};
  for (const yr of yrs) {
    monthlyData[yr] = {};
    for (let m = 0; m < 12; m++) {
      monthlyData[yr][m] = grid[yr][m].length ? grid[yr][m].reduce((a, b) => a + b, 0) : null;
    }
  }

  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#7fb8d8", margin: "0 0 10px", letterSpacing: "0.05em" }}>MONTHLY TOTAL PRECIPITATION (ERA5, mm)</h2>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ ...th, position: "sticky", left: 0, background: "#16213e" }}>Year</th>
            {MONTHS.map(m => <th key={m} style={{ ...th, textAlign: "center" }}>{m}</th>)}
            <th style={{ ...th, textAlign: "center", color: "#aaa", fontWeight: 700 }}>Total</th>
          </tr></thead>
          <tbody>
            {yrs.map(yr => {
              const c = YEAR_COLORS[yr] || "#999";
              const vals = Array.from({ length: 12 }, (_, m) => monthlyData[yr][m]);
              const total = vals.filter(v => v != null).reduce((a, b) => a + b, 0);
              return (
                <tr key={yr} style={{ borderBottom: "1px solid #1f2f4f" }}>
                  <td style={{ ...td, color: c, fontWeight: 700, position: "sticky", left: 0, background: "#16213e" }}>{yr}</td>
                  {vals.map((v, m) => <td key={m} style={{ ...td, textAlign: "center", color: precipColor(v) }}>{v != null ? v.toFixed(0) : "—"}</td>)}
                  <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#e0e0e0" }}>{total.toFixed(0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}