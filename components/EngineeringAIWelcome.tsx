export const NEAS_ENGINEERING_AI_WELCOME =
  "Welcome to NEAS Engineering Intelligence. I am NEAS Engineering AI, your engineering and project intelligence assistant from NextEdge Access Solutions. I can assist with technical engineering, rope access, renewable energy, industrial maintenance, safety, project execution, and commercial planning. How can I support your engineering requirements today?";

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
