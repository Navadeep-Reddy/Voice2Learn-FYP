# Voice2Learn — Agent Instructions

## Project Phase

This repository is currently building the **Voice2Learn Pre-Review MVP**.

This is a one-day-ish vertical slice for demonstration and review. It must feel polished and real, but it must not expand into the full final-year project yet.

## Source of Truth

Use these files with clear ownership:

- `SPEC.md` — product behavior, data contracts, technical scope, acceptance criteria.
- `DESIGN.md` — visual language, motion, layout, component styling.
- `BUILD_PLAN.md` — immutable implementation order and pass boundaries. Never changes to reflect progress.
- `PROGRESS.md` — mutable implementation state: current pass, completed passes, known issues, next action.
- `README.md` — setup and run instructions.
- `AGENTS.md` — agent behavior and development constraints.

If guidance conflicts:

1. `AGENTS.md` governs agent behavior and scope discipline.
2. `SPEC.md` governs product/technical behavior.
3. `DESIGN.md` governs appearance and motion.
4. `BUILD_PLAN.md` governs implementation order.
5. `PROGRESS.md` governs current state only; it never overrides pass content in `BUILD_PLAN.md`, `SPEC.md`, or `DESIGN.md`.
6. `README.md` documents the implemented setup and must be updated to match reality.

At the beginning of every coding session: read `PROGRESS.md` before changes, use it to determine the current pass, and never reimplement completed passes unless the user explicitly asks.

Do not invent requirements to resolve ambiguity. Prefer the smallest implementation consistent with the documents.

## Non-Negotiable Product Rules

- The Pre-Review MVP covers **one chapter only: Multiplication & Division**.
- It contains **one authored lesson: Groups and Sharing**.
- The lesson has **five interactive scenes** defined in `SPEC.md`.
- Every essential student action must be operable by voice after initial browser microphone permission/activation.
- Repeated physical interaction must not be required during the normal demo flow.
- True mid-sentence interruption/barge-in is **out of scope**.
- STT uses the **Whisper installation already available locally**. Do not download, train, or fine-tune a model as part of this MVP.
- MiMo is called through **OpenRouter**.
- Lesson Q&A uses MiMo with current lesson/scene context.
- Quiz questions are **fully MiMo-generated**, generated **one at a time**, and are **multiple-choice only**.
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
- OpenRouter MiMo client -> isolated provider integration
- context builder -> generates `backend/data/context.md` and is reused by lesson Q&A and quiz generation
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
- Validate MiMo structured output with Pydantic.
- Never use raw `eval`.
- Keep provider-specific logic isolated.
- Keep components small enough to understand, but do not split files mechanically.
- Use descriptive names over comments that restate the code.
- Keep all student-facing copy age-appropriate and short.
- Do not expose secrets or OpenRouter keys to the frontend.
- Do not expose the quiz answer to the frontend before submission.
- Do not silently recover from invalid MiMo output. Validate, retry once, then return a friendly recoverable error.

## Local Whisper Rule

Before implementing STT, inspect the user's actual local Whisper installation instead of assuming a package, CLI, or model format.

All local invocation details must be contained in one backend STT module. The rest of the app should call a simple `transcribe(...)` interface.

Do not automatically download a Whisper model.

## Voice Interaction Rule

The UI should operate as a simple voice loop:

`listening -> processing -> speaking -> listening`

While TTS is speaking, STT is paused. When TTS finishes, listening may resume automatically.

The microphone remains clickable as a fallback control, but the normal demo flow should not require repeated clicks.

## Pass Discipline

Implement **one pass from `BUILD_PLAN.md` at a time**.

After each pass:

1. stop;
2. run the relevant verification;
3. start the preview automatically and report what changed;
4. report any known issue or assumption;
5. wait for the user's review before starting the next pass.

A pass is not marked completed merely when coding ends. Only after the user approves a pass: update `PROGRESS.md` (mark the approved pass complete, set the next pass current, record known issues and next action), then commit and push the pass implementation plus the progress update. Never commit or push without user approval or an explicit user instruction to do so.

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
