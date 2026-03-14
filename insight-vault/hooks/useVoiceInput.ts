"use client";
import { useState, useRef, useCallback, useEffect } from "react";

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  /** Append transcript to existing text instead of replacing */
  append?: boolean;
  lang?: string;
  continuous?: boolean;
}

export function useVoiceInput({
  onTranscript,
  lang = "en-US",
  continuous = true,
}: UseVoiceInputOptions) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Track whether we *want* to be listening (vs browser auto-stopping)
  const wantListeningRef = useRef(false);
  // Prevent infinite restart loops
  const restartCountRef = useRef(0);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check browser support
  useEffect(() => {
    const SR =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setSupported(!!SR);
  }, []);

  const stop = useCallback(() => {
    wantListeningRef.current = false;
    restartCountRef.current = 0;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
    setInterimText("");
  }, []);

  const start = useCallback(() => {
    setError(null);
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError("Speech recognition not supported in this browser.");
      return;
    }

    // Stop any existing instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    wantListeningRef.current = true;
    restartCountRef.current = 0;

    const recognition = new SR();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
      restartCountRef.current = 0;
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interim = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        onTranscript(finalTranscript);
        setInterimText("");
      } else {
        setInterimText(interim);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "no-speech" — browser timed out waiting for audio; we auto-restart
      if (event.error === "no-speech" || event.error === "aborted") {
        return;
      }

      // Fatal errors — stop and show message
      wantListeningRef.current = false;
      if (event.error === "not-allowed") {
        setError("Microphone access denied. Please allow microphone permissions.");
      } else if (event.error === "network") {
        setError("Network error — speech service unavailable. Try again.");
      } else if (event.error === "service-not-allowed") {
        setError("Speech service not available. Try a Chromium-based browser.");
      } else if (event.error === "audio-capture") {
        setError("No microphone found. Please connect a microphone.");
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setInterimText("");

      // Auto-restart if user hasn't pressed stop
      // (browser kills recognition after silence or no-speech timeout)
      if (wantListeningRef.current) {
        restartCountRef.current += 1;

        // Safety: give up after 5 consecutive restarts with no speech
        if (restartCountRef.current > 5) {
          wantListeningRef.current = false;
          setListening(false);
          setError("No speech detected. Tap the mic to try again.");
          return;
        }

        // Brief delay before restarting to avoid rapid-fire
        restartTimerRef.current = setTimeout(() => {
          if (!wantListeningRef.current) return;
          try {
            const newRecognition = new SR();
            newRecognition.continuous = continuous;
            newRecognition.interimResults = true;
            newRecognition.lang = lang;
            newRecognition.onstart = recognition.onstart;
            newRecognition.onresult = recognition.onresult;
            newRecognition.onerror = recognition.onerror;
            newRecognition.onend = recognition.onend;
            recognitionRef.current = newRecognition;
            newRecognition.start();
          } catch {
            wantListeningRef.current = false;
            setListening(false);
            setError("Could not restart speech recognition. Tap the mic to try again.");
          }
        }, 300);
        return;
      }

      setListening(false);
    };

    try {
      recognition.start();
    } catch {
      setError("Could not start speech recognition. Is another app using the microphone?");
      wantListeningRef.current = false;
    }
  }, [continuous, lang, onTranscript]);

  const toggle = useCallback(() => {
    if (listening) {
      stop();
    } else {
      start();
    }
  }, [listening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return { listening, supported, interimText, error, start, stop, toggle };
}
