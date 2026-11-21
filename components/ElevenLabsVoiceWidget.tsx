"use client";

import {
  ConversationProvider,
  useConversation,
} from "@elevenlabs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import "./neas-voice-widget.css";

const WELCOME =
  "Welcome to NextEdge Access Solutions. I am NEAS Engineering AI, your intelligent engineering assistant. I can help you with rope access, renewable energy, offshore and onshore operations, industrial engineering, inspections, technical calculations, project planning, and engineering solutions. How may I assist you today?";
const GREETING_KEY = "neas-apex-greeting-delivered-v1";

type ChatLine = { id: string; role: "user" | "assistant"; text: string };

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ElevenLabsVoiceWidget() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [greetingDone, setGreetingDone] = useState(false);
  const [providerError, setProviderError] = useState("");

  useEffect(() => {
    setGreetingDone(window.sessionStorage.getItem(GREETING_KEY) === "1");
  }, []);

  const markGreetingDone = () => {
    window.sessionStorage.setItem(GREETING_KEY, "1");
    setGreetingDone(true);
  };

  return (
    <ConversationProvider
      onMessage={(event) => {
        const text = typeof event.message === "string" ? event.message.trim() : "";
        if (!text) return;
        if (!greetingDone) markGreetingDone();
        setLines((currentLines) => {
          const last = currentLines[currentLines.length - 1];
          if (last?.role === "assistant" && last.text === text) return currentLines;
          return [...currentLines, { id: makeId(), role: "assistant", text }];
        });
      }}
      onUserTranscript={(event) => {
        const text = typeof event.message === "string" ? event.message.trim() : "";
        if (!text) return;
        setLines((currentLines) => {
          const last = currentLines[currentLines.length - 1];
          if (last?.role === "user" && last.text === text) return currentLines;
          return [...currentLines, { id: makeId(), role: "user", text }];
        });
      }}
      onError={(error) => setProviderError(String(error || "Voice connection failed."))}
    >
      <NEASVoicePanel
        lines={lines}
        setLines={setLines}
        greetingDone={greetingDone}
        providerError={providerError}
        clearProviderError={() => setProviderError("")}
      />
    </ConversationProvider>
  );
}

function NEASVoicePanel({
  lines,
  setLines,
  greetingDone,
  providerError,
  clearProviderError,
}: {
  lines: ChatLine[];
  setLines: Dispatch<SetStateAction<ChatLine[]>>;
  greetingDone: boolean;
  providerError: string;
  clearProviderError: () => void;
}) {
  const {
    status,
    isSpeaking,
    isListening,
    isMuted,
    setMuted,
    startSession,
    endSession,
    sendUserMessage,
    getOutputVolume,
  } = useConversation();

  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [pendingText, setPendingText] = useState("");
  const [busy, setBusy] = useState(false);
  const [level, setLevel] = useState(0);
  const [localError, setLocalError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const connected = status === "connected";
  const connecting = status === "connecting";
  const error = localError || providerError;

  useEffect(() => {
    if (!isSpeaking) {
      setLevel(0);
      return;
    }
    const timer = window.setInterval(() => {
      try {
        setLevel(Math.max(0, Math.min(1, getOutputVolume())));
      } catch {
        setLevel(0.2);
      }
    }, 70);
    return () => window.clearInterval(timer);
  }, [isSpeaking, getOutputVolume]);

  useEffect(() => {
    if (pendingText && connected) {
      sendUserMessage(pendingText);
      setPendingText("");
      setBusy(false);
      setExpanded(true);
    }
  }, [pendingText, connected, sendUserMessage]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [lines, expanded]);

  const greeting = useMemo(
    () => greetingDone ? "Welcome back. Your NEAS Engineering AI workspace is ready." : WELCOME,
    [greetingDone],
  );

  const sessionOverrides = () => ({
    agent: {
      firstMessage: greetingDone ? "" : WELCOME,
      language: "en" as const,
    },
  });

  const startVoice = async () => {
    if (connected || connecting || busy) return;
    setLocalError("");
    clearProviderError();
    setMode("voice");
    setBusy(true);
    try {
      const response = await fetch("/api/elevenlabs/token", {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.token !== "string") {
        throw new Error(payload.error || "Voice service is not configured.");
      }
      startSession({
        conversationToken: payload.token,
        connectionType: "webrtc",
        overrides: sessionOverrides(),
      });
      setExpanded(true);
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Unable to start voice.");
    } finally {
      setBusy(false);
    }
  };

  const startTextSession = async (firstMessage: string) => {
    if (connected || connecting || busy) {
      if (connected && firstMessage.trim()) sendUserMessage(firstMessage.trim());
      else if (firstMessage.trim()) setPendingText(firstMessage.trim());
      return;
    }
    setLocalError("");
    clearProviderError();
    setMode("text");
    setBusy(true);
    setPendingText(firstMessage.trim());
    try {
      const response = await fetch("/api/elevenlabs/signed-url", {
        method: "GET",
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      const payload = await response.json();
      if (!response.ok || typeof payload.signedUrl !== "string") {
        throw new Error(payload.error || "Text chat service is not configured.");
      }
      startSession({
        signedUrl: payload.signedUrl,
        overrides: {
          ...sessionOverrides(),
          conversation: { textOnly: true },
        },
      });
      setExpanded(true);
    } catch (cause) {
      setPendingText("");
      setBusy(false);
      setLocalError(cause instanceof Error ? cause.message : "Unable to start text chat.");
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setLines((currentLines) => [...currentLines, { id: makeId(), role: "user", text }]);
    if (connected) sendUserMessage(text);
    else void startTextSession(text);
  };

  const stop = () => {
    endSession();
    setBusy(false);
    setPendingText("");
    setLevel(0);
  };

  const newConversation = () => {
    endSession();
    setLines([]);
    setLocalError("");
    clearProviderError();
    setPendingText("");
    setBusy(false);
    setExpanded(true);
  };

  const stateLabel = connecting || busy
    ? "CONNECTING"
    : isSpeaking
      ? "SPEAKING"
      : isListening
        ? "LISTENING"
        : connected
          ? "ONLINE"
          : "STANDBY";

  return (
    <aside className={`neas-ai-dock ${expanded ? "neas-ai-dock-open" : ""}`} aria-label="NEAS Engineering AI assistant">
      {expanded && (
        <section className="neas-ai-panel" aria-label="NEAS AI conversation">
          <header className="neas-ai-header">
            <div className="neas-ai-brand">
              <span className={`neas-ai-status-dot ${connected ? "is-live" : ""}`} />
              <div>
                <strong>NEAS ENGINEERING AI</strong>
                <small>ENGINEERING INTELLIGENCE</small>
              </div>
            </div>
            <button className="neas-ai-icon-button" type="button" onClick={() => setExpanded(false)} aria-label="Minimize assistant">−</button>
          </header>

          <div className={`neas-ai-avatar-stage ${isSpeaking ? "is-speaking" : ""} ${isListening ? "is-listening" : ""} ${connecting ? "is-thinking" : ""}`}>
            <div className="neas-ai-orbit orbit-one" />
            <div className="neas-ai-orbit orbit-two" />
            <div className="neas-ai-avatar">
              <span className="neas-ai-eye eye-left" />
              <span className="neas-ai-eye eye-right" />
              <span className="neas-ai-mouth" />
            </div>
            <div className="neas-ai-wave" aria-hidden="true">
              {Array.from({ length: 21 }, (_, index) => (
                <i key={index} style={{ transform: `scaleY(${isSpeaking ? 0.25 + level * (0.35 + ((index * 7) % 11) / 12) : isListening ? 0.5 : 0.18})` }} />
              ))}
            </div>
          </div>

          <div className="neas-ai-state-row">
            <span>{stateLabel}</span>
            <span>{mode === "text" && connected ? "TEXT SESSION" : "VOICE INTELLIGENCE"}</span>
          </div>

          <div className="neas-ai-messages" ref={scrollRef} aria-live="polite">
            {lines.length === 0 && <p className="neas-ai-greeting">{greeting}</p>}
            {lines.map((line) => (
              <div key={line.id} className={`neas-ai-message ${line.role === "user" ? "from-user" : "from-ai"}`}>
                <small>{line.role === "user" ? "YOU" : "NEAS AI"}</small>
                <p>{line.text}</p>
              </div>
            ))}
            {error && <div className="neas-ai-error" role="alert">{error}</div>}
          </div>

          <form className="neas-ai-composer" onSubmit={submit}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask an engineering question…"
              aria-label="Message NEAS Engineering AI"
              maxLength={4000}
            />
            <button type="submit" disabled={!draft.trim() || busy} aria-label="Send message">➤</button>
          </form>

          <div className="neas-ai-actions">
            {!connected ? (
              <>
                <button type="button" className="primary" onClick={() => void startVoice()} disabled={busy || connecting}>
                  {busy || connecting ? "CONNECTING…" : "START VOICE"}
                </button>
                <button type="button" onClick={() => void startTextSession("")} disabled={busy || connecting}>TEXT MODE</button>
              </>
            ) : (
              <>
                {mode === "voice" && (
                  <button type="button" onClick={() => setMuted(!isMuted)}>{isMuted ? "UNMUTE" : "MUTE"}</button>
                )}
                <button type="button" onClick={stop}>STOP AI</button>
                <button type="button" onClick={newConversation}>NEW CHAT</button>
              </>
            )}
            {error && <button type="button" onClick={() => { setLocalError(""); clearProviderError(); if (mode === "voice") void startVoice(); else void startTextSession(""); }}>RETRY</button>}
          </div>
        </section>
      )}

      <div className="neas-ai-dock-bar">
        <button className="neas-ai-core-button" type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Close NEAS AI" : "Open NEAS AI"}>
          <span className="neas-ai-core-glyph">N</span>
        </button>
        <div className="neas-ai-dock-copy">
          <strong>NEAS AI</strong>
          <small>{stateLabel}</small>
        </div>
        {!connected ? (
          <button className="neas-ai-start-button" type="button" onClick={() => void startVoice()} disabled={busy || connecting}>
            {busy || connecting ? "…" : "ENABLE VOICE"}
          </button>
        ) : (
          <>
            {mode === "voice" && <button className="neas-ai-mini-button" type="button" onClick={() => setMuted(!isMuted)} aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}>{isMuted ? "UNMUTE" : "MUTE"}</button>}
            <button className="neas-ai-mini-button stop" type="button" onClick={stop}>STOP</button>
          </>
        )}
        <button className="neas-ai-expand-button" type="button" onClick={() => setExpanded((value) => !value)} aria-label="Toggle conversation panel">{expanded ? "×" : "↗"}</button>
      </div>
    </aside>
  );
}
