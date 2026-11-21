"use client";

import { useEffect, useRef, useState } from "react";

const AGENT_ID = "agent_4401m7e4gjxfejwbvx9t4vgr8bth";
const WIDGET_SCRIPT = "https://unpkg.com/@elevenlabs/convai-widget-embed";

type WidgetStatus = "loading" | "ready" | "error";

export default function ElevenLabsVoiceWidget() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<WidgetStatus>("loading");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let widget: HTMLElement | null = null;

    const mount = () => {
      if (cancelled || !host) return;
      if (host.querySelector("elevenlabs-convai")) {
        setStatus("ready");
        return;
      }
      widget = document.createElement("elevenlabs-convai");
      widget.setAttribute("agent-id", AGENT_ID);
      host.appendChild(widget);

      customElements.whenDefined("elevenlabs-convai").then(() => {
        if (!cancelled) setStatus("ready");
      }).catch(() => {
        if (!cancelled) setStatus("error");
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-neas-elevenlabs="true"]',
    );

    if (customElements.get("elevenlabs-convai")) {
      mount();
    } else if (existing) {
      if (existing.dataset.loaded === "true") mount();
      else {
        existing.addEventListener("load", mount, { once: true });
        existing.addEventListener("error", () => {
          if (!cancelled) setStatus("error");
        }, { once: true });
      }
    } else {
      const script = document.createElement("script");
      script.src = WIDGET_SCRIPT;
      script.async = true;
      script.type = "text/javascript";
      script.dataset.neasElevenlabs = "true";
      script.addEventListener("load", () => {
        script.dataset.loaded = "true";
        mount();
      }, { once: true });
      script.addEventListener("error", () => {
        if (!cancelled) setStatus("error");
      }, { once: true });
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      widget?.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      id="neas-elevenlabs-widget"
      aria-label="Talk with NEAS AI"
      data-agent-id={AGENT_ID}
      data-widget-status={status}
    />
  );
}
