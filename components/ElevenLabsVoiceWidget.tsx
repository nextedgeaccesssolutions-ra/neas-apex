"use client";

import Script from "next/script";
import { createElement } from "react";

const AGENT_ID = "agent_8601m7zrgsg4f98srgkekzq7ana9";
const WIDGET_SCRIPT = "https://unpkg.com/@elevenlabs/convai-widget-embed";

export default function ElevenLabsVoiceWidget() {
  return (
    <>
      <div id="neas-elevenlabs-widget" aria-label="Talk with NEAS AI">
        {createElement("elevenlabs-convai", { "agent-id": AGENT_ID })}
      </div>
      <Script src={WIDGET_SCRIPT} strategy="afterInteractive" />
    </>
  );
}
