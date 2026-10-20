import { useCallback, useEffect, useRef, useState } from "react";
import { synthesizeSpeech, transcribeAudio } from "../api";
import type { VoiceState } from "../types";

/** Friendly recoverable prompt used for empty/unrecognized/failed turns. */
export const FRIENDLY_RETRY = "I didn't catch that. Try again.";

/** VAD measurement poll only (not a recording/transcription interval). */
const VAD_POLL_MS = 100;
/** MediaRecorder timeslice so chunks stream while an utterance accumulates. */
const TIMESLICE_MS = 120;
/** Bounded pre-roll retained while silent so first phonemes are not cut. */
const PREROLL_CHUNKS = 5;
/** End-of-speech: sustained silence after detected speech before transcribing. */
const SILENCE_END_MS = 800;
/** Safety cap only (never the normal utterance boundary). */
const MAX_UTTERANCE_MS = 14000;
/** Brief pause on the error visual before the spoken retry. */
const ERROR_PAUSE_MS = 1200;

function supportsSpeech(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

function supportsMonitoring(): boolean {
  return (
    typeof window !== "undefined" &&
    audioContextConstructor() !== null &&
    typeof MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

function rmsOf(buffer: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    const sample = (buffer[i] - 128) / 128;
    sum += sample * sample;
  }
  return Math.sqrt(sum / buffer.length);
}

const PREFERRED_VOICE_NAMES = [
  "samantha",
  "ava",
  "jenny",
  "aria",
  "google us english",
  "natural",
  "neural",
  "zira",
];

function pickEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  const english = voices.filter((voice) =>
    voice.lang.toLowerCase().startsWith("en"),
  );
  if (english.length === 0) {
    return null;
  }
  const scored = english.map((voice) => {
    const name = voice.name.toLowerCase();
    const preference = PREFERRED_VOICE_NAMES.findIndex((hint) =>
      name.includes(hint),
    );
    return {
      voice,
      preference: preference === -1 ? PREFERRED_VOICE_NAMES.length : preference,
      usFirst: voice.lang.toLowerCase() === "en-us" ? 0 : 1,
    };
  });
  scored.sort(
    (a, b) => a.preference - b.preference || a.usFirst - b.usFirst,
  );
  return scored[0].voice;
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const vadTimerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);
  const errorTimerRef = useRef<number | null>(null);
  const preRollRef = useRef<Blob[]>([]);
  const utteranceRef = useRef<Blob[]>([]);
  const headerRef = useRef<Blob | null>(null);
  const speechDetectedRef = useRef(false);
  const finishingRef = useRef(false);
  const processingRef = useRef(false);
  const discardedRef = useRef<WeakSet<MediaRecorder>>(new WeakSet());
  const mimeTypeRef = useRef("audio/webm");
  const captureGenRef = useRef(0);
  const speechSeqRef = useRef(0);
  const noiseFloorRef = useRef(0.01);
  const lastSpeechRef = useRef(0);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const neuralAbortRef = useRef<AbortController | null>(null);
  const neuralAudioRef = useRef<HTMLAudioElement | null>(null);
  const neuralUrlRef = useRef<string | null>(null);

  const setState = useCallback((next: VoiceState) => {
    stateRef.current = next;
    setVoiceState(next);
  }, []);

  const clearVadTimer = useCallback(() => {
    if (vadTimerRef.current !== null) {
      window.clearInterval(vadTimerRef.current);
      vadTimerRef.current = null;
    }
  }, []);

  const clearSafetyTimer = useCallback(() => {
    if (safetyTimerRef.current !== null) {
      window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const clearErrorTimer = useCallback(() => {
    if (errorTimerRef.current !== null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const closeAudioContext = useCallback(() => {
    const context = audioContextRef.current;
    audioContextRef.current = null;
    analyserRef.current = null;
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        // Already disconnected; safe to ignore during teardown.
      }
      sourceRef.current = null;
    }
    if (context) {
      void context.close().catch(() => {});
    }
  }, []);

  /** Discard any partial clip without transcribing (user/TTS/manual stop). */
  const discardClip = useCallback(() => {
    // Invalidate any in-flight transcription: a stale processRecording that
    // resolves after this point must drop its result instead of acting on it.
    captureGenRef.current += 1;
    clearVadTimer();
    clearSafetyTimer();
    speechDetectedRef.current = false;
    finishingRef.current = false;
    preRollRef.current = [];
    utteranceRef.current = [];
    headerRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) {
      // Mark this exact recorder instance discarded so a pending onstop
      // (already stopped, awaiting the event) never processes. A WeakSet
      // keeps newer recorders unaffected by older discard decisions.
      discardedRef.current.add(recorder);
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Already stopping/stopped; onstop still observes the discard mark.
        }
      }
    }
  }, [clearSafetyTimer, clearVadTimer]);

  const cancelSpeech = useCallback(() => {
    // Invalidate the active utterance first so any queued onend/onerror
    // from the canceled utterance no-ops instead of advancing state.
    speechSeqRef.current += 1;
    neuralAbortRef.current?.abort();
    neuralAbortRef.current = null;
    if (neuralAudioRef.current) { neuralAudioRef.current.pause(); neuralAudioRef.current = null; }
    if (neuralUrlRef.current) { URL.revokeObjectURL(neuralUrlRef.current); neuralUrlRef.current = null; }
    if (supportsSpeech()) {
      window.speechSynthesis.cancel();
    }
  }, []);

  /** VAD end-of-speech: stop and process the complete utterance. */
  const finishUtterance = useCallback(() => {
    // Idempotent: a second VAD/safety call for the same utterance is a no-op.
    if (finishingRef.current) {
      return;
    }
    clearVadTimer();
    clearSafetyTimer();
    speechDetectedRef.current = false;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      recorderRef.current = null;
      return;
    }
    finishingRef.current = true;
    try {
      // Flush any buffered final audio before onstop fires.
      if (recorder.state === "recording") {
        try {
          recorder.requestData();
        } catch {
          // requestData is best-effort; stop still flushes the final chunk.
        }
      }
      recorder.stop();
    } catch {
      finishingRef.current = false;
    }
  }, [clearSafetyTimer, clearVadTimer]);

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
    // Idempotent while already monitoring: never duplicate recorder/analyser.
    if (recorderRef.current && analyserRef.current) {
      const context = audioContextRef.current;
      if (context && context.state === "suspended") {
        await context.resume().catch(() => {});
      }
      if (stateRef.current !== "listening") {
        setState("listening");
      }
      return;
    }
    if (!supportsMonitoring()) {
      setNotice("Microphone is blocked. You can still tap the buttons.");
      setState("error");
      return;
    }
    let stream = streamRef.current;
    try {
      if (!stream || stream.getTracks().every((t) => t.readyState === "ended")) {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (!activeRef.current) {
          nextStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = nextStream;
        streamRef.current = nextStream;
      }
    } catch {
      setNotice("Microphone is blocked. You can still tap the buttons.");
      setState("error");
      return;
    }
    try {
      let context = audioContextRef.current;
      if (!context) {
        const AudioContextConstructor = audioContextConstructor();
        if (!AudioContextConstructor) {
          throw new Error("audio monitoring unavailable");
        }
        context = new AudioContextConstructor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        sourceRef.current = source;
        const analyser = context.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        analyserRef.current = analyser;
      }
      if (context.state === "suspended") {
        await context.resume().catch(() => {});
      }
      if (!activeRef.current) {
        discardClip();
        stopTracks();
        closeAudioContext();
        return;
      }
      const analyser = analyserRef.current;
      if (!analyser) {
        throw new Error("analyser unavailable");
      }
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      }
      const recorder = new MediaRecorder(stream, options);
      mimeTypeRef.current = recorder.mimeType || "audio/webm";
      preRollRef.current = [];
      utteranceRef.current = [];
      headerRef.current = null;
      speechDetectedRef.current = false;
      finishingRef.current = false;
      processingRef.current = false;
      recorder.ondataavailable = (event: BlobEvent) => {
        // Late chunks from a discarded instance must not pollute the shared
        // buffers (e.g. a TTS-discarded clip flushing after a new session).
        if (discardedRef.current.has(recorder)) {
          return;
        }
        if (event.data.size === 0) {
          return;
        }
        // Keep the first non-empty chunk aside so the assembled blob retains
        // the container's leading bytes; keep it out of the rolling pre-roll.
        if (headerRef.current === null) {
          headerRef.current = event.data;
          return;
        }
        if (finishingRef.current || speechDetectedRef.current) {
          utteranceRef.current.push(event.data);
          return;
        }
        preRollRef.current.push(event.data);
        if (preRollRef.current.length > PREROLL_CHUNKS) {
          preRollRef.current.shift();
        }
      };
      recorder.onstop = () => {
        if (discardedRef.current.has(recorder)) {
          discardedRef.current.delete(recorder);
          return;
        }
        if (finishingRef.current) {
          finishingRef.current = false;
          void processRecording();
        }
      };
      recorder.onerror = () => {
        // An already-discarded instance stays silent: surfacing an error
        // here could interrupt TTS or discard a newer recorder's clip.
        // Keep the marker so a trailing onstop still sees the discard;
        // onstop owns marker deletion.
        if (discardedRef.current.has(recorder)) {
          return;
        }
        finishingRef.current = false;
        failWithRetry();
      };
      recorderRef.current = recorder;
      setNotice(null);
      setState("listening");
      recorder.start(TIMESLICE_MS);
      clearVadTimer();
      const buffer = new Uint8Array(analyser.fftSize);
      vadTimerRef.current = window.setInterval(() => {
        if (!activeRef.current || stateRef.current !== "listening") {
          return;
        }
        analyser.getByteTimeDomainData(buffer);
        const rms = rmsOf(buffer);
        // Conservative adaptive threshold from the ambient floor.
        const threshold = Math.max(0.015, noiseFloorRef.current * 2.5);
        // Slowly track plausible ambient samples only; louder samples
        // (possible speech) leave the floor alone.
        if (!speechDetectedRef.current && rms < threshold) {
          noiseFloorRef.current = 0.95 * noiseFloorRef.current + 0.05 * rms;
        }
        const now = Date.now();
        if (rms >= threshold) {
          if (!speechDetectedRef.current) {
            speechDetectedRef.current = true;
            // Move pre-roll first so a one-word command like "B" is not cut.
            utteranceRef.current = [
              ...preRollRef.current,
              ...utteranceRef.current,
            ];
            preRollRef.current = [];
            lastSpeechRef.current = now;
            // Safety cap only; normal boundary is sustained silence.
            clearSafetyTimer();
            safetyTimerRef.current = window.setTimeout(() => {
              finishUtterance();
            }, MAX_UTTERANCE_MS);
          } else {
            lastSpeechRef.current = now;
          }
          return;
        }
        if (
          speechDetectedRef.current &&
          now - lastSpeechRef.current >= SILENCE_END_MS
        ) {
          finishUtterance();
        }
      }, VAD_POLL_MS);
    } catch {
      discardClip();
      stopTracks();
      closeAudioContext();
      setNotice(FRIENDLY_RETRY);
      setState("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clearSafetyTimer,
    clearVadTimer,
    closeAudioContext,
    discardClip,
    finishUtterance,
    setState,
    stopTracks,
  ]);

  const failWithRetry = useCallback(() => {
    discardClip();
    setNotice(FRIENDLY_RETRY);
    setState("error");
    clearErrorTimer();
    errorTimerRef.current = window.setTimeout(() => {
      errorTimerRef.current = null;
      if (activeRef.current) {
        speakRef.current(FRIENDLY_RETRY);
      }
    }, ERROR_PAUSE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clearErrorTimer, discardClip, setState]);

  const processRecording = useCallback(async () => {
    if (processingRef.current) {
      return;
    }
    processingRef.current = true;
    recorderRef.current = null;
    clearVadTimer();
    clearSafetyTimer();
    speechDetectedRef.current = false;
    if (!activeRef.current) {
      setState("idle");
      processingRef.current = false;
      return;
    }
    const resumeSilently = () => {
      // Silence/empty success is not an error: resume monitoring silently
      // without speaking. Reset to `idle` first so the startListening guard
      // does not block the next monitoring session.
      processingRef.current = false;
      setNotice(null);
      setState("idle");
      if (activeRef.current) {
        void startListening();
      }
    };
    // Prepend the retained leading chunk so the blob keeps its container header.
    const parts =
      headerRef.current !== null
        ? [headerRef.current, ...utteranceRef.current]
        : utteranceRef.current;
    const blob = new Blob(parts, {
      type: mimeTypeRef.current || "audio/webm",
    });
    utteranceRef.current = [];
    preRollRef.current = [];
    headerRef.current = null;
    if (blob.size === 0) {
      resumeSilently();
      return;
    }
    setState("processing");
    const generation = captureGenRef.current;
    try {
      const text = await transcribeAudio(blob);
      if (generation !== captureGenRef.current) {
        // Invalidated while awaiting (TTS/deactivation/navigation owns the
        // next state): drop the stale result without acting on it.
        processingRef.current = false;
        return;
      }
      processingRef.current = false;
      if (!text || !text.trim()) {
        resumeSilently();
        return;
      }
      transcriptRef.current(text);
    } catch {
      if (generation !== captureGenRef.current) {
        // Stale failure must not speak a retry over current TTS/new state.
        processingRef.current = false;
        return;
      }
      processingRef.current = false;
      failWithRetry();
    }
  }, [clearSafetyTimer, clearVadTimer, failWithRetry, setState, startListening]);

  const speakRef = useRef((_text: string, _onDone?: () => void) => {});
  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      // TTS takes over: stop monitoring/recording and discard partial input.
      discardClip();
      clearErrorTimer();
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
      // Single sequence step, ordered clearly: invalidate the prior
      // utterance first, cancel it once, then the value below is this new
      // utterance's identity. Stale onstart/onend/onerror no-op against it.
      cancelSpeech();
      const seq = speechSeqRef.current;
      const utterance = new SpeechSynthesisUtterance(text);
      const availableVoices =
        voicesRef.current.length > 0
          ? voicesRef.current
          : window.speechSynthesis.getVoices();
      const voice = pickEnglishVoice(availableVoices);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.volume = 1;
      let finished = false;
      utterance.onstart = () => {
        if (finished || seq !== speechSeqRef.current) {
          return;
        }
        setState("speaking");
      };
      const finish = () => {
        if (finished || seq !== speechSeqRef.current) {
          return;
        }
        finished = true;
        neuralAbortRef.current = null;
        neuralAudioRef.current = null;
        if (neuralUrlRef.current) { URL.revokeObjectURL(neuralUrlRef.current); neuralUrlRef.current = null; }
        // With a completion callback, the caller sequences the next step
        // (next question, results) instead of auto-resuming first.
        if (onDone) {
          setState("processing");
          onDone();
        } else if (activeRef.current) {
          setState("idle");
          void startListening();
        } else {
          setState("idle");
        }
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      // Neural speech is preferred; browser voice is the offline/error fallback.
      const controller = new AbortController();
      neuralAbortRef.current = controller;
      setState("processing");
      void synthesizeSpeech(text, controller.signal).then(async (blob) => {
        if (seq !== speechSeqRef.current) return;
        const url = URL.createObjectURL(blob);
        neuralUrlRef.current = url;
        const audio = new Audio(url);
        neuralAudioRef.current = audio;
        audio.onended = finish;
        audio.onerror = () => {
          if (seq === speechSeqRef.current && !finished) {
            audio.onerror = null;
            window.speechSynthesis.speak(utterance);
          }
        };
        await audio.play();
        if (seq === speechSeqRef.current) setState("speaking");
      }).catch(() => {
        if (seq === speechSeqRef.current) window.speechSynthesis.speak(utterance);
      });
    },
    [cancelSpeech, clearErrorTimer, discardClip, setState, startListening],
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
      // Pause: fall back to tap controls and release monitoring resources.
      activeRef.current = false;
      setVoiceActive(false);
      clearErrorTimer();
      discardClip();
      cancelSpeech();
      stopTracks();
      closeAudioContext();
      setNotice(null);
      setState("idle");
      return;
    }
    // One user activation enables the continuous loop from here on.
    activeRef.current = true;
    setVoiceActive(true);
    setNotice(null);
    void startListening();
  }, [
    cancelSpeech,
    clearErrorTimer,
    closeAudioContext,
    discardClip,
    setState,
    startListening,
    stopTracks,
  ]);

  useEffect(() => {
    if (supportsSpeech()) {
      const loadVoices = () => {
        voicesRef.current = window.speechSynthesis.getVoices();
      };
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          loadVoices,
        );
        activeRef.current = false;
        clearErrorTimer();
        discardClip();
        cancelSpeech();
        stopTracks();
        closeAudioContext();
      };
    }
    return () => {
      activeRef.current = false;
      clearErrorTimer();
      discardClip();
      stopTracks();
      closeAudioContext();
    };
  }, [
    cancelSpeech,
    clearErrorTimer,
    closeAudioContext,
    discardClip,
    stopTracks,
  ]);

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
