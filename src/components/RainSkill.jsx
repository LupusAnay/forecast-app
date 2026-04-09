import { MODEL_LABELS, RAIN_THRESHOLD } from "../config";
import { detectionColor, farColor, freqBiasColor, freqBiasLabel } from "../utils";

export default function RainSkill({ rawData }) {
  if (!rawData) return null;
  const rows = rawData.rows;

  const rankings = Object.entries(rawData.models).map(([modelId, key]) => {
    const pPairs = rows.filter(r => r[`fp_${key}`] != null && r.op != null);
    let hits = 0, misses = 0, falseAlarms = 0;
    for (const r of pPairs) {
      const fcRain = r[`fp_${key}`] >= RAIN_THRESHOLD;
      const obsRain = r.op >= RAIN_THRESHOLD;
      if (fcRain && obsRain) hits++;
      else if (!fcRain && obsRain) misses++;
      else if (fcRain && !obsRain) falseAlarms++;
    }
    const pod = (hits + misses) > 0 ? hits / (hits + misses) : null;
    const far = (hits + falseAlarms) > 0 ? falseAlarms / (hits + falseAlarms) : null;
    const csi = (hits + misses + falseAlarms) > 0 ? hits / (hits + misses + falseAlarms) : null;
    const freqBias = (hits + misses) > 0 ? (hits + falseAlarms) / (hits + misses) : null;
    const cyclistScore = (pod != null && far != null) ? pod * 0.7 + (1 - far) * 0.3 : null;

    return { id: modelId, label: MODEL_LABELS[modelId], pod, far, csi, freqBias, cyclistScore, hits, misses, falseAlarms, rainDays: hits + misses, n: pPairs.length };
  });

  rankings.sort((a, b) => (b.cyclistScore ?? 0) - (a.cyclistScore ?? 0));

  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: "#7fb8d8", margin: "0 0 10px", letterSpacing: "0.05em" }}>RAIN PREDICTION SKILL (will I get wet?)</h2>
      <p style={{ fontSize: 10, color: "#666", margin: "0 0 10px" }}>Rain day = ≥0.5mm. Ranked by cyclist score (70% detection + 30% precision).</p>
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 700 }}>
          <thead><tr style={{ borderBottom: "1px solid #333" }}>
            {["#", "Model", "Cyclist Score", "Detection", "False Alarm", "CSI", "Rain Bias", "Missed", "False Alarms", "Rain Days"].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rankings.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: "1px solid #1f2f4f", background: i === 0 ? "#1a2a3e" : "transparent" }}>
                <td style={{ ...td, color: i === 0 ? "#81b29a" : "#666", fontWeight: i === 0 ? 700 : 400 }}>{i + 1}</td>
                <td style={{ ...td, fontWeight: 600 }}>{m.label}{i === 0 ? " ← best" : ""}</td>
                <td style={{ ...td, color: "#e0e0e0", fontWeight: 700 }}>{m.cyclistScore != null ? (m.cyclistScore * 100).toFixed(1) + "%" : "—"}</td>
                <td style={{ ...td, color: detectionColor(m.pod) }}>{m.pod != null ? (m.pod * 100).toFixed(1) + "%" : "—"}</td>
                <td style={{ ...td, color: farColor(m.far) }}>{m.far != null ? (m.far * 100).toFixed(1) + "%" : "—"}</td>
                <td style={td}>{m.csi != null ? (m.csi * 100).toFixed(1) + "%" : "—"}</td>
                <td style={{ ...td, color: freqBiasColor(m.freqBias) }}>
                  {m.freqBias?.toFixed(2)} <span style={{ color: "#666" }}>{freqBiasLabel(m.freqBias)}</span>
                </td>
                <td style={{ ...td, color: "#e07a5f" }}>{m.misses}</td>
                <td style={{ ...td, color: "#f2cc8f" }}>{m.falseAlarms}</td>
                <td style={{ ...td, color: "#666" }}>{m.rainDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 10, color: "#444", margin: "6px 0 0", lineHeight: 1.6 }}>
        Detection = when it rained, model said rain. False Alarm = model said rain, was dry. CSI = combined skill. Rain Bias &gt;1 = over-predicts rain.
      </p>
    </div>
  );
}