import { MODEL_IDS, MODEL_LABELS, VARIABLES, SMOOTHING_OPTIONS, LEAD_TIME_OPTIONS } from "../config";
import LocationSelector from "./LocationSelector";

const sel = { background: "#16213e", color: "#e0e0e0", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontFamily: "inherit" };

export default function GlobalControls({ model, setModel, smoothing, setSmoothing, variable, setVariable, tab, setTab, leadTime, setLeadTime, onRefresh, location, onLocationChange }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
      <LocationSelector location={location} onLocationChange={onLocationChange} />
      <label style={{ fontSize: 11, color: "#888" }}>MODEL
        <select value={model} onChange={e => setModel(e.target.value)} style={{ ...sel, marginLeft: 6 }}>
          {MODEL_IDS.map(k => <option key={k} value={k}>{MODEL_LABELS[k]}</option>)}
        </select>
      </label>
      <label style={{ fontSize: 11, color: "#888" }}>LEAD TIME
        <select value={leadTime} onChange={e => setLeadTime(+e.target.value)} style={{ ...sel, marginLeft: 6 }}>
          {LEAD_TIME_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label style={{ fontSize: 11, color: "#888" }}>SMOOTH
        <select value={smoothing} onChange={e => setSmoothing(+e.target.value)} style={{ ...sel, marginLeft: 6 }}>
          {SMOOTHING_OPTIONS.map(d => <option key={d} value={d}>{d === 1 ? "Raw" : d + "d"}</option>)}
        </select>
      </label>
      <label style={{ fontSize: 11, color: "#888" }}>VARIABLE
        <select value={variable} onChange={e => setVariable(e.target.value)} style={{ ...sel, marginLeft: 6 }}>
          {VARIABLES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
        </select>
      </label>
      <div style={{ display: "flex", gap: 4 }}>
        {[["temp", "TEMPERATURE"], ["precip", "PRECIPITATION"]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            background: tab === k ? "#e07a5f" : "#16213e", color: tab === k ? "#1a1a2e" : "#888",
            border: "1px solid #333", borderRadius: 4, padding: "4px 12px", fontSize: 11,
            fontFamily: "inherit", fontWeight: tab === k ? 700 : 400, cursor: "pointer",
          }}>{label}</button>
        ))}
      </div>
      <button onClick={onRefresh} style={{ ...sel, cursor: "pointer", marginLeft: "auto" }} title="Clear cache and refetch">↻ Refresh</button>
    </div>
  );
}