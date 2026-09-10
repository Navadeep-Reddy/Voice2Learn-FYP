import type { Lesson } from "../types";
import SceneVisual from "./SceneVisual";
import TutorBubble from "./TutorBubble";

interface Props {
  lesson: Lesson;
  sceneIndex: number;
  onBack: () => void;
  onNext: () => void;
  onHome: () => void;
  onStartQuiz: () => void;
  tutorQuestion: string | null;
  tutorAnswer: string | null;
  tutorPending: boolean;
  tutorError: string | null;
}

export default function LessonScreen({
  lesson,
  sceneIndex,
  onBack,
  onNext,
  onHome,
  onStartQuiz,
  tutorQuestion,
  tutorAnswer,
  tutorPending,
  tutorError,
}: Props) {
  const scene = lesson.scenes[sceneIndex];
  const isFirst = sceneIndex === 0;
  const isLast = sceneIndex === lesson.scenes.length - 1;

  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 pb-36 pt-6 md:px-16 md:pt-10">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onHome}
          className="min-h-[48px] rounded-xl px-3 py-2 text-base font-bold text-brand"
          aria-label="Back to home"
        >
          ← Home
        </button>
        <p
          className="rounded-full bg-subtle px-4 py-1 text-sm font-bold text-muted"
          aria-label={`Scene ${sceneIndex + 1} of ${lesson.scenes.length}`}
        >
          {sceneIndex + 1} / {lesson.scenes.length}
        </p>
      </div>

      <h1 className="type-title mt-4 text-ink">Groups and Sharing</h1>
      <h2 className="type-card mt-1 text-brand">{scene.title}</h2>

      <section
        aria-label={`Scene ${sceneIndex + 1}: ${scene.title}`}
        className="mt-6 rounded-xl border border-line bg-surface p-6 md:p-10"
      >
        <SceneVisual sceneIndex={sceneIndex} />
      </section>

      <section
        aria-label="What this scene means"
        className="mt-6 rounded-xl border border-line bg-subtle p-5"
      >
        <p className="text-base text-ink md:text-lg">{scene.narration}</p>
      </section>

      <TutorBubble
        question={tutorQuestion}
        answer={tutorAnswer}
        pending={tutorPending}
        error={tutorError}
      />

      <p className="mt-4 text-center text-base text-muted">
        You can ask a question about this scene!
      </p>

      {isLast && (
        <p className="mt-2 text-center text-base font-bold text-brand">
          Say &ldquo;start quiz&rdquo; when you are ready!
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="min-w-[140px]">
          {!isFirst && (
            <button
              type="button"
              onClick={onBack}
              className="tactile min-h-[48px] min-w-[140px] bg-surface px-6 py-3 text-base font-bold text-ink"
            >
              Back
            </button>
          )}
        </div>
        {!isLast ? (
          <button
            type="button"
            onClick={onNext}
            className="tactile min-h-[48px] min-w-[140px] border-brand bg-brand px-6 py-3 text-base font-bold text-white"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartQuiz}
            className="tactile min-h-[48px] min-w-[140px] border-leafdark bg-leaf px-6 py-3 text-base font-bold text-ink"
          >
            Start Quiz
          </button>
        )}
      </div>
    </div>
  );
}
