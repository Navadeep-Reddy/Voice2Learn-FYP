import type { VoiceState } from "../types";

interface Props {
  voiceState: VoiceState;
  voiceActive: boolean;
  hint: string | null;
  onToggle: () => void;
}

const LABELS: Record<VoiceState, string> = {
  idle: "Tap to speak",
  listening: "Listening...",
  processing: "Thinking...",
  speaking: "Speaking...",
  error: "Try again",
};

const STATE_STYLES: Record<VoiceState, string> = {
  idle: "border-sunny bg-sunny text-ink",
  listening: "v2l-mic-listening border-sunny bg-sunny text-ink",
  processing: "border-brandbright bg-surface text-brand",
  speaking: "v2l-mic-speaking border-brandbright bg-brandbright text-white",
  error: "border-redder bg-redsoft text-redder",
};

export default function Microphone({
  voiceState,
  voiceActive,
  hint,
  onToggle,
}: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-20 flex flex-col items-center px-4">
      {hint && (
        <p
          role="status"
          aria-live="polite"
          className="pointer-events-auto mb-3 max-w-md rounded-full bg-surface px-4 py-2 text-center text-sm font-bold text-ink shadow"
        >
          {hint}
        </p>
      )}
      <button
        type="button"
        onClick={onToggle}
        aria-label={`Microphone: ${LABELS[voiceState]}`}
        aria-pressed={voiceActive}
        className={`tactile pointer-events-auto relative flex h-[76px] w-[76px] items-center justify-center rounded-full text-3xl ${STATE_STYLES[voiceState]}`}
      >
        {voiceState === "processing" && (
          <span
            aria-hidden="true"
            className="v2l-mic-ring absolute inset-1 rounded-full border-4 border-transparent border-t-brandbright"
          />
        )}
        {voiceState === "speaking" ? (
          <span
            aria-hidden="true"
            className="v2l-mic-wave flex h-8 items-center gap-1"
          >
            <span />
            <span />
            <span />
            <span />
          </span>
        ) : (
          <span aria-hidden="true">🎤</span>
        )}
      </button>
      <p
        role="status"
        aria-live="polite"
        className="mt-2 rounded-full bg-surface px-3 py-1 text-sm font-bold text-muted"
      >
        {voiceState === "listening" ? (
          <span className="v2l-mic-dots" aria-hidden="true">
            Listening<span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        ) : (
          LABELS[voiceState]
        )}
        <span className="sr-only">{LABELS[voiceState]}</span>
      </p>
    </div>
  );
}
