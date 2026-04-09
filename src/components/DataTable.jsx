export default function DataTable({ headers, rows, minWidth, stickyFirstColumn }) {
  const th = { padding: "8px 8px", textAlign: "left", color: "#888", fontWeight: 600 };
  const td = { padding: "6px 8px" };

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth }}>
      <thead>
        <tr style={{ borderBottom: "1px solid #333" }}>
          {headers.map((h, i) => {
            const firstColStyle = stickyFirstColumn && i === 0
              ? { ...th, position: "sticky", left: 0, background: "#16213e" }
              : h.align === "center" ? { ...th, textAlign: "center" } : th;
            return <th key={i} style={firstColStyle}>{h.label}</th>;
          })}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ borderBottom: "1px solid #1f2f4f", background: row.highlight ? "#1a2a3e" : "transparent" }}>
            {row.cells.map((cell, ci) => {
              const firstColStyle = stickyFirstColumn && ci === 0
                ? { ...td, position: "sticky", left: 0, background: "#16213e" }
                : td;
              return <td key={ci} style={{ ...firstColStyle, ...cell.style }}>{cell.value ?? "—"}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}