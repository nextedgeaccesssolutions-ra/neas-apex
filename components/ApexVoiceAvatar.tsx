"use client";

import type { OrbState } from "./ApexHeroOrb";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "STANDBY",
  listening: "LISTENING",
  thinking: "THINKING",
  speaking: "SPEAKING",
};

export default function ApexVoiceAvatar({ state, connected = false }: { state: OrbState; connected?: boolean }) {
  const outputLevel = state === "speaking" ? 0.9 : state === "listening" ? 0.42 : state === "thinking" ? 0.28 : connected ? 0.12 : 0;
  const statusLabel = state === "idle" && connected ? "VOICE READY" : STATE_LABEL[state];

  return (
    <div className="neas-avatar-console" data-state={state} data-connected={connected ? "true" : "false"} aria-label={`NEAS AI holographic assistant, ${statusLabel.toLowerCase()}`}>
      <div className="neas-avatar-portrait" aria-hidden="true">
        <div className="neas-avatar-halo" />
        <img src="/neas-ai-avatar.webp" alt="" className="neas-avatar-face-image" />
        <span className="neas-avatar-eye-glow neas-avatar-eye-left" />
        <span className="neas-avatar-eye-glow neas-avatar-eye-right" />
        <div
          className="neas-avatar-wave-bars"
          style={{ transform: `scaleY(${0.45 + outputLevel * 1.8})` }}
          aria-hidden="true"
        >
          {Array.from({ length: 15 }, (_, index) => <span key={index} />)}
        </div>
        <div className="neas-avatar-scanline" />
      </div>
      <div className="neas-avatar-caption">
        <span className="neas-avatar-live-dot" />
        <span>NEAS AI CORE</span>
        <span className="neas-avatar-state">{statusLabel}</span>
      </div>
    </div>
  );
}
