import { MODEL_LABELS } from "../config";
import { getObsTempKey, getFcTempKey, formatBias, biasLabel, biasColor } from "../utils";

export default function TempAccuracy({ rawData, variable }) {
  if (!rawData) return null;
  const rows = rawData.rows;
  const obsKey = getObsTempKey(variable);

  const rankings = Object.entries(rawData.models).map(([modelId, key]) => {
    const fcKey = getFcTempKey(variable, key);
    const tPairs = rows.filter(r => r[fcKey] != null && r[obsKey] != null);
    const tMAE = tPairs.length ? tPairs.reduce((s, r) => s + Math.abs(r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
    const tRMSE = tPairs.length ? Math.sqrt(tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]) ** 2, 0) / tPairs.length) : null;
    const tBias = tPairs.length ? tPairs.reduce((s, r) => s + (r[fcKey] - r[obsKey]), 0) / tPairs.length : null;
    return { id: modelId, label: MODEL_LABELS[modelId], tMAE, tRMSE, tBias, n: tPairs.length };
  });

  rankings.sort((a, b) => (a.tMAE ?? 99) - (b.tMAE ?? 99));

  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#e07a5f", margin: "0 0 10px", letterSpacing: "0.05em" }}>TEMPERATURE ACCURACY (all years vs ERA5)</h2>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            {["#", "Model", "MAE", "RMSE", "Bias", "Days"].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rankings.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #1f2f4f", background: i === 0 ? "#1a2a3e" : "transparent" }}>
                <td style={{ ...td, color: i === 0 ? "#81b29a" : "#666", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{m.label}{i === 0 ? " ← best" : ""}</td>
                <td style={td}>{m.tMAE?.toFixed(2)}°C</td>
                <td style={td}>{m.tRMSE?.toFixed(2)}°C</td>
                <td style={{ ...td, color: biasColor(m.tBias) }}>
                  {formatBias(m.tBias)} <span style={{ color: "#666" }}>{biasLabel(m.tBias)}</span>
                </td>
                <td style={{ ...td, color: "#666" }}>{m.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}