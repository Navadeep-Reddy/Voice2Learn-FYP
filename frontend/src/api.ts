import type { LearnerState, Lesson } from "./types";

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

export { API_BASE_URL };
