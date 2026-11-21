"use client";

import Script from "next/script";
import { createElement } from "react";

const AGENT_ID = "agent_3901m7zr1ncwf0ss97n0ft314epy";
const WIDGET_SCRIPT = "https://unpkg.com/@elevenlabs/convai-widget-embed";

export default function ElevenLabsVoiceWidget() {
  return (
    <>
      <div id="neas-elevenlabs-widget" aria-label="Talk with NEAS AI">
        {createElement("elevenlabs-convai", { "agent-id": AGENT_ID })}
      </div>
      <Script
        src={WIDGET_SCRIPT}
        strategy="afterInteractive"
      />
    </>
  );
}
