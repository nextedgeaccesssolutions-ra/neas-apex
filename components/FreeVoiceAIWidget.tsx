"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import EngineeringAITaskEngine from "./EngineeringAITaskEngine";
import EngineeringAIWelcome from "./EngineeringAIWelcome";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };
type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative };
type RecognitionEvent = Event & { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = Event & { error: string };
type RecognitionInstance = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechRecognitionConstructor = new () => RecognitionInstance;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const panelStyle: CSSProperties = {
  position: "fixed", right: "clamp(12px, 2vw, 28px)", bottom: 16, zIndex: 80,
  width: "min(390px, calc(100vw - 24px))", color: "#f5f2ea",
  background: "linear-gradient(160deg, rgba(7,29,41,.97), rgba(3,12,19,.97))",
  border: "1px solid rgba(202,147,50,.42)", borderRadius: 16,
  boxShadow: "0 16px 52px rgba(0,0,0,.52), 0 0 26px rgba(202,147,50,.12)",
  backdropFilter: "blur(18px)", overflow: "hidden",
};

function speak(text: string, onStart: () => void, onEnd: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1;
  utterance.pitch = 1;
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us"))
    || voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
    || null;
  utterance.onstart = onStart;\n  utterance.onend = onEnd;\n  utterance.onerror = onEnd;\n  window.speechSynthesis.speak(utterance);
}

export default function FreeVoiceAIWidget() {
  const [expanded, setExpanded] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const voiceEnabledRef = useRef(false);
  const busyRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecognitionSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      recognitionRef.current?.abort();
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const sendMessage = useCallback(async (rawText: string, imageFile?: File | null) => {
    const text = rawText.trim();
    if ((!text && !imageFile) || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    setError("");
    const userMessage: ChatMessage = {
      id: `user:${Date.now()}`,
      role: "user",
      text: imageFile ? (text || "Please inspect this image and describe visible details. Separate observations from assumptions.") + ` [Image: ${imageFile.name}]` : text,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setPhoto(null);
    try {
      let image: { mimeType: string; data: string } | undefined;
      if (imageFile) {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("The selected image could not be read."));
          reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image data."));
          reader.readAsDataURL(imageFile);
        });
        image = { mimeType: imageFile.type, data: dataUrl.split(",")[1] || "" };
      }
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-12).map(({ role, text: messageText }) => ({ role, text: messageText })),
          ...(image ? { image } : {}),
        }),
      });
      const data = await response.json().catch(() => ({})) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || "NEAS AI is temporarily unavailable.");
      const reply = data.reply.trim();
      setMessages((current) => [...current, { id: `assistant:${Date.now()}`, role: "assistant", text: reply }]);
      if (voiceEnabledRef.current) speak(reply, () => setSpeaking(true), () => setSpeaking(false));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the free AI service.");
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }, [messages]);

  const startListening = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Speech recognition is not available in this browser. You can still use text chat.");
      return;
    }
    if (listening || pending) return;
    window.speechSynthesis?.cancel();
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) transcript += result[0].transcript;
      }
      if (transcript.trim()) void sendMessage(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(event.error === "not-allowed" ? "Microphone permission was denied. Allow microphone access in your browser." : `Speech recognition error: ${event.error}`);
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    setVoiceEnabled(true);
    voiceEnabledRef.current = true;
    setError("");
    try { recognition.start(); } catch {
      setListening(false);
      recognitionRef.current = null;
      setError("The microphone could not start. Please try again.");
    }
  }, [listening, pending, sendMessage]);

  const stopVoice = useCallback(() => {
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    setListening(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input, photo);
  };

  const launchTask = (prompt: string) => void sendMessage(prompt);

  const statusText = pending ? "THINKING" : listening ? "LISTENING" : speaking ? "SPEAKING" : voiceEnabled ? "VOICE READY" : "STANDBY";

  return (
    <section style={panelStyle} aria-label="NEAS free AI conversation">
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid rgba(202,147,50,.2)", background: "linear-gradient(100deg,rgba(202,147,50,.12),rgba(7,29,41,.1))" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", color: "#EBC07E", fontWeight: 800 }}>NEAS ENGINEERING AI</div>
          <div style={{ fontSize: 9, color: "rgba(245,242,234,.52)", marginTop: 3 }}>Free AI · Browser voice · Text & image</div>
        </div>
        <span aria-live="polite" style={{ fontSize: 8, letterSpacing: ".12em", color: error ? "#fca5a5" : listening ? "#86efac" : "#EBC07E" }}>{error ? "ERROR" : statusText}</span>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-label={expanded ? "Collapse NEAS AI panel" : "Expand NEAS AI panel"} style={{ border: "1px solid rgba(202,147,50,.32)", background: "rgba(7,29,41,.72)", color: "#EBC07E", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>{expanded ? "−" : "+"}</button>
      </header>
      {expanded && (
        <div style={{ padding: 12, display: "grid", gap: 10 }}>
          {messages.length === 0 && <EngineeringAIWelcome />}
          <div aria-live="polite" aria-relevant="additions text" style={{ height: 158, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "2px 2px 4px" }}>
            {messages.map((message) => (
              <div key={message.id} style={{ alignSelf: message.role === "user" ? "flex-end" : "flex-start", maxWidth: "91%", padding: "8px 10px", borderRadius: 10, background: message.role === "user" ? "rgba(202,147,50,.16)" : "rgba(255,255,255,.055)", border: `1px solid ${message.role === "user" ? "rgba(202,147,50,.28)" : "rgba(255,255,255,.08)"}` }}>
                <div style={{ fontSize: 8, letterSpacing: ".14em", color: message.role === "user" ? "#EBC07E" : "rgba(87,207,226,.8)", marginBottom: 4 }}>{message.role === "user" ? "YOU" : "NEAS AI"}</div>
                <p style={{ margin: 0, color: "rgba(245,242,234,.9)", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.text}</p>
              </div>
            ))}
            {pending && <div style={{ alignSelf: "flex-start", color: "#EBC07E", fontSize: 10, padding: "5px 8px" }}>NEAS AI is processing…</div>}
            <div ref={bottomRef} />
          </div>
          {error && <div role="alert" style={{ border: "1px solid rgba(248,113,113,.35)", background: "rgba(127,29,29,.16)", color: "#fecaca", borderRadius: 9, padding: "8px 10px", fontSize: 10, lineHeight: 1.45 }}>{error}</div>}
          <EngineeringAITaskEngine disabled={pending} onLaunch={launchTask} />
          {photo && <div style={{ fontSize: 9, color: "#EBC07E" }}>Image ready: {photo.name} <button type="button" onClick={() => setPhoto(null)} style={{ marginLeft: 8 }}>Remove</button></div>}
          <form onSubmit={submitMessage} style={{ display: "flex", gap: 7 }}>
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask NEAS Engineering AI…" aria-label="Message NEAS Engineering AI" maxLength={4000} style={{ minWidth: 0, flex: 1, color: "#f5f2ea", background: "rgba(0,0,0,.25)", border: "1px solid rgba(202,147,50,.28)", borderRadius: 9, padding: "10px 11px", fontSize: 11, outline: "none" }} />
            <button type="submit" disabled={pending || (!input.trim() && !photo)} style={{ border: "1px solid rgba(202,147,50,.35)", background: "linear-gradient(135deg,#CA9332,#EBC07E)", color: "#071D29", borderRadius: 8, padding: "8px 11px", fontSize: 10, fontWeight: 900, opacity: pending || (!input.trim() && !photo) ? .45 : 1, cursor: "pointer" }}>SEND</button>
          </form>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {recognitionSupported && !listening && <button type="button" disabled={pending} onClick={startListening} style={{ border: "1px solid rgba(202,147,50,.35)", background: "linear-gradient(135deg,#CA9332,#EBC07E)", color: "#071D29", borderRadius: 9, padding: "9px 11px", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>🎙 SPEAK</button>}
            {listening && <button type="button" onClick={() => recognitionRef.current?.stop()} style={{ border: "1px solid rgba(248,113,113,.45)", color: "#fca5a5", background: "transparent", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>STOP LISTENING</button>}
            {voiceEnabled && <button type="button" onClick={stopVoice} style={{ border: "1px solid rgba(202,147,50,.35)", color: "#EBC07E", background: "rgba(7,29,41,.72)", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>VOICE OFF</button>}
            <button type="button" onClick={() => { window.speechSynthesis?.cancel(); setSpeaking(false); }} style={{ border: "1px solid rgba(202,147,50,.25)", color: "#EBC07E", background: "rgba(7,29,41,.72)", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>STOP AUDIO</button>
            <button type="button" onClick={() => fileRef.current?.click()} style={{ border: "1px solid rgba(202,147,50,.25)", color: "#EBC07E", background: "rgba(7,29,41,.72)", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>ATTACH IMAGE</button>
            <button type="button" onClick={() => { stopVoice(); setMessages([]); setInput(""); setPhoto(null); setError(""); }} style={{ border: "1px solid rgba(202,147,50,.25)", color: "#EBC07E", background: "rgba(7,29,41,.72)", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>NEW CHAT</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { if (file.size > 3 * 1024 * 1024) setError("Images must be 3 MB or smaller."); else setPhoto(file); } event.currentTarget.value = ""; }} />
          </div>
          <div style={{ color: "rgba(245,242,234,.42)", fontSize: 8, lineHeight: 1.45 }}>
            Voice recognition and speech output use your browser/device. AI responses use the Gemini free tier when configured. Browser voice availability varies. Do not submit confidential project or personal data to free-tier AI services.
          </div>
        </div>
      )}
    </section>
  );
}
