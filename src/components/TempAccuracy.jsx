import { MODEL_LABELS } from "../config";
import { useAllModelStats } from "../hooks";
import { formatBias, biasLabel, biasColor } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

export default function TempAccuracy({ rawData, variable }) {
  if (!rawData) return null;
  const modelStats = useAllModelStats(rawData, variable);

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
      { value: m.n, style: { color: "#666" } },
    ],
  }));

  return (
    <Panel title="TEMPERATURE ACCURACY (all years vs ERA5)" titleColor="#e07a5f">
      <DataTable headers={headers} rows={rows} />
    </Panel>
  );
}