export type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";

export interface Scene {
  id: string;
  title: string;
  concept: string;
  narration: string;
  visual_description: string;
}

export interface Lesson {
  chapter: string;
  title: string;
  scenes: Scene[];
}

export interface Proficiency {
  multiplication: number;
  division: number;
}

export interface Attempt {
  skill: "multiplication" | "division";
  question: string;
  selected_option: string;
  correct_option: string;
  correct: boolean;
  timestamp: string;
}

export interface LearnerState {
  student_name: string;
  proficiency: Proficiency;
  recent_attempts: Attempt[];
}

export type QuizSkill = "multiplication" | "division";

export type QuizOptionId = "A" | "B" | "C" | "D";

export interface QuizOption {
  id: QuizOptionId;
  text: string;
}

export interface QuizQuestion {
  question_id: string;
  skill: QuizSkill;
  question: string;
  options: QuizOption[];
}

export interface QuizGrade {
  correct: boolean;
  correct_option: QuizOptionId;
  explanation: string;
  proficiency: Proficiency;
}

export type IntentScreen = "home" | "lesson" | "quiz" | "results";

export type IntentAction =
  | "start-lesson"
  | "next"
  | "back"
  | "repeat"
  | "start-quiz"
  | "ask-question"
  | "select-option"
  | "repeat-question"
  | "review-lesson"
  | "retake-quiz"
  | "unclear";

export interface IntentRequest {
  transcript: string;
  screen: IntentScreen;
  scene_id?: string | null;
  quiz_question?: string | null;
  quiz_options?: QuizOption[] | null;
}

export interface IntentResult {
  action: IntentAction;
  option: QuizOptionId | null;
}
