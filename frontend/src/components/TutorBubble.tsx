interface Props {
  question: string | null;
  answer: string | null;
  pending: boolean;
  error: string | null;
}

/** In-scene tutor bubble: lesson stays visible, same scene resumes after. */
export default function TutorBubble({ question, answer, pending, error }: Props) {
  if (!pending && !answer && !error) {
    return null;
  }
  return (
    <section
      aria-label={pending ? "Helper is thinking" : "Helper answer"}
      aria-live="polite"
      className="v2l-stage-in mt-6 rounded-xl border border-line bg-surface p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-xl text-white"
        >
          🦉
        </span>
        <div>
          <p className="text-sm font-bold text-brand">Helper</p>
          {pending ? (
            <p className="text-sm font-bold text-muted">Thinking…</p>
          ) : (
            <p className="text-sm font-bold text-muted">Lesson is paused</p>
          )}
        </div>
      </div>
      {question && (
        <p className="mt-3 text-base text-muted">You asked: “{question}”</p>
      )}
      {pending && (
        <p className="v2l-mic-dots mt-2 text-lg text-ink">
          Thinking<span>.</span>
          <span>.</span>
          <span>.</span>
        </p>
      )}
      {!pending && answer && (
        <p className="mt-2 text-base text-ink md:text-lg">{answer}</p>
      )}
      {!pending && !answer && error && (
        <p className="mt-2 rounded-xl bg-redsoft p-3 text-base text-ink">{error}</p>
      )}
    </section>
  );
}
