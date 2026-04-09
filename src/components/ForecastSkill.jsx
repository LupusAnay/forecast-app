import { MODEL_IDS, MODEL_LABELS, LEAD_TIME_OPTIONS, RAIN_THRESHOLD } from "../config";
import Panel from "./Panel";
import DataTable from "./DataTable";

function leadTempKey(d) { return `temp_day${d}`; }
function leadPrecipKey(d) { return `precip_day${d}`; }

export default function ForecastSkill({ rawData, variable, leadTime, tab }) {
  if (!rawData || !rawData.previousRuns) return null;

  const obsKey = variable === "temperature_2m_max" ? "ot_max"
    : variable === "temperature_2m_min" ? "ot_min"
    : "ot_mean";

  const rowByDate = {};
  for (const r of rawData.rows) {
    rowByDate[r.d] = r;
  }

  const ltLabel = LEAD_TIME_OPTIONS.find(o => o.value === leadTime)?.label || `Day ${leadTime}`;

  const results = MODEL_IDS.map(m => {
    const pr = rawData.previousRuns[m];
    if (!pr || !pr.dates) {
      return { id: m, label: MODEL_LABELS[m], mae: null, pod: null, far: null, ets: null, hss: null };
    }

    const tKey = leadTempKey(leadTime);
    const pKey = leadPrecipKey(leadTime);

    let sumAbsDiff = 0, n = 0;
    let hits = 0, misses = 0, falseAlarms = 0, correctNegatives = 0;

    for (const [dateStr, entry] of Object.entries(pr.dates)) {
      const era5 = rowByDate[dateStr];
      const era5Temp = era5 ? era5[obsKey] : null;
      const era5Precip = era5 ? era5.op : null;

      const pred = entry[tKey];
      if (era5Temp != null && pred != null) {
        sumAbsDiff += Math.abs(pred - era5Temp);
        n++;
      }

      const predRain = entry[pKey];
      if (era5Precip != null && predRain != null) {
        const obs = era5Precip >= RAIN_THRESHOLD;
        const fc = predRain >= RAIN_THRESHOLD;
        if (fc && obs) hits++;
        else if (!fc && obs) misses++;
        else if (fc && !obs) falseAlarms++;
        else correctNegatives++;
      }
    }

    const mae = n > 0 ? sumAbsDiff / n : null;
    const totalRain = hits + misses;
    const pod = totalRain > 0 ? hits / totalRain : null;
    const far = (hits + falseAlarms) > 0 ? falseAlarms / (hits + falseAlarms) : null;
    const total = hits + misses + falseAlarms + correctNegatives;
    const hitsRandom = total > 0 ? (hits + misses) * (hits + falseAlarms) / total : 0;
    const ets = (hits + misses + falseAlarms - hitsRandom) > 0
      ? (hits - hitsRandom) / (hits + misses + falseAlarms - hitsRandom) : null;
    const denom = ((hits + misses) * (misses + correctNegatives)) + ((hits + falseAlarms) * (falseAlarms + correctNegatives));
    const hss = denom > 0 ? 2 * (hits * correctNegatives - misses * falseAlarms) / denom : null;

    return { id: m, label: MODEL_LABELS[m], mae, pod, far, ets, hss };
  });

  return (
    <div style={{ marginBottom: 20 }}>
      {tab === "temp" && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#c77dba", margin: "0 0 10px", letterSpacing: "0.05em" }}>
            FORECAST SKILL BY LEAD TIME
          </h2>
          <p style={{ fontSize: 10, color: "#555", margin: "0 0 10px", lineHeight: 1.6 }}>
            <b style={{ color: "#e0e0e0" }}>MAE</b> = Mean Absolute Error between the {ltLabel.toLowerCase()} forecast and ERA5 observations, in °C. Lower is better.
          </p>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: "#e07a5f", margin: "0 0 6px" }}>
            Temperature MAE (°C) — {ltLabel}
          </h3>
          <Panel>
            <DataTable
              headers={[
                { label: "Model" },
                { label: "MAE (°C)", align: "center" },
              ]}
              rows={results.map(m => ({
                cells: [
                  { value: m.label, style: { fontWeight: 600 } },
                  { value: m.mae != null ? m.mae.toFixed(2) : "—", style: { textAlign: "center", color: m.mae != null ? (m.mae < 1 ? "#81b29a" : m.mae < 2 ? "#f2cc8f" : "#e07a5f") : "#333" } },
                ],
              }))}
            />
          </Panel>
        </>
      )}

      {tab === "precip" && (
        <>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "#c77dba", margin: "0 0 10px", letterSpacing: "0.05em" }}>
            RAIN SKILL BY LEAD TIME
          </h2>
          <p style={{ fontSize: 10, color: "#555", margin: "0 0 10px", lineHeight: 1.6 }}>
            <b style={{ color: "#e0e0e0" }}>POD</b> Probability of Detection — when it rained, did the forecast say rain?
            &nbsp;<b style={{ color: "#e0e0e0" }}>FAR</b> False Alarm Ratio — when forecast said rain, was it wrong?
          </p>
          <p style={{ fontSize: 10, color: "#555", margin: "0 0 10px", lineHeight: 1.6 }}>
            <b style={{ color: "#e0e0e0" }}>ETS</b> Equitable Threat Score — accuracy minus random hits (1 = perfect, 0 = chance).
            &nbsp;<b style={{ color: "#e0e0e0" }}>HSS</b> Heidke Skill Score — skill vs random guessing (1 = perfect, 0 = no skill).
          </p>
          <h3 style={{ fontSize: 11, fontWeight: 700, color: "#7fb8d8", margin: "0 0 6px" }}>
            Rain Verification — {ltLabel}
          </h3>
          <Panel>
            <DataTable
              headers={[
                { label: "Model" },
                { label: "POD", align: "center" },
                { label: "FAR", align: "center" },
                { label: "ETS", align: "center" },
                { label: "HSS", align: "center" },
              ]}
              rows={results.map(m => ({
                cells: [
                  { value: m.label, style: { fontWeight: 600 } },
                  { value: m.pod != null ? (m.pod * 100).toFixed(0) + "%" : "—", style: { textAlign: "center", color: m.pod != null ? (m.pod >= 0.8 ? "#81b29a" : m.pod >= 0.6 ? "#f2cc8f" : "#e07a5f") : "#333" } },
                  { value: m.far != null ? (m.far * 100).toFixed(0) + "%" : "—", style: { textAlign: "center", color: m.far != null ? (m.far <= 0.3 ? "#81b29a" : m.far <= 0.5 ? "#f2cc8f" : "#e07a5f") : "#333" } },
                  { value: m.ets != null ? m.ets.toFixed(2) : "—", style: { textAlign: "center", color: m.ets != null ? (m.ets >= 0.5 ? "#81b29a" : m.ets >= 0.25 ? "#f2cc8f" : "#e07a5f") : "#333" } },
                  { value: m.hss != null ? m.hss.toFixed(2) : "—", style: { textAlign: "center", color: m.hss != null ? (m.hss >= 0.6 ? "#81b29a" : m.hss >= 0.3 ? "#f2cc8f" : "#e07a5f") : "#333" } },
                ],
              }))}
            />
          </Panel>
        </>
      )}
    </div>
  );
}