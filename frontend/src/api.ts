import type { IntentRequest, IntentResult, LearnerState, Lesson, QuizGrade, QuizOptionId, QuizQuestion } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${path}`);
  }
  return response.json() as Promise<T>;
}

export function fetchLesson(): Promise<Lesson> {
  return request<Lesson>("/api/lesson");
}

export function fetchLearner(): Promise<LearnerState> {
  return request<LearnerState>("/api/learner");
}

export interface TranscriptionResult {
  text: string;
}

export interface TutorAnswer {
  answer: string;
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "utterance.webm");
  const response = await fetch(`${API_BASE_URL}/api/stt/transcribe`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Transcription failed: ${response.status}`);
  }
  const data = (await response.json()) as TranscriptionResult;
  return (data.text ?? "").trim();
}

export async function askTutor(sceneId: string, question: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/tutor/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scene_id: sceneId, question }),
  });
  if (!response.ok) {
    let friendly = "My helper is having trouble right now. Try again.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === "string" && data.detail.trim()) {
        friendly = data.detail;
      }
    } catch {
      // Keep the friendly fallback.
    }
    throw new Error(friendly);
  }
  const data = (await response.json()) as TutorAnswer;
  return (data.answer ?? "").trim();
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    let friendly = "My helper is having trouble right now. Try again.";
    try {
      const data = (await response.json()) as { detail?: string };
      if (typeof data.detail === "string" && data.detail.trim()) {
        friendly = data.detail;
      }
    } catch {
      // Keep the friendly fallback.
    }
    throw new Error(friendly);
  }
  return response.json() as Promise<T>;
}

export function fetchQuizNext(): Promise<QuizQuestion> {
  return postJson<QuizQuestion>("/api/quiz/next");
}

export function answerQuiz(
  questionId: string,
  selectedOption: QuizOptionId,
): Promise<QuizGrade> {
  return postJson<QuizGrade>("/api/quiz/answer", {
    question_id: questionId,
    selected_option: selectedOption,
  });
}

export function classifyIntent(body: IntentRequest): Promise<IntentResult> {
  return postJson<IntentResult>("/api/intent/classify", body);
}

export function resetDemo(): Promise<LearnerState> {
  return postJson<LearnerState>("/api/demo/reset");
}

export { API_BASE_URL };
