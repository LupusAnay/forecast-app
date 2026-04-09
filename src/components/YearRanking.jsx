import { YEAR_COLORS } from "../config";
import { getObsTempKey } from "../utils";

export default function YearRanking({ rawData, variable }) {
  if (!rawData) return null;
  const rows = rawData.rows;
  const obsKey = getObsTempKey(variable);

  const yrs = [...new Set(rows.map(r => r.y))].sort();
  const ranking = yrs.map(yr => {
    const yrRows = rows.filter(r => r.y === yr);
    const temps = yrRows.map(r => r[obsKey]).filter(v => v != null);
    const precips = yrRows.map(r => r.op).filter(v => v != null);
    return {
      year: yr,
      avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      totalPrecip: precips.length ? precips.reduce((a, b) => a + b, 0) : null,
      maxTemp: temps.length ? Math.max(...temps) : null,
      minTemp: temps.length ? Math.min(...temps) : null,
      days: temps.length,
    };
  }).sort((a, b) => (b.avgTemp ?? 0) - (a.avgTemp ?? 0));

  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#81b29a", margin: "0 0 10px", letterSpacing: "0.05em" }}>YEAR RANKING (ERA5 observed)</h2>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            {["#", "Year", "Avg Temp", "Min", "Max", "Total Precip", "Days"].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {ranking.map((yr, i) => {
              const c = YEAR_COLORS[yr.year] || "#999";
              return (
                <tr key={yr.year} style={{ borderBottom: "1px solid #1f2f4f" }}>
                  <td style={td}>{i + 1}</td>
                  <td style={{ ...td, color: c, fontWeight: 700 }}>{yr.year}</td>
                  <td style={td}>{yr.avgTemp?.toFixed(1)}°C</td>
                  <td style={{ ...td, color: "#7fb8d8" }}>{yr.minTemp?.toFixed(1)}°</td>
                  <td style={{ ...td, color: "#e07a5f" }}>{yr.maxTemp?.toFixed(1)}°</td>
                  <td style={td}>{yr.totalPrecip?.toFixed(0)} mm</td>
                  <td style={{ ...td, color: "#666" }}>{yr.days}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}