import { YEAR_COLORS, MONTHS } from "../config";
import { useYearlyData } from "../hooks";
import { tempColor, getObsTempKey } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

export default function MonthlyTemp({ rawData, variable }) {
  if (!rawData) return null;
  const { yrs, yearRows } = useYearlyData(rawData);
  const obsKey = getObsTempKey(variable);
  const label = variable === "temperature_2m_mean" ? "MEAN" : variable === "temperature_2m_max" ? "MAX" : "MIN";

  const monthlyData = {};
  for (const yr of yrs) {
    monthlyData[yr] = {};
    const grid = {};
    for (let m = 0; m < 12; m++) grid[m] = [];
    for (const r of yearRows[yr]) {
      const month = new Date(r.d + "T00:00:00").getMonth();
      if (r[obsKey] != null) grid[month].push(r[obsKey]);
    }
    for (let m = 0; m < 12; m++) {
      const temps = grid[m];
      monthlyData[yr][m] = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
    }
  }

  const headers = [
    { label: "Year" },
    ...MONTHS.map(m => ({ label: m, align: "center" })),
    { label: "Avg", align: "center" },
  ];

  const dataRows = yrs.map(yr => {
    const c = YEAR_COLORS[yr] || "#999";
    const vals = Array.from({ length: 12 }, (_, m) => monthlyData[yr][m]);
    const valid = vals.filter(v => v != null);
    const avg = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
    return {
      cells: [
        { value: yr, style: { color: c, fontWeight: 700 } },
        ...vals.map((v, m) => ({ value: v != null ? v.toFixed(1) : "—", style: { textAlign: "center", color: tempColor(v) } })),
        { value: avg != null ? avg.toFixed(1) : "—", style: { textAlign: "center", fontWeight: 700, color: "#e0e0e0" } },
      ],
    };
  });

  const meanVals = Array.from({ length: 12 }, (_, m) => {
    const vals = yrs.map(yr => monthlyData[yr][m]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  });
  const allMean = meanVals.filter(v => v != null);
  const grandAvg = allMean.length ? allMean.reduce((a, b) => a + b, 0) / allMean.length : null;

  dataRows.push({
    cells: [
      { value: "Mean", style: { color: "#888", fontWeight: 600, fontStyle: "italic" } },
      ...meanVals.map(v => ({ value: v != null ? v.toFixed(1) : "—", style: { textAlign: "center", color: "#888" } })),
      { value: grandAvg != null ? grandAvg.toFixed(1) : "—", style: { textAlign: "center", color: "#888", fontWeight: 600 } },
    ],
  });

  return (
    <Panel title={`MONTHLY ${label} TEMPERATURE (ERA5, °C)`} titleColor="#f2cc8f">
      <DataTable headers={headers} rows={dataRows} minWidth={700} stickyFirstColumn />
    </Panel>
  );
}