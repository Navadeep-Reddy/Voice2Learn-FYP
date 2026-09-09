import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLearner, fetchLesson } from "./api";
import type { LearnerState, Lesson } from "./types";
import { useVoiceLoop } from "./hooks/useVoiceLoop";
import { resolveHomeCommand, resolveLessonCommand } from "./lib/commands";
import Header from "./components/Header";
import FloatingBackground from "./components/FloatingBackground";
import Microphone from "./components/Microphone";
import HomeScreen from "./components/HomeScreen";
import LessonScreen from "./components/LessonScreen";

type Screen = "home" | "lesson";

const QUIZ_SOON_MESSAGE =
  "Great work! You finished the lesson. The quiz is coming soon.";

type VoiceLoopApi = ReturnType<typeof useVoiceLoop>;

export default function App() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [learner, setLearner] = useState<LearnerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const [sceneIndex, setSceneIndex] = useState(0);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const sceneRef = useRef(sceneIndex);
  sceneRef.current = sceneIndex;
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;

  const voiceRef = useRef<VoiceLoopApi | null>(null);

  const goLesson = useCallback(() => {
    setSceneIndex(0);
    setScreen("lesson");
  }, []);

  const quizSoon = useCallback(() => {
    voiceRef.current?.sayAndShow(QUIZ_SOON_MESSAGE);
  }, []);

  const handleTranscript = useCallback(
    (raw: string) => {
      const voice = voiceRef.current;
      if (!voice) {
        return;
      }
      if (screenRef.current === "home") {
        if (resolveHomeCommand(raw) === "start-lesson") {
          goLesson();
        } else {
          voice.reportUnrecognized();
        }
        return;
      }
      const currentLesson = lessonRef.current;
      if (!currentLesson) {
        voice.reportUnrecognized();
        return;
      }
      const index = sceneRef.current;
      const isLast = index === currentLesson.scenes.length - 1;
      const command = resolveLessonCommand(raw, isLast);
      if (command === "next") {
        if (isLast) {
          voice.sayAndShow("You are on the last scene. Say start quiz!");
        } else {
          setSceneIndex(index + 1);
        }
      } else if (command === "back") {
        if (index === 0) {
          voice.sayAndShow("This is the first scene.");
        } else {
          setSceneIndex(index - 1);
        }
      } else if (command === "repeat") {
        voice.speak(currentLesson.scenes[index].narration);
      } else if (command === "start-quiz") {
        voice.sayAndShow(QUIZ_SOON_MESSAGE);
      } else {
        // No tutor Q&A until Pass 4: friendly recoverable prompt instead.
        voice.reportUnrecognized();
      }
    },
    [goLesson],
  );

  const voice = useVoiceLoop(handleTranscript);
  voiceRef.current = voice;

  useEffect(() => {
    async function load() {
      try {
        const [lessonData, learnerData] = await Promise.all([
          fetchLesson(),
          fetchLearner(),
        ]);
        setLesson(lessonData);
        setLearner(learnerData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load data.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  // Controlled narration: every scene change speaks once through the voice
  // loop (which pauses listening while TTS speaks and resumes after, but
  // only auto-listens once the mic has been voice-activated).
  useEffect(() => {
    if (screen === "lesson" && lesson) {
      voice.speak(lesson.scenes[sceneIndex].narration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, sceneIndex, lesson !== null]);

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header />
        <main className="relative z-10 mx-auto max-w-[1120px] px-5 pb-36 pt-10 md:px-16">
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <p className="type-card text-ink">Loading Voice2Learn…</p>
            <p className="mt-2 text-base text-muted">
              Getting your lesson ready.
            </p>
          </div>
        </main>
        <FloatingBackground />
        <Microphone
          voiceState={voice.voiceState}
          voiceActive={voice.voiceActive}
          hint={voice.notice}
          onToggle={voice.toggleMic}
        />
      </div>
    );
  }

  if (error || !lesson || !learner) {
    return (
      <div className="min-h-screen bg-canvas">
        <Header />
        <main className="relative z-10 mx-auto max-w-[1120px] px-5 pb-36 pt-10 md:px-16">
          <div className="rounded-xl border border-line bg-surface p-8 text-center">
            <h1 className="type-card text-ink">Oh no!</h1>
            <p className="mt-2 text-base text-muted">
              I could not load your lesson. Check your connection and try
              again. {error ?? ""}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="tactile mt-6 min-h-[48px] bg-brand px-6 py-3 text-base font-bold text-white"
            >
              Try again
            </button>
          </div>
        </main>
        <FloatingBackground />
        <Microphone
          voiceState={voice.voiceState}
          voiceActive={voice.voiceActive}
          hint={voice.notice}
          onToggle={voice.toggleMic}
        />
      </div>
    );
  }

  const sceneCount = lesson.scenes.length;

  return (
    <div className="min-h-screen bg-canvas">
      <Header />
      <main className="relative z-10">
        {screen === "home" ? (
          <HomeScreen learner={learner} onStartLesson={goLesson} />
        ) : (
          <LessonScreen
            lesson={lesson}
            sceneIndex={sceneIndex}
            onHome={() => {
              voice.cancelSpeech();
              setScreen("home");
            }}
            onBack={() => setSceneIndex((i) => Math.max(0, i - 1))}
            onNext={() => setSceneIndex((i) => Math.min(sceneCount - 1, i + 1))}
            onStartQuiz={quizSoon}
          />
        )}
      </main>
      <FloatingBackground />
      <Microphone
        voiceState={voice.voiceState}
        voiceActive={voice.voiceActive}
        hint={voice.notice}
        onToggle={voice.toggleMic}
      />
    </div>
  );
}
