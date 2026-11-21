type Props = {
  status: "disconnected" | "connecting" | "connected";
  isSpeaking: boolean;
  isListening: boolean;
  isProcessing: boolean;
  hasError: boolean;
};

export default function EngineeringAIStatus({ status, isSpeaking, isListening, isProcessing, hasError }: Props) {
  const label = hasError
    ? "ERROR"
    : status === "connecting"
      ? "CONNECTING"
      : status === "connected" && isSpeaking
        ? "SPEAKING"
        : status === "connected" && isProcessing
          ? "THINKING"
          : status === "connected" && isListening
            ? "LISTENING"
            : status === "connected"
              ? "READY"
              : "STANDBY";
  const active = status === "connected" && !hasError;
  const color = hasError ? "#f87171" : active ? "#34d399" : "#CA9332";

  return (
    <div role="status" aria-live="polite" style={{ display: "inline-flex", alignItems: "center", gap: 7, color, fontSize: 9, letterSpacing: ".16em", fontWeight: 700 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, boxShadow: `0 0 10px ${color}`, animation: active ? "neasStatusPulse 1.5s ease-in-out infinite" : "none" }} />
      {label}
      <style>{`@keyframes neasStatusPulse { 0%,100%{opacity:.45;transform:scale(.86)} 50%{opacity:1;transform:scale(1.12)} }`}</style>
    </div>
  );
}
