# Voice2Learn

Voice2Learn is a voice-first interactive mathematics learning application for children who may have difficulty using conventional physical input.

This repository is currently implementing the **Pre-Review MVP**: one polished Multiplication & Division lesson, contextual voice Q&A, a five-question Nemotron-generated MCQ quiz, and simple learner proficiency tracking.

## Read First

- `AGENTS.md` — instructions for AI coding agents
- `SPEC.md` — product and technical source of truth
- `DESIGN.md` — visual and motion language
- `BUILD_PLAN.md` — implementation passes

## Pre-Review Scope

- Demo learner: Alex
- Chapter: Multiplication & Division
- Lesson: Groups and Sharing
- 5 authored lesson scenes
- Local Whisper STT
- Nemotron (`nvidia/nemotron-3-super-120b-a12b:free`) via OpenRouter
- Browser TTS
- 5 dynamically generated MCQs
- backend Nemotron semantic intent routing (`POST /api/intent/classify`): every non-empty STT transcript is classified backend-side with current screen/context, so imperfect transcripts still map to the allowed screen action; the frontend never decides voice actions with exact local phrase matching
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
- Nemotron (`nvidia/nemotron-3-super-120b-a12b:free`) through OpenRouter (lesson Q&A, quiz generation, and semantic intent classification)
- browser `speechSynthesis`

## Expected Repository Shape

```text
Voice2Learn/
├── AGENTS.md
├── SPEC.md
├── DESIGN.md
├── BUILD_PLAN.md
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
- an OpenRouter API key with access to the intended Nemotron model (`nvidia/nemotron-3-super-120b-a12b:free`)

The project must not automatically download Whisper.

## Environment

The backend should expose an `.env.example` with at least:

```env
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

Keep the model identifier configurable rather than hardcoding it.

Whisper-specific configuration should match the local installation discovered during Build Plan Pass 3. Keep those details isolated in the backend STT adapter.

Local STT (Pass 3) uses the backend venv Whisper runtime directly in-process; nothing is downloaded and no subprocess worker is used:

- `backend/app/stt.py` lazily loads the exact cached model snapshot a single time per backend process (`local_files_only=True`, CUDA float16 with CPU int8 fallback, pip-provided CUDA libs preloaded via `ctypes`).
- `POST /api/stt/transcribe` accepts browser audio (`file` field) and returns `{ "text": string }`.
- Optional overrides live in `backend/.env.example` as `VOICE2LEARN_WHISPER_*` (`MODEL_DIR`, `DEVICE`, `COMPUTE_TYPE`); defaults match the verified local machine.

The frontend should use a configurable backend base URL, for example:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Development

### Backend

```bash
cd backend
cp .env.example .env
# Edit backend/.env and set OPENROUTER_API_KEY.
# Leave OPENROUTER_MODEL as nvidia/nemotron-3-super-120b-a12b:free
# unless directed otherwise. Never commit backend/.env.
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The local Whisper model must already exist on this machine; nothing is
downloaded at install or runtime. Optional Whisper overrides live in
`backend/.env.example` as `VOICE2LEARN_WHISPER_*` (`MODEL_DIR`, `DEVICE`,
`COMPUTE_TYPE`); defaults match the verified local machine.

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
4. Navigate the five lesson scenes by voice.
5. Ask a question about the current scene.
6. Finish the lesson.
7. Complete five Nemotron-generated multiple-choice questions by voice.
8. Show the updated multiplication/division proficiency.
9. Review the lesson or take the quiz again.

## Development Rule

Follow `BUILD_PLAN.md` one pass at a time.

After each pass, stop for review before continuing.

This repository is intentionally building a **focused Pre-Review vertical slice**, not the complete final Voice2Learn system.
