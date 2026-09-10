import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../api";
import type { VoiceState } from "../types";

/** Friendly recoverable prompt used for empty/unrecognized/failed turns. */
export const FRIENDLY_RETRY = "I didn't catch that. Try again.";

/** Bounded automatic utterance window per Pass 3 (no true barge-in). */
const UTTERANCE_MS = 4000;
/** Brief pause on the error visual before the spoken retry. */
const ERROR_PAUSE_MS = 1200;

function supportsSpeech(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

export interface VoiceLoop {
  voiceState: VoiceState;
  notice: string | null;
  voiceActive: boolean;
  toggleMic: () => void;
  speak: (text: string, onDone?: () => void) => void;
  cancelSpeech: () => void;
  reportUnrecognized: () => void;
  sayAndShow: (text: string) => void;
}

export function useVoiceLoop(
  onTranscript: (text: string) => void,
): VoiceLoop {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);

  const stateRef = useRef<VoiceState>("idle");
  const activeRef = useRef(false);
  const transcriptRef = useRef(onTranscript);
  transcriptRef.current = onTranscript;

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const suppressStopRef = useRef(false);

  const setState = useCallback((next: VoiceState) => {
    stateRef.current = next;
    setVoiceState(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      suppressStopRef.current = true;
      recorder.stop();
    }
    recorderRef.current = null;
  }, []);

  const cancelSpeech = useCallback(() => {
    if (supportsSpeech()) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!activeRef.current) {
      return;
    }
    const current = stateRef.current;
    if (current === "listening" || current === "processing") {
      return;
    }
    if (supportsSpeech() && window.speechSynthesis.speaking) {
      return;
    }
    let stream = streamRef.current;
    try {
      if (!stream || stream.getTracks().every((t) => t.readyState === "ended")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
      }
    } catch {
      setNotice("Microphone is blocked. You can still tap the buttons.");
      setState("error");
      return;
    }
    try {
      const options: MediaRecorderOptions = {};
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        options.mimeType = "audio/webm";
      }
      const recorder = new MediaRecorder(stream, options);
      chunksRef.current = [];
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        if (suppressStopRef.current) {
          suppressStopRef.current = false;
          return;
        }
        void processRecording();
      };
      recorderRef.current = recorder;
      setNotice(null);
      setState("listening");
      recorder.start();
      timerRef.current = window.setTimeout(() => {
        const active = recorderRef.current;
        if (active && active.state !== "inactive") {
          active.stop();
        }
      }, UTTERANCE_MS);
    } catch {
      setNotice(FRIENDLY_RETRY);
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setState]);

  const failWithRetry = useCallback(() => {
    setNotice(FRIENDLY_RETRY);
    setState("error");
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
    }
    errorTimerRef.current = window.setTimeout(() => {
      errorTimerRef.current = null;
      if (activeRef.current) {
        speakRef.current(FRIENDLY_RETRY);
      }
    }, ERROR_PAUSE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setState]);

  const processRecording = useCallback(async () => {
    recorderRef.current = null;
    if (!activeRef.current) {
      setState("idle");
      return;
    }
    const resumeSilently = () => {
      // Silence/empty success is not an error: stay in the continuous loop
      // without speaking. Leave `processing`/`listening` first so the
      // startListening guard does not block the next window.
      setNotice(null);
      setState("idle");
      if (activeRef.current) {
        void startListening();
      }
    };
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];
    if (blob.size === 0) {
      resumeSilently();
      return;
    }
    setState("processing");
    try {
      const text = await transcribeAudio(blob);
      if (!text || !text.trim()) {
        resumeSilently();
        return;
      }
      transcriptRef.current(text);
    } catch {
      failWithRetry();
    }
  }, [failWithRetry, setState, startListening]);

  const speakRef = useRef((_text: string, _onDone?: () => void) => {});
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      stopRecording();
      if (errorTimerRef.current !== null) {
        window.clearTimeout(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      if (!supportsSpeech()) {
        // No TTS available: run the completion (if any) immediately instead
        // of auto-resuming first; otherwise resume listening if activated.
        if (onDone) {
          setState("processing");
          onDone();
        } else if (activeRef.current) {
          void startListening();
        } else {
          setState("idle");
        }
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        setState("speaking");
      };
      let finished = false;
      const finish = () => {
        if (finished) {
          return;
        }
        finished = true;
        // With a completion callback, the caller sequences the next step
        // (next question, results) instead of auto-resuming first.
        if (onDone) {
          setState("processing");
          onDone();
        } else if (activeRef.current) {
          void startListening();
        } else {
          setState("idle");
        }
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    },
    [setState, startListening, stopRecording],
  );
  speakRef.current = speak;

  const sayAndShow = useCallback(
    (text: string) => {
      setNotice(text);
      speak(text);
    },
    [speak],
  );

  const reportUnrecognized = useCallback(() => {
    failWithRetry();
  }, [failWithRetry]);

  const toggleMic = useCallback(() => {
    if (activeRef.current) {
      // Pause: fall back to tap controls.
      activeRef.current = false;
      setVoiceActive(false);
      clearTimers();
      stopRecording();
      cancelSpeech();
      setNotice(null);
      setState("idle");
      return;
    }
    // One user activation enables the continuous loop from here on.
    activeRef.current = true;
    setVoiceActive(true);
    setNotice(null);
    void startListening();
  }, [cancelSpeech, clearTimers, setState, startListening, stopRecording]);

  useEffect(() => {
    return () => {
      activeRef.current = false;
      clearTimers();
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        suppressStopRef.current = true;
        recorder.stop();
      }
      if (supportsSpeech()) {
        window.speechSynthesis.cancel();
      }
      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [clearTimers]);

  return {
    voiceState,
    notice,
    voiceActive,
    toggleMic,
    speak,
    cancelSpeech,
    reportUnrecognized,
    sayAndShow,
  };
}
