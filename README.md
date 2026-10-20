# Voice2Learn

Voice2Learn is a voice-first interactive mathematics learning application for children who may have difficulty using conventional physical input.

The **Pre-Review MVP** contains one Multiplication & Division lesson, contextual tutoring, a five-question Nemotron quiz and JSON proficiency tracking. This `main-ish` base adds authored lesson checks, quiz notes, speech-boundary capture and neural speech. Post-review voice wiring still needs reconciliation/review; Jev and broader voice navigation are planned, not live. See PROGRESS for actual state.

## Read First

- `AGENTS.md` — instructions for AI coding agents
- `SPEC.md` — product and technical source of truth
- `DESIGN.md` — visual and motion language
- `BUILD_PLAN.md` — approved historical passes and ordered follow-up
- `PROGRESS.md` — current implementation, approval and known gaps
- `USER_NAVIGATION.md` — concise voice command catalogue (planned commands labeled)

## Pre-Review Scope

- Demo learner: Alex
- Chapter: Multiplication & Division
- Lesson: Groups and Sharing
- 5 authored lesson scenes, each with a quick understanding check
- Local Whisper STT
- Nemotron via NVIDIA Integrate only
- Female neural edge-tts speech; text-only recovery if audio is unavailable
- 5 dynamically generated MCQs
- backend Nemotron semantic intent routing (`POST /api/intent/classify`): every non-empty STT transcript is classified backend-side with current screen/context, so imperfect transcripts still map to the allowed screen action; the frontend never decides voice actions with exact local phrase matching
- authored quiz lesson notes with voice open/close/read
- multiplication/division proficiency
- local JSON persistence

No authentication, Supabase, extra curriculum, or final-model training is part of this phase.

## Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Python
- FastAPI
- Pydantic

### Voice / AI

- local Whisper installation
- Nemotron (`nvidia/nemotron-3-super-120b-a12b`) through NVIDIA Integrate only for lesson Q&A, quiz generation, and semantic intent classification
- backend `edge-tts` female neural speech (network required); no browser/system voice playback

The backend keeps NVIDIA provider details behind one Nemotron LLM boundary;
the frontend never calls NVIDIA directly. NVIDIA failures return a friendly
recoverable error without trying another provider.

Nemotron requests explicitly disable extended reasoning (`chat_template_kwargs.enable_thinking=false`) for the short structured demo responses. Requests have a 60-second total deadline (5-second connection timeout). Transient NVIDIA HTTP 500/502/503/504 responses retry automatically up to three times, with 0.5/1/2-second backoff inside that same deadline; the quiz remains loading rather than asking for manual retry after each brief failure. Authentication/configuration/other HTTP errors (including 429) and provider timeouts do not automatically retry. A quiz-generation timeout says the question is taking too long; say “try again” or use its retry button if automatic recovery fails. Invalid structured output still retries once, and quiz arithmetic remains backend-validated. NVIDIA availability and response latency are external dependencies; automatic recovery is bounded rather than an availability guarantee.

## Expected Repository Shape

```text
Voice2Learn/
├── AGENTS.md
├── SPEC.md
├── DESIGN.md
├── BUILD_PLAN.md
├── PROGRESS.md
├── USER_NAVIGATION.md
├── README.md
├── frontend/
└── backend/
    ├── app/
    └── data/
        ├── lesson.json
        ├── learner_state.json
        └── context.md        # generated/overwritten at runtime
```

The exact internal source layout may stay small and should not be generalized beyond what the MVP needs.

## Prerequisites

- Node.js 20+ recommended
- npm
- Python 3.11+ recommended
- the user's local Whisper runtime/model already installed
- an NVIDIA Integrate API key for `nvidia/nemotron-3-super-120b-a12b`

The project must not automatically download Whisper.

## Environment

Current `backend/.env.example` documents:

```env
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
VOICE2LEARN_TTS_VOICE=en-US-JennyNeural
```

Keep the model identifier configurable rather than hardcoding it.

Whisper configuration must match this machine’s existing runtime/cache. The checked-in defaults reference the original developer’s Linux path and CUDA; they are not verified defaults for every machine. Inspect the actual installation before changing the adapter; do not download a model.

Local STT (Pass 3) uses the backend venv Whisper runtime directly in-process; nothing is downloaded and no subprocess worker is used:

- `backend/app/stt.py` lazily loads the exact cached model snapshot a single time per backend process (`local_files_only=True`, CUDA float16 with CPU int8 fallback, pip-provided CUDA libs preloaded via `ctypes`).
- Decoding favors short voice commands: beam search (`beam_size=5`), deterministic `temperature=0.0`, no previous-segment conditioning, `vad_filter` with short silence/padding, no timestamps, and a neutral concise lesson-context hint. The model stays local; nothing is downloaded.
- `POST /api/stt/transcribe` accepts one complete browser audio utterance (`file` field) and returns `{ "text": string }`. The frontend captures speech-boundary utterances through continuous microphone monitoring (speech start/end with pre-roll and sustained-silence end; silence is never sent; a max utterance cap is only a runaway safety guard).
- Neural speech requires `edge-tts>=7.3.1,<8`; older versions can receive HTTP 403 from Microsoft's speech service. Update the backend dependencies and restart the backend if this occurs. Only the configured neural voice is played (default `en-US-JennyNeural`). Speech failures display the message as text and resume listening; graded feedback remains readable briefly before automatic continuation. The robotic browser/system voice fallback has been removed at the user's request.
- The latest non-empty Whisper transcript appears in an inline “You said” card below the header, alongside app messages. Audio errors have their own short banner. These cards scroll with the page content; the circular microphone remains in a reserved bottom area without covering lesson controls. Transcript display is session-only, not a stored history.
- The initial microphone tap (or a click/key interaction with the app) unlocks a reusable Web Audio context for female neural narration. Later voice-triggered audio uses that context, avoiding browser autoplay rejection after asynchronous classification/synthesis. Browser console diagnostics distinguish synthesis HTTP failures, audio activation, decoding and playback failures without printing provider responses.
- Backend provider diagnostics identify missing configuration, HTTP status/reason, transport exception type and malformed completions; neural-speech failures report exception type and HTTP status where available. Raw credentials, provider response bodies and signed speech URLs are excluded from these diagnostics.
- Optional overrides live in `backend/.env.example` as `VOICE2LEARN_WHISPER_*` (`MODEL_DIR`, `DEVICE`, `COMPUTE_TYPE`, `INITIAL_PROMPT`); defaults reflect the original developer’s machine and may need local overrides.

The frontend should use a configurable backend base URL, for example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Development

After installing both backend and frontend dependencies, start both development
servers from the project root:

```bash
./start-dev.sh
```

Press `Ctrl+C` to stop both servers.

To stop servers launched in another terminal, run:

```bash
./stop-dev.sh
```

### Backend

```bash
cd backend
test -f .env || cp .env.example .env
# Edit backend/.env and set NVIDIA_API_KEY. Never commit backend/.env.
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The local Whisper model must already exist on this machine; nothing is
downloaded at install or runtime. Optional Whisper overrides live in
`backend/.env.example` as `VOICE2LEARN_WHISPER_*` (`MODEL_DIR`, `DEVICE`,
`COMPUTE_TYPE`, `INITIAL_PROMPT`); defaults reflect the original developer’s machine and may need local overrides.

Never put an API key or secret in frontend code or commit `backend/.env`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Production check: `npm run build`.

For a repeatable demo, use the `Reset Demo` button on the Home screen
(or `POST /api/demo/reset`); it restores the pristine learner (50/50
proficiency, no attempts) and clears the active quiz question.

## Demo Flow

1. Open Voice2Learn.
2. Activate microphone permission once.
3. Say `start lesson`.
4. Answer each scene’s quick check to unlock forward movement; navigate by voice (known wiring repair remains pending).
5. Ask a question about the current scene.
6. Finish the final check and say start quiz.
7. Complete five Nemotron-generated MCQs by voice; use lesson notes/repetition as needed after baseline wiring is repaired.
8. Show the updated multiplication/division proficiency.
9. Review the lesson or take the quiz again.

## Development Rule

Follow `BUILD_PLAN.md` one pass at a time.

After each pass, stop for review before continuing.

This repository is intentionally building a **focused Pre-Review vertical slice**, not the complete final Voice2Learn system.

## Planned Jev Setup — Not Implemented on This Base

The migration keeps local STT, female neural speech with text-only error recovery, lesson checks, notes, Nemotron tutoring/question generation, and backend quiz grading. Jev will classify intent through Vercel AI Gateway, separate from the NVIDIA-only LLM boundary.

After Pass 7 adds support, configure these backend-only settings in ignored `backend/.env`:

```env
AI_GATEWAY_API_KEY=<set privately in backend/.env>
AI_GATEWAY_MODEL=typesafe-ai/jev
AI_GATEWAY_TIMEOUT_SECONDS=10
```

These are planned variables, not current implemented setup or changes already made to `.env.example`. Never paste keys into chat, print environment/config values, place keys in shell commands/logs, commit them, or expose them through frontend/VITE_ variables. NVIDIA credentials remain necessary for tutoring and quiz generation. No direct TypeSafe key or local Jev model installation is required. Gateway model/team access must be verified; a catalog listing is not a successful decision.

SPEC Section 16 documents the chosen [Vercel TypeSafe-compatible API](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe). No runtime classifier fallback to Nemotron will be added. Failed Jev routing gives a friendly recoverable error on the current screen.

## Follow-Up Implementation Order

1. Prerequisite R: repair and verify current post-review voice context/state wiring.
2. Pass 7: isolated Jev client/configuration; keep baseline classification active.
3. Pass 8: switch current actions to state-aware Jev routing.
4. Pass 9: evaluate the core migration with representative speech and latency evidence.
5. Pass 10: general scene destinations, in-session resume, repetition and orientation.
6. Pass 11: pause/resume, learner-controlled quiz feedback and confirmed exit.
7. Pass 12: full voice-navigation verification and handoff.

Follow BUILD_PLAN, implement one pass, start preview, report and stop for review. PROGRESS is the only implementation tracker. The former POST_REVIEW_PLAN content now lives in BUILD_PLAN Prerequisite R. Documentation changes do not approve the existing post-review pass or start Jev coding.

All essential learner actions must work by voice after initial microphone permission/activation. Visible controls remain supplementary. No hands-on step is required for the intended normal journey; actual browser/microphone checks remain pending. Planned pause works between spoken turns, not while narration is playing.


## OpenCode Agents

The project setup lives in `.opencode/opencode.json` and `.opencode/agents/`:

| Agent | Model | Role |
| --- | --- | --- |
| `master` | `openai/gpt-5.6-sol` | Default coordinator; delegates discovery/implementation, reviews evidence and stops for pass approval. |
| `explorer` | `openai/gpt-6-luna-fast` | Read-only discovery and focused review. |
| `implementer` | `openai/gpt-6-luna`, variant `medium` | Scoped edits and relevant verification; no delegation or Git publishing. |

Start a fresh OpenCode session from the repository root after changing configuration:

```bash
opencode --agent master
```

Master must invoke the actual `explorer` and `implementer` tasks for implementation; it cannot edit directly or bypass that restriction with shell writes. The old `handler` agent has been replaced by `master`. The entire `.opencode/` folder is local and ignored by Git. Share its ZIP separately when needed. Configuration resolution was checked locally; model access and live delegation have not been exercised by this setup change.
