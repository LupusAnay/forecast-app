export default function Panel({ title, titleColor, note, children, style }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {title && (
        <h2 style={{ fontSize: 13, fontWeight: 700, color: titleColor || "#e07a5f", margin: "0 0 10px", letterSpacing: "0.05em" }}>
          {title}
        </h2>
      )}
      {note && <p style={{ fontSize: 10, color: "#666", margin: "0 0 10px", lineHeight: 1.6 }}>{note}</p>}
      <div style={{ background: "#16213e", border: "1px solid #222", borderRadius: 6, overflow: "auto", ...style }}>
        {children}
      </div>
      {note && typeof note !== "string" && note}
    </div>
  );
}