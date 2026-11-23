"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import EngineeringAITaskEngine, {
  type SpecialistId,
} from "./EngineeringAITaskEngine";
import EngineeringAIWelcome from "./EngineeringAIWelcome";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  agent?: string;
};
type AudioInput = { mimeType: string; data: string };
// The @elevenlabs/convai-widget-embed bundle (verified against 0.28.0 dist) exposes NO
// startConversation/endConversation methods and NO conversationStarted/Ended events.
// The <elevenlabs-convai> element is declarative: it renders its own orb + call UI and
// the user starts the call with the widget's own button (a genuine mic/autoplay gesture).
type ElevenLabsWidgetElement = HTMLElement;
const NEAS_ELEVENLABS_AGENT_ID =
  process.env.NEXT_PUBLIC_NEAS_ELEVENLABS_AGENT_ID ||
  "agent_8601m7zrgsg4f98srgkekzq7ana9";
type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative };
type RecognitionEvent = Event & {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type RecognitionErrorEvent = Event & { error: string };
type RecognitionInstance = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechRecognitionConstructor = new () => RecognitionInstance;
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const panelStyle: CSSProperties = {
  position: "fixed",
  right: "clamp(12px, 2vw, 28px)",
  bottom: 16,
  zIndex: 80,
  width: "min(390px, calc(100vw - 24px))",
  color: "#f5f2ea",
  background: "linear-gradient(160deg, rgba(7,29,41,.97), rgba(3,12,19,.97))",
  border: "1px solid rgba(202,147,50,.42)",
  borderRadius: 16,
  boxShadow: "0 16px 52px rgba(0,0,0,.52), 0 0 26px rgba(202,147,50,.12)",
  backdropFilter: "blur(18px)",
  overflow: "hidden",
};

function speak(
  text: string,
  onStart: () => void,
  onEnd: () => void,
  onError: (message: string) => void,
): boolean {
  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window) ||
    typeof SpeechSynthesisUtterance === "undefined"
  ) {
    onError(
      "Speech output is not supported by this browser. Use a supported desktop or mobile browser.",
    );
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
    utterance.voice =
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en-ph")) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en-us")) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ||
      null;
    utterance.onstart = onStart;
    utterance.onend = onEnd;
    utterance.onerror = (event) => {
      onEnd();
      if (event.error !== "canceled" && event.error !== "interrupted")
        onError(
          `Browser speech output failed: ${event.error}. Check your device audio and browser voice settings.`,
        );
    };
    synthesis.speak(utterance);
    return true;
  } catch {
    onError(
      "The browser could not start speech output. Check device audio and browser permissions.",
    );
    return false;
  }
}

export default function FreeVoiceAIWidget() {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [audioCaptureSupported, setAudioCaptureSupported] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elevenLabsReady, setElevenLabsReady] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const voiceMountRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceEnabledRef = useRef(false);
  const elevenLabsActiveRef = useRef(false);
  const elevenLabsWidgetRef = useRef<ElevenLabsWidgetElement | null>(null);
  const busyRef = useRef(false);
  const fallbackAfterRecognitionRef = useRef(false);
  const greetingActiveRef = useRef(false);
  const restartAfterGreetingRef = useRef(false);
  const startListeningRef = useRef<() => void>(() => {});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecognitionSupported(
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    );
    setAudioCaptureSupported(
      Boolean(
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function" &&
        typeof window.MediaRecorder !== "undefined",
      ),
    );
    return () => {
      recognitionRef.current?.abort();
      if (mediaRecorderRef.current?.state === "recording")
        mediaRecorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // NOTE: the convai-widget-embed bundle exposes no conversationStarted/Ended
    // events and no startConversation/endConversation methods (verified in dist).
    // The widget renders its own orb + call button; the call starts from the
    // user's tap on the widget itself, which also satisfies mic/autoplay gesture rules.
    const mountWidget = () => {
      if (
        cancelled ||
        !voiceMountRef.current ||
        !customElements.get("elevenlabs-convai")
      )
        return;
      let element = document.getElementById(
        "neas-elevenlabs-voice",
      ) as ElevenLabsWidgetElement | null;
      if (!element) {
        element = document.createElement(
          "elevenlabs-convai",
        ) as ElevenLabsWidgetElement;
        element.id = "neas-elevenlabs-voice";
        element.setAttribute("agent-id", NEAS_ELEVENLABS_AGENT_ID);
        element.setAttribute("variant", "full");
        element.setAttribute("server-location", "global");
        // Keep the widget mounted for session startup, but visible and tappable.
        // Hidden 1px/off-screen parking breaks mic gesture + autoplay and guarantees no audio round-trip.
        element.style.cssText =
          "position:fixed;right:20px;bottom:20px;z-index:70;";
        element.setAttribute("data-neas-voice-mounted", "true");
        voiceMountRef.current.appendChild(element);
      }
      elevenLabsWidgetRef.current = element;
      // The custom element being defined means the widget script loaded and the
      // element upgraded; the widget then renders its own tappable call UI.
      setElevenLabsReady(true);
    };
    const loadScript = (src: string, fallback?: string) => {
      const script = document.createElement("script");
      script.async = true;
      script.src = src;
      script.dataset.neasElevenlabs = "true";
      script.onload = () => {
        void customElements.whenDefined("elevenlabs-convai").then(mountWidget);
      };
      script.onerror = () => {
        script.remove();
        if (fallback && !cancelled) loadScript(fallback);
        else if (!cancelled)
          setError(
            "NEAS ElevenLabs voice could not load. Check the connection and retry.",
          );
      };
      document.head.appendChild(script);
    };
    if (customElements.get("elevenlabs-convai")) mountWidget();
    else if (!document.querySelector('script[data-neas-elevenlabs="true"]')) {
      loadScript(
        "https://unpkg.com/@elevenlabs/convai-widget-embed",
        "https://cdn.jsdelivr.net/npm/@elevenlabs/convai-widget-embed",
      );
    } else {
      void customElements.whenDefined("elevenlabs-convai").then(mountWidget);
    }
    return () => {
      cancelled = true;
      elevenLabsWidgetRef.current = null;
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

  const sendMessage = useCallback(
    async (
      rawText: string,
      imageFile?: File | null,
      specialist: SpecialistId = "auto",
      audio?: AudioInput,
    ) => {
      const text = rawText.trim();
      if ((!text && !imageFile && !audio) || busyRef.current) return;
      busyRef.current = true;
      setPending(true);
      window.dispatchEvent(
        new CustomEvent("neas-ai-processing", { detail: { processing: true } }),
      );
      setError("");
      const userMessage: ChatMessage = {
        id: `user:${Date.now()}`,
        role: "user",
        text: audio
          ? "[Voice message] Please transcribe and respond to the spoken request."
          : imageFile
            ? (text ||
                "Please inspect this image and describe visible details. Separate observations from assumptions.") +
              ` [Image: ${imageFile.name}]`
            : text,
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
            reader.onerror = () =>
              reject(new Error("The selected image could not be read."));
            reader.onload = () =>
              typeof reader.result === "string"
                ? resolve(reader.result)
                : reject(new Error("Invalid image data."));
            reader.readAsDataURL(imageFile);
          });
          image = {
            mimeType: imageFile.type,
            data: dataUrl.split(",")[1] || "",
          };
        }
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            specialist,
            messages: nextMessages
              .slice(-6)
              .map(({ role, text: messageText }) => ({
                role,
                text: messageText,
              })),
            ...(image ? { image } : {}),
            ...(audio ? { audio } : {}),
          }),
        });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(data.error || "NEAS AI is temporarily unavailable.");
        }
        if (!response.body)
          throw new Error("The AI response stream could not be opened.");
        const assistantId = "assistant:" + Date.now();
        const agent = response.headers.get("X-NEAS-Agent") || "NEAS AI Agent";
        setMessages((current) => [
          ...current,
          { id: assistantId, role: "assistant", text: "", agent },
        ]);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let reply = "";
        const consumeEvent = (eventText: string) => {
          for (const line of eventText.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const packet = JSON.parse(raw) as {
                candidates?: Array<{
                  content?: { parts?: Array<{ text?: string }> };
                }>;
              };
              const delta =
                packet.candidates?.[0]?.content?.parts
                  ?.map((part) => part.text || "")
                  .join("") || "";
              if (delta) {
                reply += delta;
                setMessages((current) =>
                  current.map((message) =>
                    message.id === assistantId
                      ? { ...message, text: reply }
                      : message,
                  ),
                );
              }
            } catch {
              // Ignore incomplete provider frames; the next SSE frame completes them.
            }
          }
        };
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const eventText of events) consumeEvent(eventText);
        }
        buffer += decoder.decode();
        if (buffer.trim()) consumeEvent(buffer);
        const finalReply = reply.trim();
        if (!finalReply)
          throw new Error("NEAS AI returned an empty response. Please retry.");
        if (voiceEnabledRef.current && !elevenLabsActiveRef.current)
          speak(
            finalReply,
            () => {
              setSpeaking(true);
              window.dispatchEvent(
                new CustomEvent("neas-ai-speaking", {
                  detail: { speaking: true },
                }),
              );
            },
            () => {
              setSpeaking(false);
              window.dispatchEvent(
                new CustomEvent("neas-ai-speaking", {
                  detail: { speaking: false },
                }),
              );
            },
            (message) => setError(message),
          );
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to reach the free AI service.",
        );
      } finally {
        busyRef.current = false;
        setPending(false);
        window.dispatchEvent(
          new CustomEvent("neas-ai-processing", {
            detail: { processing: false },
          }),
        );
        // Keep the one-tap voice session armed after each answer, including browsers
        // that terminate a continuous SpeechRecognition session between turns.
        if (
          voiceEnabledRef.current &&
          !elevenLabsActiveRef.current &&
          !recognitionRef.current &&
          (window.SpeechRecognition || window.webkitSpeechRecognition)
        ) {
          window.setTimeout(() => {
            if (
              voiceEnabledRef.current &&
              !recognitionRef.current &&
              !busyRef.current
            )
              startListeningRef.current();
          }, 180);
        }
      }
    },
    [messages],
  );

  const startRecordingFallback = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError(
        "This browser does not support microphone recording. Try Chrome or Edge over HTTPS.",
      );
      return;
    }
    if (recording || pending) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const preferred = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      const mimeType = preferred.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () =>
        setError(
          "Microphone recording failed. Check microphone permissions and try again.",
        );
      recorder.onstop = async () => {
        setRecording(false);
        window.dispatchEvent(
          new CustomEvent("neas-ai-voice-state", {
            detail: { listening: false, enabled: voiceEnabledRef.current },
          }),
        );
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        if (!blob.size) {
          setError(
            "No audio was captured. Please try again and speak after recording starts.",
          );
          return;
        }
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () =>
              reject(new Error("The recorded audio could not be read."));
            reader.onload = () =>
              typeof reader.result === "string"
                ? resolve(reader.result)
                : reject(new Error("Invalid audio data."));
            reader.readAsDataURL(blob);
          });
          void sendMessage(
            "Please transcribe this voice message and respond directly to the spoken request.",
            null,
            "auto",
            {
              mimeType: blob.type || "audio/webm",
              data: dataUrl.split(",")[1] || "",
            },
          );
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Unable to process the recorded audio.",
          );
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      window.dispatchEvent(
        new CustomEvent("neas-ai-voice-state", {
          detail: { listening: true, enabled: voiceEnabledRef.current },
        }),
      );
      setError("");
    } catch (cause) {
      setError(
        cause instanceof DOMException && cause.name === "NotAllowedError"
          ? "Microphone permission was denied. Allow microphone access for this site, then try again."
          : "Unable to access the microphone. Check that it is connected and not being used by another app.",
      );
    }
  }, [recording, pending, sendMessage]);

  const startListening = useCallback(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      void startRecordingFallback();
      return;
    }
    if (listening || pending) return;
    window.speechSynthesis?.cancel();
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    // Keep the microphone session open across turns so users can speak again
    // without tapping the core a second time.
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = "";
      let interimTranscript = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        if (result.isFinal) transcript += result[0].transcript;
        else interimTranscript += result[0].transcript;
      }
      // Barge-in: as soon as the browser detects the client's voice, stop the
      // current greeting/answer so the client is never forced to talk over NEAS.
      if (interimTranscript.trim() || transcript.trim()) {
        greetingActiveRef.current = false;
        if (window.speechSynthesis?.speaking) {
          window.speechSynthesis.cancel();
          setSpeaking(false);
          window.dispatchEvent(
            new CustomEvent("neas-ai-speaking", {
              detail: { speaking: false },
            }),
          );
        }
      }
      if (transcript.trim()) void sendMessage(transcript);
    };
    recognition.onerror = (event) => {
      setListening(false);
      window.dispatchEvent(
        new CustomEvent("neas-ai-voice-state", {
          detail: { listening: false },
        }),
      );
      if (event.error === "network" || event.error === "service-not-allowed") {
        setError(
          "Browser speech recognition is unavailable. Switching to the built-in microphone recorder…",
        );
        void startRecordingFallback();
      } else if (event.error === "not-allowed") {
        setError(
          "Microphone permission was denied. Allow microphone access in your browser, then try again.",
        );
      } else if (event.error !== "no-speech" && event.error !== "aborted") {
        setError(`Speech recognition error: ${event.error}`);
      } else if (event.error === "no-speech" && !greetingActiveRef.current) {
        fallbackAfterRecognitionRef.current = true;
        setError(
          "Browser recognition did not capture speech. Switching to microphone recording…",
        );
      }
    };
    recognition.onend = () => {
      setListening(false);
      window.dispatchEvent(
        new CustomEvent("neas-ai-voice-state", {
          detail: { listening: false, enabled: voiceEnabledRef.current },
        }),
      );
      recognitionRef.current = null;
      if (greetingActiveRef.current) {
        restartAfterGreetingRef.current = true;
        return;
      }
      if (fallbackAfterRecognitionRef.current && !busyRef.current) {
        fallbackAfterRecognitionRef.current = false;
        void startRecordingFallback();
        return;
      }
      // Some browsers close SpeechRecognition after silence or a network blip.
      // Re-arm it automatically while the user-enabled voice session is active.
      if (voiceEnabledRef.current && !busyRef.current) {
        window.setTimeout(() => {
          if (
            voiceEnabledRef.current &&
            !recognitionRef.current &&
            !busyRef.current
          )
            startListeningRef.current();
        }, 250);
      }
    };
    recognitionRef.current = recognition;
    setListening(true);
    window.dispatchEvent(
      new CustomEvent("neas-ai-voice-state", {
        detail: { listening: true, enabled: voiceEnabledRef.current },
      }),
    );
    setError("");
    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
      window.dispatchEvent(
        new CustomEvent("neas-ai-voice-state", {
          detail: { listening: false, enabled: voiceEnabledRef.current },
        }),
      );
      setError("The microphone could not start. Please try again.");
    }
  }, [listening, pending, sendMessage, startRecordingFallback]);
  startListeningRef.current = startListening;

  // One-tap auto-speak: the user's tap both reveals the ElevenLabs widget AND
  // immediately starts the spoken greeting plus the browser microphone in the
  // SAME gesture (autoplay and mic policies require a user gesture, so everything
  // must start synchronously inside this tap handler). The full ElevenLabs call
  // still starts from the widget's own button when the user wants it.
  const startCore = useCallback(() => {
    setExpanded(true);
    setError("");
    const widget =
      elevenLabsWidgetRef.current ??
      (document.getElementById(
        "neas-elevenlabs-voice",
      ) as ElevenLabsWidgetElement | null);
    if (!widget || !elevenLabsReady) {
      setError(
        "NEAS voice widget is still loading. Please wait a moment and tap TAP TO START again.",
      );
      return;
    }
    elevenLabsActiveRef.current = true;
    voiceEnabledRef.current = true;
    setVoiceEnabled(true);
    widget.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.dispatchEvent(
      new CustomEvent("neas-ai-voice-state", {
        detail: { listening: true, enabled: true },
      }),
    );
    // Mic first (cancels stale speech output), then the greeting. Barge-in stays
    // active: talking over the greeting cancels it via the recognition handler.
    if (!recognitionRef.current && !mediaRecorderRef.current)
      startListeningRef.current();
    greetingActiveRef.current = true;
    const greeted = speak(
      "Welcome to NextEdge Access Solutions. I am NEAS AI Core. Please tell me how I can help.",
      () => {
        setSpeaking(true);
        window.dispatchEvent(
          new CustomEvent("neas-ai-speaking", { detail: { speaking: true } }),
        );
      },
      () => {
        setSpeaking(false);
        window.dispatchEvent(
          new CustomEvent("neas-ai-speaking", { detail: { speaking: false } }),
        );
        greetingActiveRef.current = false;
        if (
          voiceEnabledRef.current &&
          !recognitionRef.current &&
          !busyRef.current
        )
          startListeningRef.current();
      },
      (message) => {
        greetingActiveRef.current = false;
        setError(message);
        if (
          voiceEnabledRef.current &&
          !recognitionRef.current &&
          !busyRef.current
        )
          startListeningRef.current();
      },
    );
    if (!greeted) {
      greetingActiveRef.current = false;
      setListening(true);
    }
  }, [elevenLabsReady]);

  const stopVoice = useCallback(() => {
    // The widget owns its call lifecycle: end the call from the widget's own
    // end-call button. Here we only stop our browser-voice fallbacks.
    elevenLabsActiveRef.current = false;
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    setListening(false);
    setSpeaking(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    if (mediaRecorderRef.current?.state === "recording")
      mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    setRecording(false);
    window.speechSynthesis?.cancel();
    window.dispatchEvent(
      new CustomEvent("neas-ai-voice-state", {
        detail: { listening: false, enabled: false },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("neas-ai-speaking", { detail: { speaking: false } }),
    );
  }, []);

  useEffect(() => {
    // The central NEAS AI CORE orb must start the complete one-tap experience:
    // microphone + greeting + spoken replies. Do not create a second listener.
    const onStart = () => startCore();
    const onStop = () => stopVoice();
    window.addEventListener("neas-ai-start-voice", onStart);
    window.addEventListener("neas-ai-stop-voice", onStop);
    return () => {
      window.removeEventListener("neas-ai-start-voice", onStart);
      window.removeEventListener("neas-ai-stop-voice", onStop);
    };
  }, [startCore, stopVoice]);

  const enableVoiceOutput = () => {
    if (elevenLabsReady) {
      startCore();
      return;
    }
    setError(
      "NEAS ElevenLabs voice is loading. You can use the browser microphone fallback below.",
    );
    const started = speak(
      "Welcome to NextEdge Access Solutions. I am NEAS AI Core. Please tell me how I can help.",
      () => {
        voiceEnabledRef.current = true;
        setVoiceEnabled(true);
        setSpeaking(true);
        window.dispatchEvent(
          new CustomEvent("neas-ai-voice-state", {
            detail: { listening: false, enabled: true },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("neas-ai-speaking", { detail: { speaking: true } }),
        );
      },
      () => {
        setSpeaking(false);
        window.dispatchEvent(
          new CustomEvent("neas-ai-speaking", { detail: { speaking: false } }),
        );
      },
      (message) => {
        voiceEnabledRef.current = false;
        setVoiceEnabled(false);
        setError(message);
      },
    );
    if (!started) {
      voiceEnabledRef.current = false;
      setVoiceEnabled(false);
    }
  };

  const submitMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input, photo);
  };

  const launchTask = (prompt: string, specialist: SpecialistId) =>
    void sendMessage(prompt, null, specialist);

  const statusText = pending
    ? "THINKING"
    : recording
      ? "RECORDING"
      : listening
        ? "LISTENING"
        : speaking
          ? "SPEAKING"
          : voiceEnabled
            ? "VOICE READY"
            : "STANDBY";

  return (
    <>
      <div ref={voiceMountRef} aria-hidden="true" />
      <section style={panelStyle} aria-label="NEAS AI Core voice conversation">
        <style>{`
        .neas-ai-core-launch { position:relative; isolation:isolate; overflow:hidden; animation:neasCorePulse 2.8s ease-in-out infinite; box-shadow:0 0 0 0 rgba(235,192,126,.42),0 0 18px rgba(202,147,50,.2); transition:transform .2s ease,box-shadow .2s ease; }
        .neas-ai-core-launch::after { content:""; position:absolute; inset:-40% auto -40% -55%; width:38%; transform:skewX(-22deg); background:rgba(255,255,255,.42); animation:neasCoreSweep 3.6s ease-in-out infinite; pointer-events:none; }
        .neas-ai-core-launch:hover { transform:translateY(-1px) scale(1.025); box-shadow:0 0 24px rgba(235,192,126,.42); }
        @keyframes neasCorePulse { 0%,100% { box-shadow:0 0 0 0 rgba(235,192,126,.24),0 0 14px rgba(202,147,50,.16); } 50% { box-shadow:0 0 0 7px rgba(235,192,126,0),0 0 24px rgba(202,147,50,.32); } }
        @keyframes neasCoreSweep { 0%,35% { left:-55%; } 75%,100% { left:135%; } }
        @media (prefers-reduced-motion: reduce) { .neas-ai-core-launch,.neas-ai-core-launch::after { animation:none!important; } }
      `}</style>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            borderBottom: "1px solid rgba(202,147,50,.2)",
            background:
              "linear-gradient(100deg,rgba(202,147,50,.12),rgba(7,29,41,.1))",
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: ".18em",
                color: "#EBC07E",
                fontWeight: 800,
              }}
            >
              NEAS ENGINEERING AI
            </div>
            <div
              style={{
                fontSize: 9,
                color: "rgba(245,242,234,.52)",
                marginTop: 3,
              }}
            >
              ElevenLabs voice · NEAS AI text & image
            </div>
          </div>
          <span
            aria-live="polite"
            style={{
              fontSize: 8,
              letterSpacing: ".12em",
              color: error ? "#fca5a5" : listening ? "#86efac" : "#EBC07E",
            }}
          >
            {error ? "ERROR" : statusText}
          </span>
          <button
            type="button"
            onClick={() => (expanded ? setExpanded(false) : startCore())}
            aria-label={
              expanded
                ? "Collapse NEAS AI panel"
                : "Start NEAS AI Core with voice welcome"
            }
            className="neas-ai-core-launch"
            style={{
              border: "1px solid rgba(202,147,50,.55)",
              background: "linear-gradient(135deg,#CA9332,#EBC07E)",
              color: "#071D29",
              borderRadius: 999,
              padding: expanded ? "7px 11px" : "9px 15px",
              cursor: "pointer",
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: ".12em",
              whiteSpace: "nowrap",
            }}
          >
            {expanded ? "CLOSE" : "✦ TAP TO START"}
          </button>
        </header>
        {expanded && (
          <div style={{ padding: 12, display: "grid", gap: 10 }}>
            {messages.length === 0 && <EngineeringAIWelcome />}
            <div
              aria-live="polite"
              aria-relevant="additions text"
              style={{
                height: 158,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "2px 2px 4px",
              }}
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  style={{
                    alignSelf:
                      message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "91%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    background:
                      message.role === "user"
                        ? "rgba(202,147,50,.16)"
                        : "rgba(255,255,255,.055)",
                    border: `1px solid ${message.role === "user" ? "rgba(202,147,50,.28)" : "rgba(255,255,255,.08)"}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      letterSpacing: ".14em",
                      color:
                        message.role === "user"
                          ? "#EBC07E"
                          : "rgba(87,207,226,.8)",
                      marginBottom: 4,
                    }}
                  >
                    {message.role === "user"
                      ? "YOU"
                      : message.agent || "NEAS AI"}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      color: "rgba(245,242,234,.9)",
                      fontSize: 11,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {message.text}
                  </p>
                </div>
              ))}
              {pending && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    color: "#EBC07E",
                    fontSize: 10,
                    padding: "5px 8px",
                  }}
                >
                  NEAS AI is processing…
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            {error && (
              <div
                role="alert"
                style={{
                  border: "1px solid rgba(248,113,113,.35)",
                  background: "rgba(127,29,29,.16)",
                  color: "#fecaca",
                  borderRadius: 9,
                  padding: "8px 10px",
                  fontSize: 10,
                  lineHeight: 1.45,
                }}
              >
                {error}
              </div>
            )}
            <EngineeringAITaskEngine disabled={pending} onLaunch={launchTask} />
            {photo && (
              <div style={{ fontSize: 9, color: "#EBC07E" }}>
                Image ready: {photo.name}{" "}
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  style={{ marginLeft: 8 }}
                >
                  Remove
                </button>
              </div>
            )}
            <form onSubmit={submitMessage} style={{ display: "flex", gap: 7 }}>
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask NEAS Engineering AI…"
                aria-label="Message NEAS Engineering AI"
                maxLength={4000}
                style={{
                  minWidth: 0,
                  flex: 1,
                  color: "#f5f2ea",
                  background: "rgba(0,0,0,.25)",
                  border: "1px solid rgba(202,147,50,.28)",
                  borderRadius: 9,
                  padding: "10px 11px",
                  fontSize: 11,
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={pending || (!input.trim() && !photo)}
                style={{
                  border: "1px solid rgba(202,147,50,.35)",
                  background: "linear-gradient(135deg,#CA9332,#EBC07E)",
                  color: "#071D29",
                  borderRadius: 8,
                  padding: "8px 11px",
                  fontSize: 10,
                  fontWeight: 900,
                  opacity: pending || (!input.trim() && !photo) ? 0.45 : 1,
                  cursor: "pointer",
                }}
              >
                SEND
              </button>
            </form>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {!elevenLabsReady &&
                (recognitionSupported || audioCaptureSupported) &&
                !listening &&
                !recording && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={startListening}
                    style={{
                      border: "1px solid rgba(202,147,50,.35)",
                      background: "linear-gradient(135deg,#CA9332,#EBC07E)",
                      color: "#071D29",
                      borderRadius: 9,
                      padding: "9px 11px",
                      fontSize: 10,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    🎙 {recognitionSupported ? "SPEAK" : "RECORD VOICE"}
                  </button>
                )}
              {listening && !elevenLabsReady && (
                <button
                  type="button"
                  onClick={() => recognitionRef.current?.stop()}
                  style={{
                    border: "1px solid rgba(248,113,113,.45)",
                    color: "#fca5a5",
                    background: "transparent",
                    borderRadius: 9,
                    padding: "9px 11px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  STOP LISTENING
                </button>
              )}
              {recording && !elevenLabsReady && (
                <button
                  type="button"
                  onClick={() => mediaRecorderRef.current?.stop()}
                  style={{
                    border: "1px solid rgba(248,113,113,.45)",
                    color: "#fca5a5",
                    background: "transparent",
                    borderRadius: 9,
                    padding: "9px 11px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  STOP RECORDING
                </button>
              )}
              {!voiceEnabled && (
                <button
                  type="button"
                  onClick={enableVoiceOutput}
                  style={{
                    border: "1px solid rgba(202,147,50,.35)",
                    color: "#EBC07E",
                    background: "rgba(7,29,41,.72)",
                    borderRadius: 9,
                    padding: "9px 11px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  {elevenLabsReady
                    ? "START ELEVENLABS VOICE"
                    : "ENABLE DEVICE VOICE"}
                </button>
              )}
              {voiceEnabled && (
                <button
                  type="button"
                  onClick={stopVoice}
                  style={{
                    border: "1px solid rgba(202,147,50,.35)",
                    color: "#EBC07E",
                    background: "rgba(7,29,41,.72)",
                    borderRadius: 9,
                    padding: "9px 11px",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  VOICE OFF
                </button>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  border: "1px solid rgba(202,147,50,.25)",
                  color: "#EBC07E",
                  background: "rgba(7,29,41,.72)",
                  borderRadius: 9,
                  padding: "9px 11px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                ATTACH IMAGE
              </button>
              <button
                type="button"
                onClick={() => {
                  stopVoice();
                  setMessages([]);
                  setInput("");
                  setPhoto(null);
                  setError("");
                }}
                style={{
                  border: "1px solid rgba(202,147,50,.25)",
                  color: "#EBC07E",
                  background: "rgba(7,29,41,.72)",
                  borderRadius: 9,
                  padding: "9px 11px",
                  fontSize: 10,
                  cursor: "pointer",
                }}
              >
                NEW CHAT
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    if (file.size > 3 * 1024 * 1024)
                      setError("Images must be 3 MB or smaller.");
                    else setPhoto(file);
                  }
                  event.currentTarget.value = "";
                }}
              />
            </div>
            <div
              style={{
                color: "rgba(245,242,234,.42)",
                fontSize: 8,
                lineHeight: 1.45,
              }}
            >
              Voice conversations use the NEAS Zero Retention ElevenLabs agent.
              Text and image requests in this panel use the NEAS APEX Gemini
              chat route. Microphone access requires HTTPS and browser
              permission. Do not submit confidential project or personal data
              unless the service is approved for that data.
            </div>
          </div>
        )}
      </section>
    </>
  );
}
