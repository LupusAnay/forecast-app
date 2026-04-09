import { MODEL_LABELS } from "../config";
import { useAllModelStats } from "../hooks";
import { formatBias, biasLabel, biasColor } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

function accColor(v) {
  if (v == null) return "#666";
  if (v >= 0.95) return "#81b29a";
  if (v >= 0.9) return "#f2cc8f";
  return "#e07a5f";
}

export default function TempAccuracy({ rawData, variable, season }) {
  if (!rawData) return null;
  const modelStats = useAllModelStats(rawData, variable, season);

  const rankings = modelStats.map(s => ({
    ...s,
    label: MODEL_LABELS[s.id],
  })).sort((a, b) => (a.tMAE ?? 99) - (b.tMAE ?? 99));

  const headers = [
    { label: "#" },
    { label: "Model" },
    { label: "MAE" },
    { label: "RMSE" },
    { label: "Bias" },
    { label: "ACC" },
    { label: "Days" },
  ];

  const rows = rankings.map((m, i) => ({
    highlight: i === 0,
    cells: [
      { value: i + 1, style: { color: i === 0 ? "#81b29a" : "#666", fontWeight: i === 0 ? 700 : 400 } },
      { value: m.label + (i === 0 ? " ← best" : ""), style: { fontWeight: 600 } },
      { value: m.tMAE != null ? m.tMAE.toFixed(2) + "°C" : null },
      { value: m.tRMSE != null ? m.tRMSE.toFixed(2) + "°C" : null },
      { value: m.tBias != null ? `${formatBias(m.tBias)} ${biasLabel(m.tBias)}` : null, style: { color: biasColor(m.tBias) } },
      { value: m.acc != null ? m.acc.toFixed(3) : "—", style: { color: accColor(m.acc) } },
      { value: m.n, style: { color: "#666" } },
    ],
  }));

  return (
    <div style={{ marginBottom: 0 }}>
      <Panel title="TEMPERATURE ACCURACY (vs ERA5)" titleColor="#e07a5f">
        <DataTable headers={headers} rows={rows} />
      </Panel>
      <p style={{ fontSize: 10, color: "#444", margin: "4px 0 0", lineHeight: 1.6, padding: "0 8px" }}>
        ACC = Anomaly Correlation Coefficient. Measures how well forecast anomalies match observed anomalies relative to climatology. ACC &gt; 0.95 = excellent, &gt; 0.9 = good, &lt; 0.9 = poor.
      </p>
    </div>
  );
}