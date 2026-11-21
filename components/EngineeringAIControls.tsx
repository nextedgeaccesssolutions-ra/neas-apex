type Props = {
  status: "disconnected" | "connecting" | "connected";
  isMuted: boolean;
  mode: "none" | "voice" | "text";
  onStartVoice: () => void;
  onStartText: () => void;
  onToggleMute: () => void;
  onStop: () => void;
  onRetry: () => void;
  hasError: boolean;
};

const buttonStyle: React.CSSProperties = {
  border: "1px solid rgba(202,147,50,.35)",
  background: "rgba(7,29,41,.72)",
  color: "#EBC07E",
  borderRadius: 9,
  padding: "9px 11px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: ".08em",
  cursor: "pointer",
};

export default function EngineeringAIControls({ status, isMuted, mode, onStartVoice, onStartText, onToggleMute, onStop, onRetry, hasError }: Props) {
  const busy = status === "connecting";
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {status !== "connected" && (
        <>
          <button type="button" disabled={busy} onClick={onStartVoice} style={{ ...buttonStyle, background: "linear-gradient(135deg,#CA9332,#EBC07E)", color: "#071D29", opacity: busy ? .55 : 1 }}>
            {busy ? "CONNECTING…" : "ENABLE VOICE"}
          </button>
          <button type="button" disabled={busy} onClick={onStartText} style={{ ...buttonStyle, opacity: busy ? .55 : 1 }}>
            TEXT CHAT
          </button>
        </>
      )}
      {status === "connected" && mode === "voice" && (
        <button type="button" onClick={onToggleMute} style={buttonStyle} aria-pressed={isMuted}>
          {isMuted ? "UNMUTE MIC" : "MUTE MIC"}
        </button>
      )}
      {status === "connected" && mode === "text" && (
        <button type="button" onClick={onStartVoice} style={buttonStyle}>SWITCH TO VOICE</button>
      )}
      {status === "connected" && (
        <button type="button" onClick={onStop} style={{ ...buttonStyle, borderColor: "rgba(248,113,113,.45)", color: "#fca5a5" }}>
          STOP SESSION
        </button>
      )}
      {hasError && status !== "connecting" && (
        <button type="button" onClick={onRetry} style={{ ...buttonStyle, borderColor: "rgba(248,113,113,.45)", color: "#fca5a5" }}>
          RETRY
        </button>
      )}
    </div>
  );
}
