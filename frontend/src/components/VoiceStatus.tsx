interface Props {
  transcript: string | null;
  message: string | null;
  speechError: string | null;
}

export default function VoiceStatus({ transcript, message, speechError }: Props) {
  if (!transcript && !message && !speechError) return null;

  return (
    <section aria-label="Voice conversation" className="mx-auto w-full max-w-[1120px] px-5 pt-5 md:px-16">
      {speechError && (
        <p role="status" className="mb-3 rounded-xl border border-sunny bg-sunny/30 px-4 py-3 text-sm font-bold text-sunnydark">
          {speechError}
        </p>
      )}
      <div className={`grid gap-3 ${transcript && message ? "md:grid-cols-2" : ""}`}>
        {transcript && (
          <div aria-live="polite" aria-atomic="true" className="min-w-0 rounded-xl border border-line bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-brand">You said</p>
            <p className="mt-2 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-base font-bold text-ink">“{transcript}”</p>
          </div>
        )}
        {message && (
          <div role="status" className="min-w-0 rounded-xl border border-line bg-subtle p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-muted">Voice2Learn</p>
            <p className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap break-words text-base text-ink">{message}</p>
          </div>
        )}
      </div>
    </section>
  );
}
