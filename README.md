# Voice2Learn

Voice2Learn is a voice-first interactive mathematics learning application for children who may have difficulty using conventional physical input.

The **Pre-Review MVP** contains one Multiplication & Division lesson, contextual tutoring, a five-question Nemotron quiz and JSON proficiency tracking. This `jev` branch adds authored lesson checks, quiz notes, speech-boundary capture and neural speech. Post-review voice wiring and the isolated local Laya boundary are pending review; `/api/intent/classify` remains Nemotron until Pass 8. See PROGRESS for actual state.

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
- Nemotron via NVIDIA Integrate primary with OpenRouter fallback; current intent classifier remains Nemotron until Pass 8
- Neural edge-tts speech with browser speech fallback
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
- Nemotron (`nvidia/nemotron-3-super-120b-a12b`) through NVIDIA Integrate first, falling back to OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`) for lesson Q&A, quiz generation and current semantic intent classification
- backend `edge-tts` neural speech; browser `speechSynthesis` fallback (neural path requires network)

The backend keeps NVIDIA and OpenRouter provider details behind one Nemotron
LLM boundary; the frontend never calls either provider directly.

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
- Windows NVIDIA users: CUDA-enabled PyTorch installed for their driver using official PyTorch instructions
- the user's local Whisper runtime/model already installed
- an NVIDIA Integrate API key for `nvidia/nemotron-3-super-120b-a12b`; an OpenRouter API key for the fallback model (`nvidia/nemotron-3-super-120b-a12b:free`)

The project must not automatically download Whisper.

## Environment

Current `backend/.env.example` documents:

```env
NVIDIA_API_KEY=
NVIDIA_MODEL=nvidia/nemotron-3-super-120b-a12b
OPENROUTER_API_KEY=
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
VOICE2LEARN_TTS_VOICE=en-US-JennyNeural
VOICE2LEARN_LAYA_DEVICE=auto
# Optional model path override (relative paths are repository-root-relative):
# VOICE2LEARN_LAYA_MODEL_DIR=backend/models/laya-typed-decisions
```

Laya needs no API key. NVIDIA/OpenRouter keys serve Nemotron tutoring/generation; intent classification remains Nemotron until Pass 8.

Whisper configuration must match this machine’s existing runtime/cache. The checked-in defaults reference the original developer’s Linux path and CUDA; they are not verified defaults for every machine. Inspect the actual installation before changing the adapter; do not download a model.

Local STT (Pass 3) uses the backend venv Whisper runtime directly in-process; nothing is downloaded and no subprocess worker is used:

- `backend/app/stt.py` lazily loads the exact cached model snapshot a single time per backend process (`local_files_only=True`, CUDA float16 with CPU int8 fallback, pip-provided CUDA libs preloaded via `ctypes`).
- Decoding favors short voice commands: beam search (`beam_size=5`), deterministic `temperature=0.0`, no previous-segment conditioning, `vad_filter` with short silence/padding, no timestamps, and a neutral concise lesson-context hint. The model stays local; nothing is downloaded.
- `POST /api/stt/transcribe` accepts one complete browser audio utterance (`file` field) and returns `{ "text": string }`. The frontend captures speech-boundary utterances through continuous microphone monitoring (speech start/end with pre-roll and sustained-silence end; silence is never sent; a max utterance cap is only a runaway safety guard).
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
# Edit backend/.env and set NVIDIA_API_KEY. OPENROUTER_API_KEY is used as the
# fallback. Never commit backend/.env.
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows PowerShell instead:
# .\.venv\Scripts\Activate.ps1
```

On macOS (Apple Silicon/MPS) and CPU-only machines, install the normal requirements, then verify PyTorch device availability:

```bash
pip install -r requirements.txt
python -c "import torch; print(torch.__version__, torch.cuda.is_available(), getattr(torch.backends, 'mps', None) and torch.backends.mps.is_available())"
```

On a Windows NVIDIA laptop, use this order inside the activated backend virtual environment:

1. Run the exact CUDA-enabled PyTorch install command generated by the official [PyTorch install selector](https://pytorch.org/get-started/locally/) for that laptop's operating system, Python version and CUDA choice. Do not substitute a universal wheel command.
2. Verify the installed build sees the GPU:

   ```powershell
   python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
   ```

   Confirm `torch.cuda.is_available()` is `True`.
3. Install project requirements:

   ```powershell
   pip install -r requirements.txt
   ```

   The Laya dependency permits a compatible installed Torch; this Windows CUDA setup and actual Windows GPU inference have not been validated here.

Then start the backend:

```bash
uvicorn app.main:app --reload --port 8000
```

The local Whisper model must already exist on this machine; nothing is
downloaded at install or runtime. Optional Whisper overrides live in
`backend/.env.example` as `VOICE2LEARN_WHISPER_*` (`MODEL_DIR`, `DEVICE`,
`COMPUTE_TYPE`, `INITIAL_PROMPT`); defaults reflect the original developer’s machine and may need local overrides.

The model checkpoint is a separate explicit setup download (Apache-2.0, pinned revision). From the repository root, run once after installing backend dependencies; choose the command for your shell:

```bash
backend/.venv/bin/python -c 'from huggingface_hub import snapshot_download; snapshot_download(repo_id="convaiinnovations/laya-typed-decisions", revision="e929ae5cf69bc34259cd2f95c9e91145b818b1f0", local_dir="backend/models/laya-typed-decisions")'
```

```powershell
backend\.venv\Scripts\python.exe -c 'from huggingface_hub import snapshot_download; snapshot_download(repo_id="convaiinnovations/laya-typed-decisions", revision="e929ae5cf69bc34259cd2f95c9e91145b818b1f0", local_dir="backend/models/laya-typed-decisions")'
```

This downloads approximately 846 MB. Normal app import/startup/request never contacts the Hub and only loads local files. Model files are ignored under `backend/models/`. Relative `VOICE2LEARN_LAYA_MODEL_DIR` overrides resolve from repository root, regardless of whether the backend starts from the repository root or `backend/`; absolute paths are also supported.

On Apple Silicon/macOS, regular requirements install compatible PyTorch; runtime `auto` selects CUDA, then MPS, then CPU. CPU-only machines use CPU. Windows NVIDIA users must follow the ordered install steps above. Runtime auto-selects CUDA where available, else MPS/CPU; explicitly requested unavailable devices fail without fallback.

The existing Whisper adapter is separately configured and was originally set up with a Linux model path/CUDA defaults. On Windows, set `VOICE2LEARN_WHISPER_MODEL_DIR` to a locally installed compatible model and configure Whisper's device/compute type for that machine; the existing `nvidia-cublas-cu12`/`nvidia-cudnn-cu12` pip requirements are Linux x86_64/AMD64 only. Windows Whisper CUDA runtime support has not been validated in this pass.

Never put an API key or secret in frontend code or commit `backend/.env`. Existing `AI_GATEWAY_*` values in a private `.env` are obsolete and ignored; no Gateway key is required and this setup does not need to inspect `.env`.

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
4. Answer each scene’s quick check to unlock forward movement; navigate by voice (wiring implemented, pending review/live browser verification).
5. Ask a question about the current scene.
6. Finish the final check and say start quiz.
7. Complete five Nemotron-generated MCQs by voice; use lesson notes/repetition (pending review/live browser verification).
8. Show the updated multiplication/division proficiency.
9. Review the lesson or take the quiz again.

## Development Rule

Follow `BUILD_PLAN.md` one pass at a time.

After each pass, stop for review before continuing.

This repository is intentionally building a **focused Pre-Review vertical slice**, not the complete final Voice2Learn system.

## Isolated Local Laya Boundary (Pass 7; Routing Not Switched)

The isolated boundary is `backend/app/laya.py`, using official `laya==0.4.12` and the pinned ignored local artifact. The current `/api/intent/classify` endpoint still uses Nemotron; switching it is Pass 8 and has not begun. Local STT, neural/browser speech, lesson checks, notes, Nemotron tutoring/question generation, and backend quiz grading remain unchanged.

Configure these optional backend-only settings in ignored `backend/.env`:

```env
VOICE2LEARN_LAYA_DEVICE=auto
# Optional: VOICE2LEARN_LAYA_MODEL_DIR=<local checkpoint directory>
```

The boundary loads local files lazily and makes no network calls. The default artifact location is `backend/models/laya-typed-decisions`; it must be installed explicitly using the setup instructions above. Laya needs no credential. NVIDIA/OpenRouter credentials remain necessary for Nemotron tutoring and quiz generation.

Device accepts `auto`, `cuda`, `mps`, or `cpu`. Confidence/probabilities remain backend-only; this checkpoint's confidence is uncalibrated. Invalid output/load/inference produces a friendly error without retry or Nemotron classifier fallback. Current endpoint remains Nemotron until Pass 8.

## Follow-Up Implementation Order

1. Prerequisite R: repair and verify current post-review voice context/state wiring.
2. Pass 7: isolated local Laya boundary/artifact/device/offline verification (pending review).
3. Pass 8: switch current actions to state-aware Laya routing.
4. Pass 9: evaluate Laya with representative speech and latency evidence.
5. Pass 10: general scene destinations, in-session resume, repetition and orientation.
6. Pass 11: pause/resume, learner-controlled quiz feedback and confirmed exit.
7. Pass 12: full voice-navigation verification and handoff.

Follow BUILD_PLAN, implement one pass, start preview, report and stop for review. PROGRESS is the only implementation tracker. The former POST_REVIEW_PLAN content now lives in BUILD_PLAN Prerequisite R. Documentation changes do not approve the existing post-review pass or start implementation.

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
