import { YEAR_COLORS } from "../config";
import { useYearlyData } from "../hooks";
import { getObsTempKey } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

export default function YearRanking({ rawData, variable, season }) {
  if (!rawData) return null;
  const { yrs, yearRows } = useYearlyData(rawData, season);
  const obsKey = getObsTempKey(variable);

  const ranking = yrs.map(yr => {
    const yrRows = yearRows[yr];
    const temps = yrRows.map(r => r[obsKey]).filter(v => v != null);
    const precips = yrRows.map(r => r.op).filter(v => v != null);
    return {
      year: yr,
      avgTemp: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null,
      totalPrecip: precips.length ? precips.reduce((a, b) => a + b, 0) : null,
      maxTemp: temps.length ? Math.max(...temps) : null,
      minTemp: temps.length ? Math.min(...temps) : null,
      days: temps.length,
    };
  }).sort((a, b) => (b.avgTemp ?? 0) - (a.avgTemp ?? 0));

  const headers = [
    { label: "#" },
    { label: "Year" },
    { label: "Avg Temp" },
    { label: "Min" },
    { label: "Max" },
    { label: "Total Precip" },
    { label: "Days" },
  ];

  const rows = ranking.map((yr, i) => {
    const c = YEAR_COLORS[yr.year] || "#999";
    return {
      cells: [
        { value: i + 1 },
        { value: yr.year, style: { color: c, fontWeight: 700 } },
        { value: yr.avgTemp != null ? yr.avgTemp.toFixed(1) + "°C" : null },
        { value: yr.minTemp != null ? yr.minTemp.toFixed(1) + "°" : null, style: { color: "#7fb8d8" } },
        { value: yr.maxTemp != null ? yr.maxTemp.toFixed(1) + "°" : null, style: { color: "#e07a5f" } },
        { value: yr.totalPrecip != null ? yr.totalPrecip.toFixed(0) + " mm" : null },
        { value: yr.days, style: { color: "#666" } },
      ],
    };
  });

  return (
    <Panel title="YEAR RANKING (ERA5 observed)" titleColor="#81b29a">
      <DataTable headers={headers} rows={rows} />
    </Panel>
  );
}