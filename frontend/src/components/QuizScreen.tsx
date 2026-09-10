import type { QuizGrade, QuizOptionId, QuizQuestion } from "../types";

interface Props {
  question: QuizQuestion;
  index: number;
  total: number;
  selectedOption: QuizOptionId | null;
  grade: QuizGrade | null;
  locked: boolean;
  error: string | null;
  onSelect: (id: QuizOptionId) => void;
}

export default function QuizScreen({
  question,
  index,
  total,
  selectedOption,
  grade,
  locked,
  error,
  onSelect,
}: Props) {
  const feedbackShown = grade !== null;

  function cardClass(id: QuizOptionId): string {
    const base =
      "tactile flex min-h-[72px] w-full items-center gap-4 p-4 text-left md:p-5";
    if (!feedbackShown) {
      return selectedOption === id
        ? `${base} border-brandbright bg-surface`
        : `${base} bg-surface`;
    }
    if (id === grade.correct_option) {
      return `${base} border-leafdark bg-leaf`;
    }
    if (id === selectedOption) {
      return `${base} border-redder bg-redsoft`;
    }
    return `${base} bg-surface opacity-70`;
  }

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-36 pt-6 md:px-16 md:pt-10">
      <div className="flex items-center justify-center">
        <p
          className="rounded-full bg-subtle px-4 py-1 text-sm font-bold text-muted"
          aria-label={`Question ${index + 1} of ${total}`}
          aria-live="polite"
        >
          Question {index + 1} of {total}
        </p>
      </div>

      <section
        aria-label={`Question ${index + 1}`}
        className="v2l-stage-in mt-6 rounded-xl border border-line bg-surface p-6 md:p-10"
      >
        <p className="type-card text-ink">{question.question}</p>
      </section>

      <div
        role="group"
        aria-label="Answer options"
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6"
      >
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={locked}
            onClick={() => onSelect(option.id)}
            aria-label={`Option ${option.id}: ${option.text}${
              feedbackShown && option.id === grade.correct_option
                ? " (correct answer)"
                : ""
            }`}
            aria-pressed={selectedOption === option.id}
            className={cardClass(option.id)}
          >
            <span
              aria-hidden="true"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-white"
            >
              {option.id}
            </span>
            <span className="type-card text-ink">{option.text}</span>
          </button>
        ))}
      </div>

      <p className="mt-4 text-center text-base text-muted">
        Say A, B, C, or D — or tap your answer!
      </p>

      {error && !feedbackShown && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-xl bg-redsoft p-3 text-center text-base font-bold text-redder"
        >
          {error}
        </p>
      )}

      {feedbackShown && (
        <section
          aria-label={grade.correct ? "Correct" : "Not quite"}
          aria-live="polite"
          className="v2l-stage-in mt-6 rounded-xl border border-line bg-surface p-5"
        >
          <p
            className={`text-lg font-bold ${
              grade.correct ? "text-leafdark" : "text-redder"
            } ${grade.correct ? "v2l-sparkle" : ""}`}
          >
            {grade.correct ? "Nice work! Correct!" : "Not quite."}
          </p>
          <p className="mt-2 text-base text-ink md:text-lg">
            {grade.explanation}
          </p>
        </section>
      )}
    </div>
  );
}
