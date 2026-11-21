"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { useConversation } from "@elevenlabs/react";
import EngineeringAIControls from "./EngineeringAIControls";
import EngineeringAIStatus from "./EngineeringAIStatus";
import EngineeringAIWaveform from "./EngineeringAIWaveform";
import EngineeringAIWelcome, { NEAS_ENGINEERING_AI_WELCOME } from "./EngineeringAIWelcome";

const GREETING_KEY = "neas-engineering-ai-voice-greeting-spoken";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
type IncomingMessage = { message: unknown; source?: string; role?: string; event_id?: number | string; response_id?: string };

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function stringField(value: unknown, key: string): string | null {
  const field = record(value)?.[key];
  return typeof field === "string" && field.trim() ? field.trim() : null;
}

function extractMessageText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  const root = record(value);
  if (!root) return null;
  const userTranscript = record(root.user_transcription_event);
  const agentResponse = record(root.agent_response_event);
  const correction = record(root.agent_response_correction_event);
  const candidates = [root.text, root.message, userTranscript?.user_transcript, agentResponse?.agent_response, correction?.agent_response, correction?.corrected_agent_response];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

function dispatchProcessing(processing: boolean) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("neas-ai-processing", { detail: { processing } }));
}

const panelStyle: CSSProperties = {
  position: "fixed", right: "clamp(12px, 2vw, 28px)", bottom: 16, zIndex: 80,
  width: "min(390px, calc(100vw - 24px))", color: "#f5f2ea",
  background: "linear-gradient(160deg, rgba(7,29,41,.97), rgba(3,12,19,.97))",
  border: "1px solid rgba(202,147,50,.42)", borderRadius: 16,
  boxShadow: "0 16px 52px rgba(0,0,0,.52), 0 0 26px rgba(202,147,50,.12)",
  backdropFilter: "blur(18px)", overflow: "hidden",
};

export default function ElevenLabsVoiceWidget() {
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionMode, setSessionMode] = useState<"none" | "voice" | "text">("none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [outputLevel, setOutputLevel] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startLock = useRef(false);
  const sessionModeRef = useRef<"none" | "voice" | "text">("none");
  const seenMessageIds = useRef(new Set<string>());

  const appendMessage = useCallback((role: "user" | "assistant", value: unknown) => {
    const text = extractMessageText(value);
    if (!text) return;
    const responseId = stringField(value, "response_id") || stringField(value, "event_id") || stringField(value, "message_id");
    setMessages((previous) => {
      const last = previous[previous.length - 1];
      if (last?.role === role && last.text === text) return previous;
      const id = responseId || `${role}:${Date.now()}:${previous.length}`;
      const existing = previous.findIndex((item) => item.id === id);
      if (existing >= 0) return previous.map((item, index) => index === existing ? { ...item, text } : item);
      if (seenMessageIds.current.has(id)) return previous;
      seenMessageIds.current.add(id);
      return [...previous, { id, role, text }];
    });
    if (role === "assistant") {
      if (text === NEAS_ENGINEERING_AI_WELCOME && typeof window !== "undefined") window.sessionStorage.setItem(GREETING_KEY, "1");
      setPending(false);
      dispatchProcessing(false);
    }
  }, []);

  const conversation = useConversation({
    onMessage: (event) => {
      const payload = event as unknown as IncomingMessage;
      appendMessage(payload.source === "user" || payload.role === "user" ? "user" : "assistant", payload.message);
    },
    onConnect: () => setError(""),
    onDisconnect: () => {
      setPending(false);
      dispatchProcessing(false);
      setOutputLevel(0);
      setSessionMode("none");
    },
    onError: (message) => {
      setError(typeof message === "string" ? message : "The voice service encountered an error.");
      setPending(false);
      dispatchProcessing(false);
    },
  });

  const { status, isSpeaking, isListening, isMuted, setMuted, startSession, endSession, sendUserMessage, sendUserActivity, getOutputVolume } = conversation;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    if (status !== "connected" || sessionMode !== "voice" || !isSpeaking) {
      setOutputLevel(0);
      return;
    }
    const timer = window.setInterval(() => {
      try {
        const level = getOutputVolume();
        setOutputLevel(Math.max(0, Math.min(1, Number.isFinite(level) ? level : 0)));
      } catch {
        setOutputLevel(0);
      }
    }, 90);
    return () => window.clearInterval(timer);
  }, [status, sessionMode, isSpeaking, getOutputVolume]);

  useEffect(() => () => {
    dispatchProcessing(false);
    try { endSession(); } catch { /* Session may already be disconnected during unmount. */ }
  }, [endSession]);

  const startVoice = useCallback(async () => {
    if (startLock.current || status === "connecting") return;
    if (status === "connected" && sessionModeRef.current === "voice") return;
    startLock.current = true;
    setError("");
    setPending(false);
    try {
      if (status === "connected") await endSession();
      const tokenResponse = await fetch("/api/elevenlabs/token", { cache: "no-store" });
      const tokenData = await tokenResponse.json().catch(() => ({})) as { token?: string; error?: string };
      if (!tokenResponse.ok || typeof tokenData.token !== "string" || tokenData.token.length === 0) {
        throw new Error(tokenData.error || "Unable to prepare a secure voice session.");
      }
      const greetingAlreadySpoken = window.sessionStorage.getItem(GREETING_KEY) === "1";
      await startSession({
        conversationToken: tokenData.token,
        connectionType: "webrtc",
        ...(greetingAlreadySpoken ? { overrides: { agent: { firstMessage: "" } } } : {}),
      });
      sessionModeRef.current = "voice";
      setSessionMode("voice");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to start the NEAS voice session.";
      setError(message.toLowerCase().includes("microphone") || message.toLowerCase().includes("permission")
        ? "Microphone access was not granted. Allow microphone access or continue with text chat."
        : message);
      setPending(false);
      dispatchProcessing(false);
    } finally {
      startLock.current = false;
    }
  }, [endSession, startSession, status]);

  const startText = useCallback(async () => {
    if (startLock.current || status === "connecting") return false;
    if (status === "connected" && sessionModeRef.current === "text") return true;
    startLock.current = true;
    setError("");
    setPending(false);
    try {
      if (status === "connected") await endSession();
      const signedResponse = await fetch("/api/elevenlabs/signed-url", { cache: "no-store" });
      const signedData = await signedResponse.json().catch(() => ({})) as { signedUrl?: string; error?: string };
      if (!signedResponse.ok || typeof signedData.signedUrl !== "string" || !signedData.signedUrl) {
        throw new Error(signedData.error || "Text chat is temporarily unavailable.");
      }
      await startSession({
        signedUrl: signedData.signedUrl,
        connectionType: "websocket",
        overrides: { conversation: { textOnly: true }, agent: { firstMessage: "" } },
      });
      sessionModeRef.current = "text";
      setSessionMode("text");
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Text chat is temporarily unavailable.");
      return false;
    } finally {
      startLock.current = false;
    }
  }, [endSession, startSession, status]);

  const stopSession = useCallback(async () => {
    setPending(false);
    dispatchProcessing(false);
    setOutputLevel(0);
    sessionModeRef.current = "none";
    setSessionMode("none");
    try {
      await endSession();
    } catch {
      setError("The session could not be closed cleanly. You can retry.");
    }
  }, [endSession]);

  const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || status === "connecting") return;
    if (status !== "connected") {
      const connected = await startText();
      if (!connected) return;
    }
    setMessages((previous) => [...previous, { id: `visitor-${Date.now()}-${previous.length}`, role: "user", text }]);
    setInput("");
    setPending(true);
    dispatchProcessing(true);
    try {
      sendUserActivity();
      sendUserMessage(text);
    } catch {
      setPending(false);
      dispatchProcessing(false);
      setError("Your message could not be sent. Please try again.");
    }
  };

  const retry = () => {
    if (sessionModeRef.current === "voice") void startVoice();
    else void startText();
  };

  const stateLabel = error ? "ERROR" : status === "connecting" ? "CONNECTING" : status === "connected" && isSpeaking ? "SPEAKING" : status === "connected" && pending ? "THINKING" : status === "connected" && isListening ? "LISTENING" : "STANDBY";

  return (
    <section style={panelStyle} aria-label="NEAS Engineering AI conversation">
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid rgba(202,147,50,.2)", background: "linear-gradient(100deg,rgba(202,147,50,.12),rgba(7,29,41,.1))" }}>
        <div style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", border: "1px solid rgba(235,192,126,.55)", color: "#EBC07E", boxShadow: "0 0 18px rgba(202,147,50,.18)", fontSize: 15, fontWeight: 800 }}>N</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", color: "#EBC07E", fontWeight: 800 }}>NEAS ENGINEERING AI</div>
          <div style={{ fontSize: 9, color: "rgba(245,242,234,.52)", marginTop: 3 }}>Engineering intelligence · Voice & text</div>
        </div>
        <EngineeringAIStatus status={status} isSpeaking={isSpeaking} isListening={isListening} isProcessing={pending} hasError={Boolean(error)} />
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Collapse NEAS AI panel" : "Expand NEAS AI panel"} style={{ border: "1px solid rgba(202,147,50,.32)", background: "rgba(7,29,41,.72)", color: "#EBC07E", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>{expanded ? "−" : "+"}</button>
      </header>
      {expanded && (
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <EngineeringAIWaveform level={outputLevel} active={status === "connected" && isSpeaking && sessionMode === "voice"} listening={status === "connected" && isListening} />
          {messages.length === 0 && <EngineeringAIWelcome />}
          <div aria-live="polite" aria-relevant="additions text" style={{ height: 158, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "2px 2px 4px" }}>
            {messages.map((message) => (
              <div key={message.id} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "91%", padding: "8px 10px", borderRadius: 10, background: message.role === "user" ? "rgba(202,147,50,.16)" : "rgba(255,255,255,.055)", border: `1px solid ${message.role === "user" ? "rgba(202,147,50,.28)" : "rgba(255,255,255,.08)"}` }}>
                <div style={{ fontSize: 8, letterSpacing: ".14em", color: message.role === "user" ? "#EBC07E" : "rgba(87,207,226,.8)", marginBottom: 4 }}>{message.role === "user" ? "YOU" : "NEAS AI"}</div>
                <p style={{ margin: 0, color: "rgba(245,242,234,.9)", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</p>
              </div>
            ))}
            {pending && <div style={{ alignSelf: "flex-start", color: "#EBC07E", fontSize: 10, letterSpacing: ".08em", padding: "5px 8px" }}>NEAS AI is processing…</div>}
            <div ref={bottomRef} />
          </div>
          {error && <div role="alert" style={{ border: "1px solid rgba(248,113,113,.35)", background: "rgba(127,29,29,.16)", color: "#fecaca", borderRadius: 9, padding: "8px 10px", fontSize: 10, lineHeight: 1.45 }}>{error}</div>}
          <form onSubmit={submitMessage} style={{ display: "flex", gap: 7 }}>
            <input value={input} onChange={(event) => { setInput(event.target.value); if (status === "connected") sendUserActivity(); }} placeholder="Ask an engineering question…" aria-label="Message NEAS Engineering AI" maxLength={4000} style={{ minWidth: 0, flex: 1, color: "#f5f2ea", background: "rgba(0,0,0,.25)", border: "1px solid rgba(202,147,50,.28)", borderRadius: 9, padding: "10px 11px", fontSize: 11, outline: "none" }} />
            <button type="submit" disabled={!input.trim() || status === "connecting"} style={{ border: "1px solid rgba(202,147,50,.35)", background: "linear-gradient(135deg,#CA9332,#EBC07E)", color: "#071D29", borderRadius: 8, padding: "8px 11px", fontSize: 10, fontWeight: 900, opacity: !input.trim() || status === "connecting" ? .45 : 1, cursor: "pointer" }}>SEND</button>
          </form>
          <EngineeringAIControls status={status} isMuted={isMuted} mode={sessionMode} onStartVoice={() => void startVoice()} onStartText={() => void startText()} onToggleMute={() => setMuted(!isMuted)} onStop={() => void stopSession()} onRetry={retry} hasError={Boolean(error)} />
          <div style={{ color: "rgba(245,242,234,.35)", fontSize: 8, lineHeight: 1.4 }}>Voice starts only after you enable it. Microphone access is controlled by your browser. NEAS AI is not a substitute for qualified engineering or safety approval.</div>
        </div>
      )}
    </section>
  );
}
