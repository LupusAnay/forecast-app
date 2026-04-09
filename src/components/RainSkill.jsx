import { MODEL_LABELS } from "../config";
import { useRainStats } from "../hooks";
import { detectionColor, farColor, freqBiasColor, freqBiasLabel } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

function etsColor(v) {
  if (v == null) return "#666";
  if (v >= 0.5) return "#81b29a";
  if (v >= 0.25) return "#f2cc8f";
  return "#e07a5f";
}

function hssColor(v) {
  if (v == null) return "#666";
  if (v >= 0.6) return "#81b29a";
  if (v >= 0.3) return "#f2cc8f";
  return "#e07a5f";
}

export default function RainSkill({ rawData, season }) {
  if (!rawData) return null;
  const rainStats = useRainStats(rawData, season);

  const rankings = rainStats.map(s => ({
    ...s,
    label: MODEL_LABELS[s.id],
  })).sort((a, b) => (b.cyclistScore ?? 0) - (a.cyclistScore ?? 0));

  const headers = [
    { label: "#" },
    { label: "Model" },
    { label: "Cyclist Score" },
    { label: "Detection" },
    { label: "False Alarm" },
    { label: "CSI" },
    { label: "ETS" },
    { label: "HSS" },
    { label: "Rain Bias" },
    { label: "Missed" },
    { label: "False Alarms" },
    { label: "Rain Days" },
  ];

  const rows = rankings.map((m, i) => ({
    highlight: i === 0,
    cells: [
      { value: i + 1, style: { color: i === 0 ? "#81b29a" : "#666", fontWeight: i === 0 ? 700 : 400 } },
      { value: m.label + (i === 0 ? " ← best" : ""), style: { fontWeight: 600 } },
      { value: m.cyclistScore != null ? (m.cyclistScore * 100).toFixed(1) + "%" : "—", style: { color: "#e0e0e0", fontWeight: 700 } },
      { value: m.pod != null ? (m.pod * 100).toFixed(1) + "%" : "—", style: { color: detectionColor(m.pod) } },
      { value: m.far != null ? (m.far * 100).toFixed(1) + "%" : "—", style: { color: farColor(m.far) } },
      { value: m.csi != null ? (m.csi * 100).toFixed(1) + "%" : "—" },
      { value: m.ets != null ? m.ets.toFixed(2) : "—", style: { color: etsColor(m.ets) } },
      { value: m.hss != null ? m.hss.toFixed(2) : "—", style: { color: hssColor(m.hss) } },
      { value: `${m.freqBias?.toFixed(2)} ${freqBiasLabel(m.freqBias)}`, style: { color: freqBiasColor(m.freqBias) } },
      { value: m.misses, style: { color: "#e07a5f" } },
      { value: m.falseAlarms, style: { color: "#f2cc8f" } },
      { value: m.rainDays, style: { color: "#666" } },
    ],
  }));

  return (
    <Panel title="RAIN PREDICTION SKILL (will I get wet?)" titleColor="#7fb8d8" note="Rain day = ≥0.5mm. Ranked by cyclist score (70% detection + 30% precision). ETS = equitable threat score. HSS = Heidke skill score.">
      <DataTable headers={headers} rows={rows} minWidth={900} />
      <p style={{ fontSize: 10, color: "#444", margin: "6px 0 0", lineHeight: 1.6, padding: "0 8px" }}>
        Detection = when it rained, model said rain. False Alarm = model said rain, was dry. CSI = critical success index. ETS accounts for random hits. HSS measures skill vs random chance. Rain Bias &gt;1 = over-predicts rain.
      </p>
    </Panel>
  );
}