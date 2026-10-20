import { useCallback, useEffect, useRef, useState } from "react";
import { answerQuiz, askTutor, classifyIntent, fetchLearner, fetchLesson, fetchQuizNext, resetDemo } from "./api";
import type {
  IntentResult,
  LearnerState,
  Lesson,
  Proficiency,
  QuizGrade,
  QuizOptionId,
  QuizQuestion,
} from "./types";
import { useVoiceLoop } from "./hooks/useVoiceLoop";
import Header from "./components/Header";
import FloatingBackground from "./components/FloatingBackground";
import Microphone from "./components/Microphone";
import VoiceStatus from "./components/VoiceStatus";
import HomeScreen from "./components/HomeScreen";
import LessonScreen from "./components/LessonScreen";
import QuizScreen from "./components/QuizScreen";
import ResultsScreen from "./components/ResultsScreen";

type Screen = "home" | "lesson" | "quiz" | "results";

const QUIZ_TOTAL = 5;

type VoiceLoopApi = ReturnType<typeof useVoiceLoop>;

function summaryFor(score: number): string {
  if (score >= QUIZ_TOTAL) {
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

export default function App() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [learner, setLearner] = useState<LearnerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("home");
  const contentRef = useRef<HTMLElement | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [passedChecks, setPassedChecks] = useState<string[]>([]);
  const [checkSelection, setCheckSelection] = useState<QuizOptionId | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [tutorQuestion, setTutorQuestion] = useState<string | null>(null);
  const [tutorAnswer, setTutorAnswer] = useState<string | null>(null);
  const [tutorError, setTutorError] = useState<string | null>(null);
  const [tutorPending, setTutorPending] = useState(false);

  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null,
  );
  const [quizIndex, setQuizIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<QuizOptionId | null>(
    null,
  );
  const [grade, setGrade] = useState<QuizGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [finalProficiency, setFinalProficiency] = useState<Proficiency | null>(
    null,
  );
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const screenRef = useRef(screen);
  screenRef.current = screen;
  const sceneRef = useRef(sceneIndex);
  sceneRef.current = sceneIndex;
  const passedRef = useRef(passedChecks);
  passedRef.current = passedChecks;
  const notesRef = useRef(notesOpen);
  notesRef.current = notesOpen;
  const lessonRef = useRef(lesson);
  lessonRef.current = lesson;

  const voiceRef = useRef<VoiceLoopApi | null>(null);
  const tutorPendingRef = useRef(false);
  const tutorSeqRef = useRef(0);
  const quizSeqRef = useRef(0);
  const quizLoadPendingRef = useRef<number | null>(null);
  const quizManualAdvancingRef = useRef(false);
  const intentPendingRef = useRef(false);
  const intentSeqRef = useRef(0);
  const resetPendingRef = useRef(false);
  const scoreRef = useRef(0);
  scoreRef.current = score;
  const quizIndexRef = useRef(0);
  quizIndexRef.current = quizIndex;

  const quizErrorRef = useRef(quizError);
  quizErrorRef.current = quizError;
  const quizSnapRef = useRef({
    question: currentQuestion,
    grade,
    grading,
    quizLoading,
  });
  quizSnapRef.current = {
    question: currentQuestion,
    grade,
    grading,
    quizLoading,
  };

  const clearTutor = useCallback(() => {
    tutorSeqRef.current += 1;
    tutorPendingRef.current = false;
    setTutorQuestion(null);
    setTutorAnswer(null);
    setTutorError(null);
    setTutorPending(false);
  }, []);

  const goLesson = useCallback(() => {
    setPassedChecks([]);
    setCheckSelection(null);
    setSceneIndex(0);
    setScreen("lesson");
  }, []);

  const goHome = useCallback(() => {
    setScreen("home");
    voiceRef.current?.sayAndShow('You are on Home. Say “start lesson” to begin.');
  }, []);

  const handleResetDemo = useCallback(() => {
    if (resetPendingRef.current) {
      return;
    }
    resetPendingRef.current = true;
    setResetting(true);
    setResetError(null);
    // Stop an active recording/listening loop so a transcript cannot start
    // a new classification during reset; otherwise just cancel any speech
    // so the next demo starts predictably.
    const voice = voiceRef.current;
    if (voice?.voiceActive) {
      voice.toggleMic();
    } else {
      voice?.cancelSpeech();
    }
    // Invalidate anything in flight so stale responses cannot repaint the UI.
    intentSeqRef.current += 1;
    intentPendingRef.current = false;
    tutorSeqRef.current += 1;
    tutorPendingRef.current = false;
    quizSeqRef.current += 1;
    void (async () => {
      try {
        const pristine = await resetDemo();
        setLearner(pristine);
        setSceneIndex(0);
        setPassedChecks([]);
        setCheckSelection(null);
        setNotesOpen(false);
        setTutorQuestion(null);
        setTutorAnswer(null);
        setTutorError(null);
        setTutorPending(false);
        setCurrentQuestion(null);
        setQuizIndex(0);
        setScore(0);
        setSelectedOption(null);
        setGrade(null);
        setGrading(false);
        setQuizLoading(false);
        setQuizError(null);
        setFinalProficiency(null);
        setError(null);
        setScreen("home");
      } catch {
        setResetError("I could not reset the demo. Try again.");
      } finally {
        resetPendingRef.current = false;
        setResetting(false);
      }
    })();
  }, []);

  const speakQuestion = useCallback((q: QuizQuestion, index: number) => {
    const voice = voiceRef.current;
    if (!voice) {
      return;
    }
    const optionsSpeech = q.options
      .map((option) => `Option ${option.id}: ${option.text}.`)
      .join(" ");
    // Plain speak: listening resumes automatically after the question and
    // all four options have been read aloud.
    voice.speak(
      `Question ${index + 1} of ${QUIZ_TOTAL}. ${q.question} ${optionsSpeech}`,
    );
  }, []);

  const loadQuestion = useCallback(
    async (seq: number, index: number) => {
      if (quizLoadPendingRef.current === seq) return;
      quizLoadPendingRef.current = seq;
      setQuizLoading(true);
      setQuizError(null);
      setCurrentQuestion(null);
      setSelectedOption(null);
      setGrade(null);
      setQuizIndex(index);
      try {
        const q = await fetchQuizNext();
        if (quizSeqRef.current !== seq || screenRef.current !== "quiz") {
          return;
        }
        setCurrentQuestion(q);
        setSelectedOption(null);
        setGrade(null);
        setQuizLoading(false);
        speakQuestion(q, index);
      } catch (err) {
        if (quizSeqRef.current !== seq || screenRef.current !== "quiz") {
          return;
        }
        const friendly =
          err instanceof Error && err.message
            ? err.message
            : "My helper is having trouble right now. Try again.";
        setQuizLoading(false);
        setQuizError(friendly);
        voiceRef.current?.sayAndShow(friendly);
      } finally {
        if (quizLoadPendingRef.current === seq) quizLoadPendingRef.current = null;
      }
    },
    [speakQuestion],
  );

  const startQuiz = useCallback(() => {
    if (screenRef.current === "lesson" && (!lessonRef.current || !passedRef.current.includes(lessonRef.current.scenes[sceneRef.current].id))) {
      voiceRef.current?.sayAndShow("Answer the quick check first.");
      return;
    }
    setNotesOpen(false);
    quizSeqRef.current += 1;
    const seq = quizSeqRef.current;
    voiceRef.current?.cancelSpeech();
    setScore(0);
    setQuizIndex(0);
    setCurrentQuestion(null);
    setSelectedOption(null);
    setGrade(null);
    setGrading(false);
    setQuizError(null);
    setFinalProficiency(null);
    setScreen("quiz");
    void loadQuestion(seq, 0);
  }, [loadQuestion]);

  const retryQuizLoad = useCallback(() => {
    const snap = quizSnapRef.current;
    if (screenRef.current !== "quiz" || snap.question || snap.quizLoading || !quizErrorRef.current) return;
    void loadQuestion(quizSeqRef.current, quizIndexRef.current);
  }, [loadQuestion]);

  const submitAnswer = useCallback(
    async (optionId: QuizOptionId) => {
      quizManualAdvancingRef.current = false;
      const snap = quizSnapRef.current;
      if (screenRef.current !== "quiz") {
        return;
      }
      // Voice or click submits once; duplicates are disabled during
      // grading and after feedback is shown.
      if (!snap.question || snap.grade || snap.grading || snap.quizLoading) {
        return;
      }
      const seq = quizSeqRef.current;
      const q = snap.question;
      const index = quizIndexRef.current;
      const voice = voiceRef.current;
      if (!voice) {
        return;
      }
      setSelectedOption(optionId);
      setGrading(true);
      setQuizError(null);
      try {
        // The backend state update completes before any next-question
        // request is made.
        const result = await answerQuiz(q.question_id, optionId);
        if (quizSeqRef.current !== seq || screenRef.current !== "quiz") {
          return;
        }
        const nextScore = scoreRef.current + (result.correct ? 1 : 0);
        setGrade(result);
        setGrading(false);
        setFinalProficiency(result.proficiency);
        if (result.correct) {
          setScore(nextScore);
        }
        const feedbackSpeech = result.correct
          ? `Nice work! ${result.explanation}`
          : `Not quite. The answer is ${result.correct_option}. ${result.explanation}`;
        // Only after feedback TTS completes, continue: next question, or
        // the results summary after question 5.
        voice.speak(feedbackSpeech, () => {
          if (quizSeqRef.current !== seq || screenRef.current !== "quiz") {
            return;
          }
          if (quizManualAdvancingRef.current) {
            quizManualAdvancingRef.current = false;
            return;
          }
          if (index >= QUIZ_TOTAL - 1) {
            setLearner((prev) =>
              prev ? { ...prev, proficiency: result.proficiency } : prev,
            );
            setScreen("results");
            voiceRef.current?.speak(
              `You got ${nextScore} out of ${QUIZ_TOTAL}. ${summaryFor(nextScore)}`,
            );
          } else {
            void loadQuestion(seq, index + 1);
          }
        });
      } catch (err) {
        if (quizSeqRef.current !== seq || screenRef.current !== "quiz") {
          return;
        }
        const friendly =
          err instanceof Error && err.message
            ? err.message
            : "My helper is having trouble right now. Try again.";
        setGrading(false);
        setSelectedOption(null);
        setQuizError(friendly);
        voice.speak(friendly);
      }
    },
    [loadQuestion],
  );

  const onQuizNext = useCallback(() => {
    quizManualAdvancingRef.current = true;
    voiceRef.current?.cancelSpeech();
    const index = quizIndexRef.current;
    if (index >= QUIZ_TOTAL - 1) {
      const currentGrade = quizSnapRef.current.grade;
      if (!currentGrade) {
        quizManualAdvancingRef.current = false;
        return;
      }
      setLearner((prev) =>
        prev ? { ...prev, proficiency: currentGrade.proficiency } : prev,
      );
      setScreen("results");
      voiceRef.current?.speak(
        `You got ${scoreRef.current} out of ${QUIZ_TOTAL}. ${summaryFor(scoreRef.current)}`,
      );
      quizManualAdvancingRef.current = false;
      return;
    }
    void loadQuestion(quizSeqRef.current, index + 1);
  }, [loadQuestion]);

  const reviewLesson = useCallback(() => {
    quizSeqRef.current += 1;
    voiceRef.current?.cancelSpeech();
    setSceneIndex(0);
    setPassedChecks([]);
    setCheckSelection(null);
    setScreen("lesson");
    void fetchLearner()
      .then((data) => setLearner(data))
      .catch(() => {});
  }, []);

  const askLessonQuestion = useCallback((text: string, sceneId: string, requestIndex: number) => {
    const voice = voiceRef.current;
    if (!voice) {
      return;
    }
    if (tutorPendingRef.current) {
      return;
    }
    tutorPendingRef.current = true;
    tutorSeqRef.current += 1;
    const seq = tutorSeqRef.current;
    setTutorQuestion(text);
    setTutorAnswer(null);
    setTutorError(null);
    setTutorPending(true);
    void (async () => {
      try {
        const answer = await askTutor(sceneId, text);
        if (tutorSeqRef.current !== seq) {
          return;
        }
        if (screenRef.current !== "lesson" || sceneRef.current !== requestIndex) {
          return;
        }
        tutorPendingRef.current = false;
        setTutorAnswer(answer);
        setTutorPending(false);
        voice.speak(answer);
      } catch (err) {
        if (tutorSeqRef.current !== seq) {
          return;
        }
        if (screenRef.current !== "lesson" || sceneRef.current !== requestIndex) {
          return;
        }
        const friendly =
          err instanceof Error && err.message
            ? err.message
            : "My helper is having trouble right now. Try again.";
        tutorPendingRef.current = false;
        setTutorError(friendly);
        setTutorPending(false);
        voice.speak(friendly);
      }
    })();
  }, []);

  const selectCheck = useCallback((option: QuizOptionId) => {
    const scene = lessonRef.current?.scenes[sceneRef.current];
    if (!scene) return;
    setCheckSelection(option);
    if (option === scene.check.correct_option) {
      setPassedChecks((previous) => previous.includes(scene.id) ? previous : [...previous, scene.id]);
      voiceRef.current?.speak("That is right! Say next when you are ready.");
    } else {
      voiceRef.current?.speak(`Not quite. ${scene.check.hint} Try again.`);
    }
  }, []);

  const dispatchIntent = useCallback(
    (result: IntentResult, rawText: string) => {
      const voice = voiceRef.current;
      if (!voice) {
        return;
      }
      const currentScreen = screenRef.current;
      const reportUnrecognized = () => {
        const guidance = {
          home: 'You are on Home. Say “start lesson” to begin.',
          lesson: 'Try an answer choice, “next”, “back”, “repeat”, or ask a question.',
          quiz: 'Try an answer choice, “repeat question”, or “show lesson notes”.',
          results: 'Say “review lesson” or “take quiz again”.',
        };
        voice.reportUnrecognized(guidance[currentScreen]);
      };
      if (result.action === "help") {
        const help = { home: "Say start lesson.", lesson: "Say a letter to answer the quick check, next, back, repeat, or ask a question.", quiz: "Say a letter to answer, repeat question, show lesson notes, hide notes, or read notes.", results: "Say review lesson or take quiz again." };
        voice.sayAndShow(help[currentScreen]);
        return;
      }
      if (currentScreen === "home") {
        if (result.action === "start-lesson") {
          goLesson();
        } else {
          reportUnrecognized();
        }
        return;
      }
      if (currentScreen === "quiz") {
        if (result.action === "select-option" && result.option) {
          void submitAnswer(result.option);
        } else if (result.action === "open-notes") {
          setNotesOpen(true);
          voice.speak("Lesson notes are open. Say read notes to hear them.");
        } else if (result.action === "close-notes") {
          setNotesOpen(false);
          voice.speak("Lesson notes are closed.");
        } else if (result.action === "read-notes") {
          voice.speak(lessonRef.current?.scenes.map((scene) => `${scene.title}. ${scene.narration}`).join(" ") ?? "Lesson notes are not ready.");
        } else if (result.action === "retry-question" && quizSnapRef.current.question === null && quizErrorRef.current && !quizSnapRef.current.quizLoading) {
          retryQuizLoad();
        } else if (result.action === "repeat-question") {
          const snap = quizSnapRef.current;
          if (snap.question && !snap.quizLoading) {
            speakQuestion(snap.question, quizIndexRef.current);
          } else {
            reportUnrecognized();
          }
        } else {
          reportUnrecognized();
        }
        return;
      }
      if (currentScreen === "results") {
        if (result.action === "review-lesson") {
          reviewLesson();
        } else if (result.action === "retake-quiz") {
          startQuiz();
        } else {
          reportUnrecognized();
        }
        return;
      }
      const currentLesson = lessonRef.current;
      if (!currentLesson) {
        reportUnrecognized();
        return;
      }
      const index = sceneRef.current;
      const isLast = index === currentLesson.scenes.length - 1;
      if (result.action === "select-check" && result.option) {
        selectCheck(result.option);
      } else if (result.action === "home") {
        goHome();
      } else if (result.action === "next") {
        if (!passedRef.current.includes(currentLesson.scenes[index].id)) {
          voice.sayAndShow("Answer the quick check first.");
          return;
        }
        if (isLast) {
          voice.sayAndShow("You are on the last scene. Say start quiz!");
        } else {
          setCheckSelection(null);
          setSceneIndex(index + 1);
        }
      } else if (result.action === "back") {
        if (index === 0) {
          goHome();
        } else {
          setCheckSelection(null);
          setSceneIndex(index - 1);
        }
      } else if (result.action === "repeat") {
        voice.speak(`${currentLesson.scenes[index].narration} Quick check. ${currentLesson.scenes[index].check.question} ${currentLesson.scenes[index].check.options.map((o) => `Option ${o.id}: ${o.text}.`).join(" ")}`);
      } else if (result.action === "start-quiz") {
        // Never leave the lesson early on a malformed result.
        if (!isLast) {
          reportUnrecognized();
          return;
        }
        startQuiz();
      } else if (result.action === "ask-question") {
        askLessonQuestion(rawText, currentLesson.scenes[index].id, index);
      } else {
        reportUnrecognized();
      }
    },
    [askLessonQuestion, goHome, goLesson, reviewLesson, retryQuizLoad, selectCheck, speakQuestion, startQuiz, submitAnswer],
  );

  const handleTranscript = useCallback(
    (raw: string) => {
      const voice = voiceRef.current;
      if (!voice) {
        return;
      }
      const text = raw.trim();
      if (!text) {
        return;
      }
      // Minimal guard: ignore duplicates while one classification is in flight.
      if (intentPendingRef.current) {
        return;
      }
      const requestScreen = screenRef.current;
      const requestScene = sceneRef.current;
      const requestQuizSeq = quizSeqRef.current;
      const requestQuestionId = quizSnapRef.current.question?.question_id ?? null;
      const requestQuestion = quizSnapRef.current.question;
      const requestQuizLoading = quizSnapRef.current.quizLoading;
      const requestQuizError = requestQuestion === null && !requestQuizLoading && !!quizErrorRef.current;
      const requestNotesOpen = notesRef.current;
      const requestCheck = lessonRef.current?.scenes[requestScene]?.check;
      intentPendingRef.current = true;
      intentSeqRef.current += 1;
      const seq = intentSeqRef.current;
      const body =
        requestScreen === "lesson"
          ? {
              transcript: text,
              screen: requestScreen,
              scene_id:
                lessonRef.current?.scenes[requestScene]?.id ?? "",
              check_question: requestCheck?.question,
              check_options: requestCheck?.options,
            }
          : requestScreen === "quiz" && requestQuestion
            ? {
                transcript: text,
                screen: requestScreen,
                quiz_question: requestQuestion.question,
                quiz_options: requestQuestion.options.map((option) => ({
                  id: option.id,
                  text: option.text,
                })),
                notes_open: requestNotesOpen,
              }
            : requestScreen === "quiz"
              ? { transcript: text, screen: requestScreen, quiz_error: requestQuizError, notes_open: requestNotesOpen }
              : { transcript: text, screen: requestScreen };
      void (async () => {
        try {
          const result = await classifyIntent(body);
          if (intentSeqRef.current !== seq) {
            return;
          }
          // Discard stale results after navigation or a new question/session.
          if (screenRef.current !== requestScreen) {
            return;
          }
          if (
            requestScreen === "lesson" &&
            sceneRef.current !== requestScene
          ) {
            return;
          }
          if (
            requestScreen === "quiz" &&
            (quizSeqRef.current !== requestQuizSeq ||
              (quizSnapRef.current.question?.question_id ?? null) !== requestQuestionId ||
              quizSnapRef.current.quizLoading !== requestQuizLoading ||
              (quizSnapRef.current.question === null && !quizSnapRef.current.quizLoading && !!quizErrorRef.current) !== requestQuizError ||
              notesRef.current !== requestNotesOpen)
          ) {
            return;
          }
          dispatchIntent(result, text);
        } catch (err) {
          if (intentSeqRef.current !== seq) {
            return;
          }
          if (screenRef.current !== requestScreen) {
            return;
          }
          const friendly =
            err instanceof Error && err.message
              ? err.message
              : "My helper is having trouble right now. Try again.";
          voice.sayAndShow(friendly);
        } finally {
          if (intentSeqRef.current === seq) {
            intentPendingRef.current = false;
          }
        }
      })();
    },
    [dispatchIntent],
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
  // Stale tutor UI never carries across scenes or screens; this also
  // invalidates any in-flight tutor response via the sequence guard.
  useEffect(() => {
    clearTutor();
  }, [screen, sceneIndex, clearTutor]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [screen, sceneIndex, quizIndex]);

  // Invalidate any in-flight intent classification after navigation or a new
  // quiz question; the stale result is discarded by the sequence guard.
  useEffect(() => {
    intentSeqRef.current += 1;
    intentPendingRef.current = false;
  }, [screen, sceneIndex, currentQuestion?.question_id, quizLoading, quizError, notesOpen]);

  useEffect(() => {
    if (screen === "lesson" && lesson) {
      const scene = lesson.scenes[sceneIndex];
      voice.speak(`${scene.narration} Quick check. ${scene.check.question} ${scene.check.options.map((option) => `Option ${option.id}: ${option.text}.`).join(" ")}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, sceneIndex, lesson !== null]);

  if (loading) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-canvas pb-36" onPointerDownCapture={voice.prepareSpeech} onKeyDownCapture={voice.prepareSpeech}>
        <Header />
        <main ref={contentRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <VoiceStatus transcript={voice.lastTranscript} message={voice.notice} speechError={voice.speechError} />
          <div className="mx-auto w-full max-w-[1120px] px-5 pb-8 pt-10 md:px-16">
            <div className="rounded-xl border border-line bg-surface p-8 text-center">
              <p className="type-card text-ink">Loading Voice2Learn…</p>
              <p className="mt-2 text-base text-muted">
                Getting your lesson ready.
              </p>
            </div>
          </div>
        </main>
        <FloatingBackground />
        <Microphone
          voiceState={voice.voiceState}
          voiceActive={voice.voiceActive}
          onToggle={voice.toggleMic}
        />
      </div>
    );
  }

  if (error || !lesson || !learner) {
    return (
      <div className="flex h-dvh flex-col overflow-hidden bg-canvas pb-36" onPointerDownCapture={voice.prepareSpeech} onKeyDownCapture={voice.prepareSpeech}>
        <Header />
        <main ref={contentRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto">
          <VoiceStatus transcript={voice.lastTranscript} message={voice.notice} speechError={voice.speechError} />
          <div className="mx-auto w-full max-w-[1120px] px-5 pb-8 pt-10 md:px-16">
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
          </div>
        </main>
        <FloatingBackground />
        <Microphone
          voiceState={voice.voiceState}
          voiceActive={voice.voiceActive}
          onToggle={voice.toggleMic}
        />
      </div>
    );
  }


  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas pb-36" onPointerDownCapture={voice.prepareSpeech} onKeyDownCapture={voice.prepareSpeech}>
      <Header />
      <main ref={contentRef} className="relative z-10 min-h-0 flex-1 overflow-y-auto">
        <VoiceStatus transcript={voice.lastTranscript} message={voice.notice} speechError={voice.speechError} />
        <div key={screen} className="v2l-stage-in">
          {screen === "home" ? (
            <HomeScreen
              learner={learner}
              onStartLesson={goLesson}
              onResetDemo={handleResetDemo}
              resetting={resetting}
              resetError={resetError}
            />
          ) : screen === "lesson" ? (
            <LessonScreen
              lesson={lesson}
              sceneIndex={sceneIndex}
              onHome={goHome}
              onBack={() => { setCheckSelection(null); if (sceneIndex === 0) goHome(); else setSceneIndex(sceneIndex - 1); }}
              onNext={() => { if (passedChecks.includes(lesson.scenes[sceneIndex].id)) { setCheckSelection(null); setSceneIndex((i) => Math.min(lesson.scenes.length - 1, i + 1)); } }}
              onStartQuiz={startQuiz}
              checkPassed={passedChecks.includes(lesson.scenes[sceneIndex].id)}
              checkSelection={checkSelection}
              onCheckSelect={selectCheck}
              tutorQuestion={tutorQuestion}
              tutorAnswer={tutorAnswer}
              tutorPending={tutorPending}
              tutorError={tutorError}
            />
          ) : screen === "quiz" ? (
            currentQuestion ? (
              <QuizScreen
                question={currentQuestion}
                index={quizIndex}
                total={QUIZ_TOTAL}
                selectedOption={selectedOption}
                grade={grade}
                locked={grading || quizLoading}
                error={quizError}
                onSelect={(id) => void submitAnswer(id)}
                onNext={onQuizNext}
                lesson={lesson}
                notesOpen={notesOpen}
                onToggleNotes={() => setNotesOpen((open) => !open)}
              />
            ) : (
              <div className="mx-auto w-full max-w-[1120px] px-5 pb-8 pt-6 md:px-16 md:pt-10">
                <div className="rounded-xl border border-line bg-surface p-8 text-center">
                  {quizError ? (
                    <>
                      <h1 className="type-card text-ink">Oh no!</h1>
                      <p className="mt-2 text-base text-muted">{quizError}</p>
                      <p className="mt-3 text-base font-bold text-brand">Say “try again” to load the question again.</p>
                      <button
                        type="button"
                        onClick={retryQuizLoad}
                        className="tactile mt-6 min-h-[48px] bg-brand px-6 py-3 text-base font-bold text-white"
                      >
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="type-card text-ink">
                        Getting your question ready…
                      </p>
                      <p className="mt-2 text-base text-muted">
                        Question {quizIndex + 1} of {QUIZ_TOTAL} is on its way.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          ) : (
            <ResultsScreen
              score={score}
              total={QUIZ_TOTAL}
              proficiency={finalProficiency ?? learner.proficiency}
              studentName={learner.student_name}
              onReviewLesson={reviewLesson}
              onRetakeQuiz={startQuiz}
            />
          )}
        </div>
      </main>
      <FloatingBackground />
      <Microphone
        voiceState={voice.voiceState}
        voiceActive={voice.voiceActive}
        onToggle={voice.toggleMic}
      />
    </div>
  );
}
