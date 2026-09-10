import type { LearnerState } from "../types";
import ProficiencyBar from "./ProficiencyBar";

interface Props {
  learner: LearnerState;
  onStartLesson: () => void;
  onResetDemo: () => void;
  resetting: boolean;
  resetError: string | null;
}

export default function HomeScreen({
  learner,
  onStartLesson,
  onResetDemo,
  resetting,
  resetError,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-36 pt-6 md:px-16 md:pt-10">
      <h1 className="type-hero text-ink">Hi, Alex!</h1>
      <p className="mt-3 max-w-xl text-lg text-muted">
        Let&apos;s learn with apples and groups. You are doing great!
      </p>

      <button
        type="button"
        onClick={onStartLesson}
        className="tactile mt-8 flex min-h-[48px] w-full max-w-xl items-center gap-5 bg-surface p-5 text-left md:p-6"
        aria-label="Start lesson Multiplication and Division"
      >
        <span
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-3xl text-white md:h-20 md:w-20 md:text-4xl"
        >
          ×
        </span>
        <span>
          <span className="type-card block text-ink">
            Multiplication &amp; Division
          </span>
          <span className="mt-1 block text-base text-muted">
            Learn with groups, sharing, and quick challenges.
          </span>
        </span>
      </button>

      <section
        aria-label="Your progress"
        className="mt-8 w-full max-w-xl rounded-xl border border-line bg-surface p-5"
      >
        <h2 className="text-sm font-bold text-muted">Your progress</h2>
        <div className="mt-4 space-y-4">
          <ProficiencyBar
            label="Multiplication"
            value={learner.proficiency.multiplication}
          />
          <ProficiencyBar
            label="Division"
            value={learner.proficiency.division}
          />
        </div>
      </section>

      <button
        type="button"
        onClick={onResetDemo}
        disabled={resetting}
        className="tactile mt-6 min-h-[44px] bg-surface px-5 py-2 text-sm font-bold text-muted disabled:cursor-wait disabled:opacity-60"
        aria-label="Reset demo"
        aria-busy={resetting}
      >
        {resetting ? "Resetting…" : "Reset Demo"}
      </button>
      {resetError ? (
        <p
          role="alert"
          className="mt-2 rounded-xl bg-redsoft p-3 text-sm font-bold text-redder"
        >
          {resetError}
        </p>
      ) : null}
    </div>
  );
}
