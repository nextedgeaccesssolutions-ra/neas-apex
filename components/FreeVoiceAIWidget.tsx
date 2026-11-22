"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import EngineeringAITaskEngine, { type SpecialistId } from "./EngineeringAITaskEngine";
import EngineeringAIWelcome from "./EngineeringAIWelcome";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; agent?: string };
type AudioInput = { mimeType: string; data: string };
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

function speak(text: string, onStart: () => void, onEnd: () => void, onError: (message: string) => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
    onError("Speech output is not supported by this browser. Use a supported desktop or mobile browser.");
    return false;
  }
  try {
    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    synthesis.resume();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;
    const voices = synthesis.getVoices();
    utterance.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("en-ph"))
      || voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us"))
      || voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) || null;
    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      onEnd();
      if (event.error !== "canceled" && event.error !== "interrupted") onError(`Browser speech output failed: ${event.error}. Check your device audio and browser voice settings.`);
    };
    synthesis.speak(utterance);
    return true;
  } catch {
    onError("The browser could not start speech output. Check device audio and browser permissions.");
    return false;
  }
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
  const [recording, setRecording] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceEnabledRef = useRef(false);
  const busyRef = useRef(false);
  const fallbackAfterRecognitionRef = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => {
    const onPhoto = (event: Event) => {
      const file = (event as CustomEvent<File>).detail;
      if (!(file instanceof File)) return;
      if (!file.type.startsWith("image/") || file.size > 3 * 1024 * 1024) {
        setError("Select a supported image of 3 MB or smaller.");
        return;
      }
      setPhoto(file);
      setExpanded(true);
      setError("");
    };
    window.addEventListener("neas-ai-photo-selected", onPhoto);
    return () => window.removeEventListener("neas-ai-photo-selected", onPhoto);
  }, []);

  const sendMessage = useCallback(async (rawText: string, imageFile?: File | null, specialist: SpecialistId = "auto", audio?: AudioInput) => {
    const text = rawText.trim();
    if ((!text && !imageFile && !audio) || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    window.dispatchEvent(new CustomEvent("neas-ai-processing", { detail: { processing: true } }));
    setError("");
    const userMessage: ChatMessage = {
      id: `user:${Date.now()}`,
      role: "user",
      text: audio ? "[Voice message] Please transcribe and respond to the spoken request." : imageFile ? (text || "Please inspect this image and describe visible details. Separate observations from assumptions.") + ` [Image: ${imageFile.name}]` : text,
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
          specialist,
          messages: nextMessages.slice(-12).map(({ role, text: messageText }) => ({ role, text: messageText })),
          ...(image ? { image } : {}),
          ...(audio ? { audio } : {}),
        }),
      });
      const data = await response.json().catch(() => ({})) as { reply?: string; error?: string; agent?: string; specialist?: SpecialistId };
      if (!response.ok || !data.reply) throw new Error(data.error || "NEAS AI is temporarily unavailable.");
      const reply = data.reply.trim();
      setMessages((current) => [...current, { id: `assistant:${Date.now()}`, role: "assistant", text: reply, agent: data.agent || "NEAS AI Agent" }]);
      if (voiceEnabledRef.current) speak(reply, () => { setSpeaking(true); window.dispatchEvent(new CustomEvent("neas-ai-speaking", { detail: { speaking: true } })); }, () => { setSpeaking(false); window.dispatchEvent(new CustomEvent("neas-ai-speaking", { detail: { speaking: false } })); }, (message) => setError(message));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reach the free AI service.");
    } finally {
      busyRef.current = false;
      setPending(false);
      window.dispatchEvent(new CustomEvent("neas-ai-processing", { detail: { processing: false } }));
    }
  }, [messages]);

  const startRecordingFallback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError("This browser does not support microphone recording. Try Chrome or Edge over HTTPS.");
      return;
    }
    if (recording || pending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
      const mimeType = preferred.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      recorder.onerror = () => setError("Microphone recording failed. Check microphone permissions and try again.");
      recorder.onstop = async () => {
        setRecording(false);
        window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: false, enabled: voiceEnabledRef.current } }));
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) { setError("No audio was captured. Please try again and speak after recording starts."); return; }
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error("The recorded audio could not be read."));
            reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid audio data."));
            reader.readAsDataURL(blob);
          });
          void sendMessage("Please transcribe this voice message and respond directly to the spoken request.", null, "auto", { mimeType: blob.type || "audio/webm", data: dataUrl.split(",")[1] || "" });
        } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to process the recorded audio."); }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: true, enabled: voiceEnabledRef.current } }));
      setError("");
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === "NotAllowedError"
        ? "Microphone permission was denied. Allow microphone access for this site, then try again."
        : "Unable to access the microphone. Check that it is connected and not being used by another app.");
    }
  }, [recording, pending, sendMessage]);

  const startListening = useCallback(() => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!autoSessionRef.current || busyRef.current || recognitionRef.current || mediaRecorderRef.current?.state === "recording") return;
    if (!Recognition) {
      void startRecordingFallback();
      return;
    }
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
      window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: false, enabled: voiceEnabledRef.current } }));
      if (event.error === "network" || event.error === "service-not-allowed") {
        fallbackAfterRecognitionRef.current = true;
      } else if (event.error === "not-allowed") {
        setError("Microphone permission was denied. Allow microphone access for this site.");
        autoSessionRef.current = false;
        voiceEnabledRef.current = false;
        setVoiceEnabled(false);
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError("Speech recognition error: " + event.error);
      }
    };
    recognition.onend = () => {
      setListening(false);
      window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: false, enabled: voiceEnabledRef.current } }));
      recognitionRef.current = null;
      if (!autoSessionRef.current || busyRef.current || speechActiveRef.current || speechQueuedRef.current) return;
      if (fallbackAfterRecognitionRef.current) {
        fallbackAfterRecognitionRef.current = false;
        void startRecordingFallback();
      } else {
        window.setTimeout(() => startListeningRef.current(), 450);
      }
    };
    recognitionRef.current = recognition;
    setListening(true);
    window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: true, enabled: voiceEnabledRef.current } }));
    setError("");
    try { recognition.start(); } catch {
      setListening(false);
      recognitionRef.current = null;
      window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: false, enabled: voiceEnabledRef.current } }));
      if (autoSessionRef.current) window.setTimeout(() => startRecordingFallback(), 500);
    }
  }, [sendMessage, startRecordingFallback]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);
  const stopVoice = useCallback(() => {
    autoSessionRef.current = false;
    speechQueuedRef.current = false;
    speechActiveRef.current = false;
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    setListening(false);
    window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: false, enabled: false } }));
    window.dispatchEvent(new CustomEvent("neas-ai-speaking", { detail: { speaking: false } }));
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    if (vadFrameRef.current !== null) window.cancelAnimationFrame(vadFrameRef.current);
    vadFrameRef.current = null;
    if (vadAudioContextRef.current && vadAudioContextRef.current.state !== "closed") void vadAudioContextRef.current.close().catch(() => undefined);
    vadAudioContextRef.current = null;
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecording(false);
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  const startVoiceSession = useCallback(() => {
    if (autoSessionRef.current) return;
    autoSessionRef.current = true;
    voiceEnabledRef.current = true;
    setVoiceEnabled(true);
    setError("");
    window.dispatchEvent(new CustomEvent("neas-ai-voice-state", { detail: { listening: false, enabled: true } }));
    const started = speak("NEAS AI is online. I am listening. How can I help?", () => {
      speechActiveRef.current = true;
      setSpeaking(true);
      window.dispatchEvent(new CustomEvent("neas-ai-speaking", { detail: { speaking: true } }));
    }, () => {
      speechActiveRef.current = false;
      setSpeaking(false);
      window.dispatchEvent(new CustomEvent("neas-ai-speaking", { detail: { speaking: false } }));
      if (autoSessionRef.current) window.setTimeout(() => startListeningRef.current(), 300);
    }, (message) => {
      speechActiveRef.current = false;
      autoSessionRef.current = false;
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
      setError(message);
    });
    if (!started) {
      autoSessionRef.current = false;
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
    }
  }, []);

  useEffect(() => {
    const onStart = () => { if (autoSessionRef.current) stopVoice(); else startVoiceSession(); };
    const onStop = () => stopVoice();
    window.addEventListener("neas-ai-start-voice", onStart);
    window.addEventListener("neas-ai-stop-voice", onStop);
    return () => {
      window.removeEventListener("neas-ai-start-voice", onStart);
      window.removeEventListener("neas-ai-stop-voice", onStop);
    };
  }, [startVoiceSession, stopVoice]);

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input, photo);
  };

  const launchTask = (prompt: string, specialist: SpecialistId) => void sendMessage(prompt, null, specialist);

  const statusText = pending ? "THINKING" : recording ? "RECORDING" : listening ? "LISTENING" : speaking ? "SPEAKING" : voiceEnabled ? "VOICE READY" : "STANDBY";

  return (
    <section style={panelStyle} aria-label="NEAS free AI conversation">
      <header style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid rgba(202,147,50,.2)", background: "linear-gradient(100deg,rgba(202,147,50,.12),rgba(7,29,41,.1))" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 10, letterSpacing: ".18em", color: "#EBC07E", fontWeight: 800 }}>NEAS ENGINEERING AI</div>
          <div style={{ fontSize: 9, color: "rgba(245,242,234,.52)", marginTop: 3 }}>Specialist agents · Browser voice · Text & image</div>
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
                <div style={{ fontSize: 8, letterSpacing: ".14em", color: message.role === "user" ? "#EBC07E" : "rgba(87,207,226,.8)", marginBottom: 4 }}>{message.role === "user" ? "YOU" : (message.agent || "NEAS AI")}</div>
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
            <button type="button" onClick={() => fileRef.current?.click()} style={{ border: "1px solid rgba(202,147,50,.25)", color: "#EBC07E", background: "rgba(7,29,41,.72)", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>ATTACH IMAGE</button>
            <button type="button" onClick={() => { stopVoice(); setMessages([]); setInput(""); setPhoto(null); setError(""); }} style={{ border: "1px solid rgba(202,147,50,.25)", color: "#EBC07E", background: "rgba(7,29,41,.72)", borderRadius: 9, padding: "9px 11px", fontSize: 10, cursor: "pointer" }}>NEW CHAT</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) { if (file.size > 3 * 1024 * 1024) setError("Images must be 3 MB or smaller."); else setPhoto(file); } event.currentTarget.value = ""; }} />
          </div>
          <div style={{ color: "rgba(245,242,234,.42)", fontSize: 8, lineHeight: 1.45 }}>
            Tap the central NEAS CORE once to start or stop a voice session. Speech detection submits your words automatically; NEAS AI speaks replies and resumes listening. Microphone permission is controlled by your browser. Do not submit confidential project or personal data to free-tier AI services.
          </div>
        </div>
      )}
    </section>
  );
}
