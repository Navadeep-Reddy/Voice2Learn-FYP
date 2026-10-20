# Post-Review MVP Pass — Comprehension and Voice Access

This is a new, user-requested review pass. The six approved passes in `BUILD_PLAN.md` remain immutable. Stop after this pass for review; do not mark it approved or commit/push without approval.

## Build

- Add one authored, age-appropriate, four-option understanding check to each existing scene. After narration, ask the check; a correct spoken/tapped answer unlocks Next or Start Quiz. Incorrect answers get a gentle explanation and another attempt; Back, Repeat, and lesson Q&A remain available. Returning to a scene preserves completed checks. Checks never change proficiency or quiz length.
- Keep all scene navigation voice-first, including going back from scene 1 to Home, and provide short on-screen voice hints. The classifier, not frontend phrases, decides actions. Include essential screen actions: help/repeat, next/back, answering checks, starting quiz, quiz recap/open-close/read lesson information, quiz answer, retry loading, and results actions. Prevent invalid transitions.
- During quiz show a compact, optionally expandable lesson recap using only authored scene narration and concepts; support opening, closing and reading it aloud by voice without abandoning or changing the current question. Never disclose quiz grading data.
- Replace the default robotic browser narration with a configurable neural voice backend (Edge TTS) when available; browser speech remains a recoverable fallback. Keep the same listening -> processing -> speaking -> listening loop, cancel stale playback on navigation, and do not download models.
- Keep all five Nemotron quiz MCQs and backend deterministic grading unchanged. No extra screen or persistent assessment state.

## Verify

- Frontend build and backend startup; backend intent contract checks and check-answer correctness; smoke test voice navigation/check gating, quiz recap without question loss, TTS fallback, microphone resume, and small-screen layout.
- Start preview automatically, report limitations, then stop for review.
