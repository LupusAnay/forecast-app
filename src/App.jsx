import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAllData, clearCache, MODEL_LABELS } from "./data";
import GlobalControls from "./components/GlobalControls";
import LocationSelector, { loadSavedLocation, saveLocation } from "./components/LocationSelector";
import YearOverlay from "./components/YearOverlay";
import StatsCards from "./components/StatsCards";
import YearRanking from "./components/YearRanking";
import TempAccuracy from "./components/TempAccuracy";
import RainSkill from "./components/RainSkill";
import MonthlyTemp from "./components/MonthlyTemp";
import MonthlyPrecip from "./components/MonthlyPrecip";
import ForecastSkill from "./components/ForecastSkill";
import { DEFAULT_LAT, DEFAULT_LON, DEFAULT_LOCATION_NAME } from "./config";

export default function App() {
  const [location, setLocation] = useState(() => loadSavedLocation() || { lat: DEFAULT_LAT, lon: DEFAULT_LON, name: DEFAULT_LOCATION_NAME });
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("Initializing...");
  const [model, setModel] = useState("ecmwf_ifs");
  const [smoothing, setSmoothing] = useState(7);
  const [variable, setVariable] = useState("temperature_2m_mean");
  const [tab, setTab] = useState("temp");
  const [leadTime, setLeadTime] = useState(0);

  const locationRef = useRef(location);
  locationRef.current = location;

  const loadData = useCallback((loc, force = false) => {
    if (force) clearCache(loc.lat, loc.lon);
    setLoading(true);
    setProgress("Initializing...");
    setRawData(null);
    fetchAllData(setProgress, loc).then(data => { setRawData(data); setLoading(false); }).catch(e => { setProgress(`Error: ${e.message}`); });
  }, []);

  useEffect(() => { loadData(location); }, []);

  const handleRefresh = useCallback(() => { loadData(locationRef.current, true); }, [loadData]);

  const handleLocationChange = useCallback((newLoc) => {
    setLocation(newLoc);
    saveLocation(newLoc);
    loadData(newLoc);
  }, [loadData]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 16 }}>
        <div style={{ width: 32, height: 32, border: "3px solid #333", borderTop: "3px solid #e07a5f", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 12, color: "#888" }}>{progress}</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 16px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e07a5f", margin: "0 0 2px" }}>FORECAST VERIFICATION</h1>
        <p style={{ fontSize: 11, color: "#666", margin: "0 0 16px" }}>{location.name} ({location.lat.toFixed(4)}°N, {location.lon.toFixed(4)}°E) | predicted vs ERA5 observed | scroll to zoom, drag to pan</p>

        <GlobalControls
          model={model} setModel={setModel}
          smoothing={smoothing} setSmoothing={setSmoothing}
          variable={variable} setVariable={setVariable}
          tab={tab} setTab={setTab}
          leadTime={leadTime} setLeadTime={setLeadTime}
          onRefresh={handleRefresh}
          location={location} onLocationChange={handleLocationChange}
        />

        {tab === "temp" && (
          <>
            <YearOverlay rawData={rawData} model={model} smoothing={smoothing} variable={variable} tab={tab} leadTime={leadTime} />
            <StatsCards rawData={rawData} model={model} variable={variable} />
            <YearRanking rawData={rawData} variable={variable} />
            <MonthlyTemp rawData={rawData} variable={variable} />
            <TempAccuracy rawData={rawData} variable={variable} />
          </>
        )}

        {tab === "precip" && (
          <>
            <YearOverlay rawData={rawData} model={model} smoothing={smoothing} variable={variable} tab={tab} leadTime={leadTime} />
            <StatsCards rawData={rawData} model={model} variable={variable} />
            <MonthlyPrecip rawData={rawData} />
            <RainSkill rawData={rawData} />
          </>
        )}

        <ForecastSkill rawData={rawData} />

        <p style={{ fontSize: 10, color: "#333", lineHeight: 1.6, margin: 0 }}>
          Data: <a href="https://open-meteo.com/" target="_blank" rel="noopener" style={{ color: "#666" }}>Open-Meteo</a> (free, non-commercial). ERA5 reanalysis for ground truth. Cached for 12h in localStorage.
        </p>
      </div>
    </div>
  );
}