type Props = { level: number; active: boolean; listening?: boolean };

export default function EngineeringAIWaveform({ level, active, listening = false }: Props) {
  const normalized = Math.max(0, Math.min(1, level));
  return (
    <div aria-hidden="true" style={{ height: 34, display: "flex", alignItems: "center", justifyContent: "center", gap: 3, overflow: "hidden" }}>
      {Array.from({ length: 24 }, (_, index) => {
        const shape = 0.18 + Math.abs(Math.sin(index * 0.71)) * 0.82;
        const base = active ? 4 + normalized * 27 * shape : listening ? 4 + shape * 5 : 3 + shape * 3;
        return (
          <span
            key={index}
            style={{
              display: "block",
              width: 3,
              height: base,
              borderRadius: 4,
              background: active ? "#EBC07E" : listening ? "#57cfe2" : "rgba(202,147,50,.55)",
              opacity: active ? .45 + normalized * .55 : .55,
              boxShadow: active && normalized > .12 ? "0 0 7px rgba(235,192,126,.45)" : "none",
              transition: "height 90ms linear, opacity 90ms linear",
            }}
          />
        );
      })}
    </div>
  );
}
