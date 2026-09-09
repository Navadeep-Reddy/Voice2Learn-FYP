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
