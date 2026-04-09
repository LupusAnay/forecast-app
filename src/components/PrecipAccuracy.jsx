import { MODEL_LABELS } from "../config";
import { useAllModelPrecipStats } from "../hooks";
import { formatPrecipBias, precipBiasLabel, precipBiasColor } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

export default function PrecipAccuracy({ rawData, season }) {
  if (!rawData) return null;
  const modelStats = useAllModelPrecipStats(rawData, season);

  const rankings = modelStats.map(s => ({
    ...s,
    label: MODEL_LABELS[s.id],
  })).sort((a, b) => (a.pMAE ?? 99) - (b.pMAE ?? 99));

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
      { value: m.pMAE != null ? m.pMAE.toFixed(2) + " mm" : null },
      { value: m.pRMSE != null ? m.pRMSE.toFixed(2) + " mm" : null },
      { value: m.pBias != null ? `${formatPrecipBias(m.pBias)} ${precipBiasLabel(m.pBias)}` : null, style: { color: precipBiasColor(m.pBias) } },
      { value: m.n, style: { color: "#666" } },
    ],
  }));

  return (
    <Panel title="PRECIPITATION ACCURACY (all years vs ERA5)" titleColor="#7fb8d8">
      <DataTable headers={headers} rows={rows} />
    </Panel>
  );
}