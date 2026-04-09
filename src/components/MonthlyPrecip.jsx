import { YEAR_COLORS, MONTHS } from "../config";
import { useYearlyData } from "../hooks";
import { precipColor } from "../utils";
import Panel from "./Panel";
import DataTable from "./DataTable";

export default function MonthlyPrecip({ rawData }) {
  if (!rawData) return null;
  const { yrs, yearRows } = useYearlyData(rawData);

  const monthlyData = {};
  for (const yr of yrs) {
    monthlyData[yr] = {};
    const grid = {};
    for (let m = 0; m < 12; m++) grid[m] = [];
    for (const r of yearRows[yr]) {
      const month = new Date(r.d + "T00:00:00").getMonth();
      if (r.op != null) grid[month].push(r.op);
    }
    for (let m = 0; m < 12; m++) {
      monthlyData[yr][m] = grid[m].length ? grid[m].reduce((a, b) => a + b, 0) : null;
    }
  }

  const headers = [
    { label: "Year" },
    ...MONTHS.map(m => ({ label: m, align: "center" })),
    { label: "Total", align: "center" },
  ];

  const dataRows = yrs.map(yr => {
    const c = YEAR_COLORS[yr] || "#999";
    const vals = Array.from({ length: 12 }, (_, m) => monthlyData[yr][m]);
    const total = vals.filter(v => v != null).reduce((a, b) => a + b, 0);
    return {
      cells: [
        { value: yr, style: { color: c, fontWeight: 700 } },
        ...vals.map(v => ({ value: v != null ? v.toFixed(0) : "—", style: { textAlign: "center", color: precipColor(v) } })),
        { value: total.toFixed(0), style: { textAlign: "center", fontWeight: 700, color: "#e0e0e0" } },
      ],
    };
  });

  return (
    <Panel title="MONTHLY TOTAL PRECIPITATION (ERA5, mm)" titleColor="#7fb8d8">
      <DataTable headers={headers} rows={dataRows} minWidth={700} stickyFirstColumn />
    </Panel>
  );
}