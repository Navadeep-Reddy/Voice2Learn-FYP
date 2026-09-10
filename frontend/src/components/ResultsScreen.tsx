import type { Proficiency } from "../types";

interface Props {
  score: number;
  total: number;
  proficiency: Proficiency;
  studentName: string;
  onReviewLesson: () => void;
  onRetakeQuiz: () => void;
}

function encouragement(score: number, total: number): string {
  if (score >= total) {
    return "Amazing work! You are a star learner!";
  }
  if (score >= 3) {
    return "Great work! Keep practicing and you will shine!";
  }
  if (score >= 1) {
    return "Good trying! Practice makes it easier!";
  }
  return "Good trying! Let's practice together again!";
}

function ThickBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-ink">{label}</p>
        <p className="text-base font-bold text-brand">{value}%</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} proficiency ${value} percent`}
        className="mt-2 h-6 overflow-hidden rounded-full bg-subtle"
      >
        <div
          className="flex h-full items-center justify-end rounded-full bg-brandbright pr-2"
          style={{ width: `${value}%` }}
        >
          <span className="text-xs font-bold text-white">{value}%</span>
        </div>
      </div>
    </div>
  );
}

export default function ResultsScreen({
  score,
  total,
  proficiency,
  studentName,
  onReviewLesson,
  onRetakeQuiz,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-36 pt-6 md:px-16 md:pt-10">
      <h1 className="type-title text-center text-ink">
        Great job, {studentName}!
      </h1>

      <section
        aria-label="Quiz score"
        className="v2l-pop-in mx-auto mt-6 max-w-xl rounded-xl border border-line bg-surface p-8 text-center"
      >
        <p className="type-hero text-brand">
          {score} / {total}
        </p>
        <p className="mt-3 text-lg text-muted">{encouragement(score, total)}</p>
      </section>

      <section
        aria-label="Updated proficiency"
        className="mx-auto mt-6 max-w-xl rounded-xl border border-line bg-surface p-6"
      >
        <h2 className="text-sm font-bold text-muted">Your progress now</h2>
        <div className="mt-4 space-y-5">
          <ThickBar label="Multiplication" value={proficiency.multiplication} />
          <ThickBar label="Division" value={proficiency.division} />
        </div>
      </section>

      <div className="mx-auto mt-8 flex max-w-xl flex-col gap-4 md:flex-row">
        <button
          type="button"
          onClick={onReviewLesson}
          className="tactile min-h-[48px] flex-1 bg-surface px-6 py-3 text-base font-bold text-ink"
        >
          Review Lesson
        </button>
        <button
          type="button"
          onClick={onRetakeQuiz}
          className="tactile min-h-[48px] flex-1 border-leafdark bg-leaf px-6 py-3 text-base font-bold text-ink"
        >
          Take Quiz Again
        </button>
      </div>

      <p className="mt-4 text-center text-base text-muted">
        Say &ldquo;review lesson&rdquo; or &ldquo;take quiz again&rdquo;!
      </p>
    </div>
  );
}
