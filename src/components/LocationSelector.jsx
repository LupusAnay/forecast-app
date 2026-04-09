import { useState, useRef, useCallback, useEffect } from "react";

const GEO_KEY = "forecast_verification_location";
const DEBOUNCE_MS = 300;

export default function LocationSelector({ location, onLocationChange }) {
  const [query, setQuery] = useState(location.name);
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [geoStatus, setGeoStatus] = useState("");
  const timerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    setQuery(location.name);
  }, [location.name]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchGeocoding = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      const resp = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
      const json = await resp.json();
      setResults(json.results || []);
    } catch {
      setResults([]);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setGeoStatus("");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => searchGeocoding(val), DEBOUNCE_MS);
    setShowDropdown(true);
  };

  const selectResult = (r) => {
    const loc = { lat: r.latitude, lon: r.longitude, name: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}${r.country ? ", " + r.country : ""}` };
    setQuery(loc.name);
    setShowDropdown(false);
    setResults([]);
    onLocationChange(loc);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) { setGeoStatus("Not supported"); return; }
    setGeoStatus("Locating...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        setGeoStatus("");
        onLocationChange({ lat, lon, name: `${lat}°N, ${lon}°E` });
      },
      () => { setGeoStatus("Denied"); setTimeout(() => setGeoStatus(""), 2000); },
      { timeout: 10000 }
    );
  };

  const sel = { background: "#16213e", color: "#e0e0e0", border: "1px solid #333", borderRadius: 4, padding: "4px 8px", fontSize: 12, fontFamily: "inherit" };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <label style={{ fontSize: 11, color: "#888" }}>LOCATION
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          placeholder="Search city..."
          style={{ ...sel, marginLeft: 6, width: 180 }}
        />
      </label>
      <button onClick={handleGeolocation} style={{ ...sel, cursor: "pointer", marginLeft: 4, fontSize: 11 }} title="Use my location">
        <span style={{ fontSize: 13 }}>📍</span>
      </button>
      {geoStatus && <span style={{ fontSize: 10, color: "#888", marginLeft: 4 }}>{geoStatus}</span>}

      {showDropdown && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, zIndex: 100,
          background: "#1a1a2e", border: "1px solid #333", borderRadius: 4,
          marginTop: 2, maxHeight: 200, overflowY: "auto", width: 260,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
        }}>
          {results.map(r => (
            <div
              key={`${r.latitude}-${r.longitude}-${r.id}`}
              onClick={() => selectResult(r)}
              style={{
                padding: "6px 10px", cursor: "pointer", fontSize: 11, color: "#e0e0e0",
                borderBottom: "1px solid #1f2f4f",
              }}
              onMouseEnter={e => e.target.style.background = "#1f2f4f"}
              onMouseLeave={e => e.target.style.background = "transparent"}
            >
              <span style={{ fontWeight: 600 }}>{r.name}</span>
              <span style={{ color: "#888", marginLeft: 4 }}>
                {r.admin1 && r.admin1 + ", "}{r.country} ({r.latitude.toFixed(2)}°, {r.longitude.toFixed(2)}°)
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function loadSavedLocation() {
  try {
    const raw = localStorage.getItem(GEO_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveLocation(loc) {
  try { localStorage.setItem(GEO_KEY, JSON.stringify(loc)); } catch {}
}