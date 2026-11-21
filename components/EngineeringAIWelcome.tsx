export const NEAS_ENGINEERING_AI_WELCOME =
  "Welcome to NextEdge Access Solutions. I am NEAS Engineering AI, your intelligent engineering assistant. I can help you with rope access, renewable energy, offshore and onshore operations, industrial engineering, inspections, technical calculations, project planning, and engineering solutions. How may I assist you today?";

export default function EngineeringAIWelcome() {
  return (
    <div style={{ padding: "12px 13px", border: "1px solid rgba(202,147,50,.24)", borderRadius: 12, background: "linear-gradient(135deg, rgba(202,147,50,.10), rgba(7,29,41,.48))" }}>
      <div style={{ color: "#EBC07E", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", marginBottom: 7 }}>
        NEAS Engineering AI
      </div>
      <p style={{ color: "rgba(245,242,234,.88)", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
        {NEAS_ENGINEERING_AI_WELCOME}
      </p>
    </div>
  );
}
