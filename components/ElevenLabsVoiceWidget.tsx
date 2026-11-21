"use client";

import { useEffect } from "react";

const AGENT_ID = "agent_4401m7e4gjxfejwbvx9t4vgr8bth";
const EMBED_URL = "https://unpkg.com/@elevenlabs/convai-widget-embed";

export default function ElevenLabsVoiceWidget() {
  useEffect(() => {
    const host = document.getElementById("neas-elevenlabs-widget");
    if (!host || host.querySelector("elevenlabs-convai")) return;

    const widget = document.createElement("elevenlabs-convai");
    widget.setAttribute("agent-id", AGENT_ID);
    host.appendChild(widget);

    const existing = document.querySelector('script[data-neas-elevenlabs="true"]');
    if (!existing) {
      const script = document.createElement("script");
      script.src = EMBED_URL;
      script.async = true;
      script.type = "text/javascript";
      script.dataset.neasElevenlabs = "true";
      document.body.appendChild(script);
    }

    return () => {
      widget.remove();
    };
  }, []);

  return <div id="neas-elevenlabs-widget" aria-label="Talk with NEAS AI" />;
}
