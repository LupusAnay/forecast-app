import { MODEL_IDS, MODEL_LABELS, LEAD_TIMES, RAIN_THRESHOLD } from "../config";
import Panel from "./Panel";
import DataTable from "./DataTable";

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

    for (const d of LEAD_TIMES) {
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

  const tempHeaders = [
    { label: "Model" },
    ...LEAD_TIMES.map(d => ({ label: `Day ${d}`, align: "center" })),
  ];

  const tempRows = tempResults.map(m => ({
    cells: [
      { value: m.label, style: { fontWeight: 600 } },
      ...LEAD_TIMES.map(d => {
        const v = m.mae[d];
        return { value: v != null ? v.toFixed(2) : null, style: { textAlign: "center", color: v != null ? (v < 1 ? "#81b29a" : v < 2 ? "#f2cc8f" : "#e07a5f") : "#333" } };
      }),
    ],
  }));

  const rainHeaders = [
    { label: "Model" },
    ...LEAD_TIMES.map(d => ({ label: `Day ${d}`, align: "center" })),
  ];

  const rainRows = rainResults.map(m => ({
    cells: [
      { value: m.label, style: { fontWeight: 600 } },
      ...LEAD_TIMES.map(d => {
        const v = m.pod[d];
        return { value: v != null ? (v * 100).toFixed(1) + "%" : null, style: { textAlign: "center", color: v != null ? (v >= 0.8 ? "#81b29a" : v >= 0.6 ? "#f2cc8f" : "#e07a5f") : "#333" } };
      }),
    ],
  }));

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#c77dba", margin: "0 0 10px", letterSpacing: "0.05em" }}>
        FORECAST SKILL BY LEAD TIME
      </h2>
      <p style={{ fontSize: 10, color: "#666", margin: "0 0 10px", lineHeight: 1.6 }}>
        Based on ~3 months of rolling data from the Previous Runs API. Day 0 forecast used as reference (ERA5 lags ~5 days). Updates daily.
      </p>

      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#e07a5f", margin: "0 0 6px" }}>Temperature MAE (°C) by Lead Time</h3>
      <Panel>
        <DataTable headers={tempHeaders} rows={tempRows} />
      </Panel>

      <h3 style={{ fontSize: 11, fontWeight: 700, color: "#7fb8d8", margin: "12px 0 6px" }}>Rain Detection Rate (POD) by Lead Time</h3>
      <Panel>
        <DataTable headers={rainHeaders} rows={rainRows} />
      </Panel>
    </div>
  );
}