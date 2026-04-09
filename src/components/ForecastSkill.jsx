import { MODEL_IDS, MODEL_LABELS, RAIN_THRESHOLD } from "../config";

const LEAD_DAYS = [0, 1, 2, 3, 5];

function leadTempKey(d) { return `temp_day${d}`; }
function leadPrecipKey(d) { return `precip_day${d}`; }

export default function ForecastSkill({ rawData }) {
  if (!rawData || !rawData.previousRuns) return null;

  const day0TempKey = leadTempKey(0);
  const day0PrecipKey = leadPrecipKey(0);

  const tempResults = [];
  const rainResults = [];

  for (const m of MODEL_IDS) {
    const pr = rawData.previousRuns[m];
    if (!pr || !pr.dates) {
      tempResults.push({ id: m, label: MODEL_LABELS[m], mae: {}, pod: {} });
      rainResults.push({ id: m, label: MODEL_LABELS[m], pod: {} });
      continue;
    }

    const maeMap = {};
    const podMap = {};

    for (const d of LEAD_DAYS) {
      const tKey = leadTempKey(d);
      const pKey = leadPrecipKey(d);

      let sumAbsDiff = 0, n = 0;
      let hits = 0, misses = 0, falseAlarms = 0;

      for (const entry of Object.values(pr.dates)) {
        const ref = entry[day0TempKey];
        const pred = entry[tKey];
        if (ref != null && pred != null) {
          sumAbsDiff += Math.abs(pred - ref);
          n++;
        }

        const refRain = entry[day0PrecipKey];
        const predRain = entry[pKey];
        if (refRain != null && predRain != null) {
          const obs = refRain >= RAIN_THRESHOLD;
          const fc = predRain >= RAIN_THRESHOLD;
          if (fc && obs) hits++;
          else if (!fc && obs) misses++;
          else if (fc && !obs) falseAlarms++;
        }
      }

      maeMap[d] = n > 0 ? sumAbsDiff / n : null;
      const totalRain = hits + misses;
      podMap[d] = totalRain > 0 ? hits / totalRain : null;
    }

    tempResults.push({ id: m, label: MODEL_LABELS[m], mae: maeMap });
    rainResults.push({ id: m, label: MODEL_LABELS[m], pod: podMap });
  }

  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#c77dba", margin: "0 0 10px", letterSpacing: "0.05em" }}>FORECAST SKILL BY LEAD TIME</h2>
      <p style={{ fontSize: 10, color: "#666", margin: "0 0 10px", lineHeight: 1.6 }}>
        Based on ~3 months of rolling data from the Previous Runs API. Day 0 forecast used as reference (ERA5 lags ~5 days). Updates daily.
      </p>

      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#e07a5f", margin: "0 0 6px" }}>Temperature MAE (°C) by Lead Time</h3>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "auto", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            <th style={th}>Model</th>
            {LEAD_DAYS.map(d => <th key={d} style={{ ...th, textAlign: "center" }}>Day {d}</th>)}
          </tr></thead>
          <tbody>
            {tempResults.map(m => (
              <tr key={m.id} style={{ borderBottom: "1px solid #1f2f4f" }}>
                <td style={{ ...td, fontWeight: 600 }}>{m.label}</td>
                {LEAD_DAYS.map(d => {
                  const v = m.mae[d];
                  return <td key={d} style={{ ...td, textAlign: "center", color: v != null ? (v < 1 ? "#81b29a" : v < 2 ? "#f2cc8f" : "#e07a5f") : "#333" }}>
                    {v != null ? v.toFixed(2) : "—"}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#7fb8d8", margin: "0 0 6px" }}>Rain Detection Rate (POD) by Lead Time</h3>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            <th style={th}>Model</th>
            {LEAD_DAYS.map(d => <th key={d} style={{ ...th, textAlign: "center" }}>Day {d}</th>)}
          </tr></thead>
          <tbody>
            {rainResults.map(m => (
              <tr key={m.id} style={{ borderBottom: "1px solid #1f2f4f" }}>
                <td style={{ ...td, fontWeight: 600 }}>{m.label}</td>
                {LEAD_DAYS.map(d => {
                  const v = m.pod[d];
                  return <td key={d} style={{ ...td, textAlign: "center", color: v != null ? (v >= 0.8 ? "#81b29a" : v >= 0.6 ? "#f2cc8f" : "#e07a5f") : "#333" }}>
                    {v != null ? (v * 100).toFixed(1) + "%" : "—"}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}