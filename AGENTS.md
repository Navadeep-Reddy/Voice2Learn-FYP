# Voice2Learn — Agent Instructions

## Project Phase

The six-pass **Voice2Learn Pre-Review MVP** baseline is approved. The current branch includes unapproved post-review work. The authorized follow-up plan is baseline reconciliation, local Laya Typed-Decisions intent routing, then the requested general voice navigation. Read `PROGRESS.md` for current state. Keep one focused vertical slice; do not expand curriculum or final-project infrastructure.

## Source of Truth

Use these files with clear ownership:

- `SPEC.md` — product behavior, data contracts, technical scope, acceptance criteria.
- `DESIGN.md` — visual language, motion, layout, component styling.
- `BUILD_PLAN.md` — fixed implementation order and pass boundaries, including the consolidated post-review prerequisite and Laya/navigation follow-up. Change definitions only for an explicitly authorized plan revision, never merely for progress.
- `PROGRESS.md` — mutable implementation state: current pass, completed passes, known issues, next action.
- `README.md` — setup and run instructions.
- `AGENTS.md` — agent behavior and development constraints.
- `USER_NAVIGATION.md` — concise lesson-agnostic voice command catalogue; SPEC owns behavior/contracts and PROGRESS owns status.

Keep architecture/API details in SPEC, pass definitions in BUILD_PLAN and evidence in PROGRESS. Do not create separate architecture, API-contract, Jev-plan/progress or branch-workflow files. Former POST_REVIEW_PLAN content is consolidated in BUILD_PLAN Prerequisite R.

If guidance conflicts:

1. `AGENTS.md` governs agent behavior and scope discipline.
2. `SPEC.md` governs product/technical behavior.
3. `DESIGN.md` governs appearance and motion.
4. `BUILD_PLAN.md` governs implementation order.
5. `PROGRESS.md` governs current state only; it never overrides pass content in `BUILD_PLAN.md`, `SPEC.md`, or `DESIGN.md`.
6. `README.md` documents the implemented setup and must be updated to match reality.

At the beginning of every coding session: read `PROGRESS.md` before changes, then the current BUILD_PLAN pass and relevant SPEC/DESIGN sections. Inspect actual branch/status/diff and preserve existing work. Never reimplement approved passes unless explicitly asked. Committed post-review work or progress on another branch is not approval on this base. Documentation requests do not authorize starting code.

Do not invent requirements to resolve ambiguity. Prefer the smallest implementation consistent with the documents.

## Non-Negotiable Product Rules

- The Pre-Review MVP covers **one chapter only: Multiplication & Division**.
- It contains **one authored lesson: Groups and Sharing**.
- The lesson has **five interactive scenes** defined in `SPEC.md`.
- Every essential student action must be operable by voice after initial browser microphone permission/activation.
- Repeated physical interaction must not be required during the normal demo flow.
- True mid-sentence interruption/barge-in is **out of scope**.
- STT uses the **Whisper installation already available locally**. Do not download, train, or fine-tune a model as part of this MVP.
- Nemotron uses NVIDIA Integrate model `nvidia/nemotron-3-super-120b-a12b` first, with OpenRouter model `nvidia/nemotron-3-super-120b-a12b:free` as the fallback.
- Lesson Q&A uses the Nemotron AI tutor with current lesson/scene context.
- Target: every accepted non-empty STT turn goes through POST /api/intent/classify to local Laya Typed-Decisions, using screen and interaction state. Until Pass 8, the endpoint retains the current Nemotron boundary. No frontend exact phrase matching or automatic Nemotron classifier fallback after the switch.
- Laya chooses one specific allowed action; application code executes it. Conceptual lesson help forwards the original transcript and scene to Nemotron. Quiz grading stays deterministic in the backend; authored check comparison stays separate from proficiency writes.
- Preserve check gating, Back-to-Home on the first scene, help, quiz notes, error retry, VAD utterances and neural/browser TTS. Do not claim known incomplete voice wiring works before verification.
- General commands resolve actual loaded lesson IDs/titles/concepts; no hardcoded lesson topics or invented destinations. Planned jump/resume/pacing/exit actions follow SPEC Section 17 and their own passes. Never bypass checks or reveal/solve quiz answers.
- Quiz questions are **fully Nemotron-generated**, generated **one at a time**, and are **multiple-choice only**.
- Quiz grading is deterministic in the backend.
- Learner proficiency is tracked only for:
  - `multiplication`
  - `division`
- Persistent state is stored in a small local JSON file for the Pre-Review.
- No authentication, Supabase, RAG, vector DB, teacher dashboard, admin panel, multi-user support, or extra curriculum.

## Architecture Rule

Build simple replaceable boundaries, not disposable hacks and not final-system infrastructure.

Temporary Pre-Review implementations must sit behind small stable interfaces:

- local JSON state -> later replaceable by Supabase
- local Whisper adapter -> later replaceable by the fine-tuned Whisper deployment
- NVIDIA-primary/OpenRouter-fallback Nemotron client -> isolated provider integrations behind one LLM boundary
- backend intent classifier -> small replaceable screen/state-aware boundary preserving current HTTP actions during core migration
- local Laya Typed-Decisions choice -> isolated `backend/app/laya.py`, separate from `llm.py` and Nemotron providers; validation/acceptance/execution owned by application code. Model files are explicit ignored setup artifacts, never auto-downloaded at runtime; device auto-selection is CUDA > MPS > CPU.
- neural speech endpoint -> existing edge-tts with browser speech fallback; no model downloads
- context builder -> generates `backend/data/context.md` and is reused by lesson Q&A, quiz generation, and intent classification
- authored lesson JSON -> later replaceable by a larger lesson/content source

Do not build the future replacement now.

## Anti-Overengineering Rules

Do **not**:

- add layers only for architectural purity;
- create generic repository/service/factory/adapter frameworks unless the current code genuinely needs them;
- create plugin systems, event buses, dependency injection containers, microservices, or background workers;
- create a database schema for future features;
- add state management libraries unless React state/context is insufficient;
- build a generalized curriculum engine;
- build a generalized animation engine;
- build a design-system package;
- add dark mode;
- add gamification systems such as XP, streaks, currency, badges, leaderboards, or unlock trees;
- add analytics or telemetry;
- add extra screens, endpoints, user roles, or settings;
- refactor unrelated working code while implementing a pass;
- install a test framework solely for this demo if one is not already present.

Prefer explicit code over clever abstractions.

## Coding Expectations

- Frontend: React + TypeScript + Vite + Tailwind CSS.
- Backend: Python + FastAPI.
- Validate Nemotron structured output and Laya choice/probability distributions. Keep Laya probabilities/confidence/model/device metadata backend-only.
- Never use raw `eval`.
- Keep provider-specific logic isolated.
- Keep components small enough to understand, but do not split files mechanically.
- Use descriptive names over comments that restate the code.
- Keep all student-facing copy age-appropriate and short.
- Keep NVIDIA/OpenRouter keys server-side in ignored `backend/.env`. Never put them in VITE_ variables, command arguments, logs, screenshots, reports, commits or chat. Use placeholders in examples and sanitize provider errors. Do not ask the user to paste keys into chat. Local Laya needs no credential.
- Do not expose the quiz answer to the frontend before submission.
- Existing Nemotron invalid-output retries and provider fallback remain unchanged. Laya invalid output/load/inference returns friendly 502 without retry or Nemotron classifier fallback. Valid ambiguity/low confidence later returns unclear without retry; confidence is uncalibrated. Preserve Nemotron tutoring/generation and speech fallback policies independently.

## Local Whisper Rule

Before implementing STT, inspect the user's actual local Whisper installation instead of assuming a package, CLI, or model format.

All local invocation details must be contained in one backend STT module. The rest of the app should call a simple `transcribe(...)` interface.

Do not automatically download a Whisper model.

## Voice Interaction Rule

The UI should operate as a simple voice loop:

`listening -> processing -> speaking -> listening`

While TTS is speaking, STT is paused. When TTS finishes, listening may resume automatically.

Every accepted non-empty transcript is classified backend-side using current screen/state, with local Laya in the target architecture. Silence resumes silently. Preserve duplicate/stale-result guards across scene/question/check/notes/phase changes; validate again before execution. The frontend must not decide voice actions by exact phrase matching.

All essential learner actions must be voice-operable after initial browser permission/activation. Visible controls are optional fallbacks, never a required step in the normal learner journey. STT remains paused during speech. Planned pause/resume is between speech turns with listening retained; no wake word or mid-sentence interruption.

## Pass Discipline

Implement **one current pass from BUILD_PLAN at a time**, selected by PROGRESS: Prerequisite R, then 7–12. Preserve original Passes 1–6 as approved history. Superseded branch Jev code is historical only and not part of the local Laya boundary.

After each pass:

1. stop;
2. run the relevant verification;
3. start the preview automatically and report what changed;
4. report any known issue or assumption;
5. wait for the user's review before starting the next pass.

A pass is not marked completed merely when coding ends. Only after the user approves a pass: update `PROGRESS.md` (mark the approved pass complete, set the next pass current, record known issues and next action), then commit/push the intended pass files and tracker update only as authorized. Preserve known issues and branch-local versus integrated evidence; do not sweep unrelated changes into a commit. Never commit or push without user approval or an explicit user instruction to do so.

Do not continue into the next pass just because it seems convenient.

## Definition of "Done"

A feature is done only when:

- the intended user path works;
- it matches `SPEC.md`;
- it visually follows `DESIGN.md`;
- the frontend builds;
- the backend starts;
- errors do not crash the demo flow;
- no out-of-scope feature was added.

The goal is a focused, polished Pre-Review MVP — not the final Voice2Learn system.


## Parallel Development

Do not infer or implement the friend's unrelated scope. Core Laya work owns `backend/app/laya.py`, `intent.py`, intent-specific context helpers and required backend configuration. Prerequisite R and navigation extension passes explicitly require coordinated frontend/API/type changes; agree on shared edits before concurrent work. Preserve neural TTS, local STT, Nemotron tutoring/generation and authored content unless the current pass calls for a demonstrated fix.

Use SPEC Section 12/17 for shared contracts; modify backend/frontend types and execution together for authorized extensions. Record branch/base and local evidence in PROGRESS. Separate branches in one checkout do not isolate uncommitted changes; prefer separate checkouts for simultaneous work. Do not create/switch branches, merge, commit or push merely because a plan exists. Before an authorized integration inspect overlapping changes and verify the combined voice flow, checks, notes, tutoring, grading, proficiency and error recovery.
