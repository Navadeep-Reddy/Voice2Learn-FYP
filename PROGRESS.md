# Voice2Learn — Progress

## Current pass

**Pass 8 — State-aware local Laya routing for the current application (started/authorized; not completed or approved).**

Pass 7 — the isolated local Laya Typed-Decisions boundary — was explicitly approved on 2026-10-21. Implement Pass 8 only per `BUILD_PLAN.md`, then stop for review. Do not proceed to Pass 9 or general navigation.

## Approved history

- [x] Pass 1 — Foundation and Data Contracts (approved)
- [x] Pass 2 — Design Shell and Interactive Lesson (approved)
- [x] Pass 3 — Voice Loop and Local Whisper (approved)
- [x] Pass 4 — Context Builder and Nemotron Lesson Q&A (approved)
- [x] Pass 5 — Nemotron Quiz and Learner Proficiency (approved)
- [x] Pass 6 — Demo Hardening and Polish (approved)
- [x] Prerequisite R — existing post-review reconciliation; approved 2026-10-20
- [x] Pass 7 — Isolated local Laya Typed-Decisions boundary; approved 2026-10-21

## Follow-up sequence

- [x] Pass 7 — isolated local Laya boundary/artifact/device/offline verification; approved 2026-10-21
- [ ] Pass 8 — state-aware local Laya routing for the current application; started/authorized, not completed or approved
- [ ] Pass 9 — evaluate Laya choices, thresholds and latency; not started
- [ ] Pass 10 — general voice destinations/resume/orientation; not started
- [ ] Pass 11 — pacing/feedback/confirmed quiz exit; not started
- [ ] Pass 12 — full navigation acceptance/handoff; not started

## Branch and current implementation

- Work is on existing `jev`, initial HEAD `04ead16` tracking `origin/jev`; no branch switch, staging, commit or push. Pass 7 was approved 2026-10-21; Pass 8 is current and unapproved.
- Superseded historical implementation at initial HEAD `04ead16` included `backend/app/jev.py`, Gateway env settings and documentation. Its isolated live attempt returned sanitized non-success, followed by HTTP 403 on repeat; status-only Gateway catalog lookup was HTTP 200 but did not prove a successful Choice/model entitlement. No response bodies, headers, keys, costs, generation IDs or `.env` values were exposed. This Vercel work is historical/superseded and deleted, not part of the Laya boundary.
- Current `/api/intent/classify` remains Nemotron via `llm.chat_completion` in `intent.py`; Pass 8 routing implementation has not begun. Neither `intent.py`, `main.py`, frontend, `llm.py`, nor Nemotron provider modules were changed in Pass 7.
- The new isolated `backend/app/laya.py` wraps `laya==0.4.12` on a local checkpoint path, with lazy singleton initialization and serialized prediction. Auto hardware load attempts CUDA > MPS > CPU; it continues after load failure and accepts an internally lower-priority actual device only when no still-untried available candidate ranks between the requested candidate and actual device. Explicit devices stay strict. Local invalid output/load/inference is sanitized without retry or Nemotron classifier fallback.
- Local artifact: ignored `backend/models/laya-typed-decisions`; pinned revision `e929ae5cf69bc34259cd2f95c9e91145b818b1f0`. The six required runtime files are `config.json`, `rl_agent_config.json`, `model.safetensors`, `encoder/config.json`, `tokenizer/tokenizer.json`, and `tokenizer/tokenizer_config.json`; repository documentation/metadata files are present but not required by the wrapper. Model file SHA-256: `4fa56de72383a9d3efa9cfa78955733c81b9fc8067a587ca4beb82c78107a24e`; path is covered by `.gitignore` rule `backend/models/`.
- `VOICE2LEARN_LAYA_MODEL_DIR` relative overrides resolve from repository root (including when launched from `backend/`); absolute paths are retained. `.env.example` documents root-relative paths.
- Installed versions in existing `backend/.venv`: `laya 0.4.12`, `torch 2.14.1`, `transformers 5.20.2`, `huggingface-hub 1.33.0`; platform auto-detection here: CUDA unavailable, MPS available. Package API verified: `load(model_id_or_path, device=...)`; `Agent.predict(state, questions, ...)`; observed actual answer fields include `choice`, `confidence`, `probabilities` under `answers[question_id]`. Checkpoint output probabilities are rounded to four decimals (observed distribution sum `0.9999`); wrapper tolerance is `1e-3`.
- Initial pre-review local smoke: representative synthetic navigation utterance returned `next`; cold model load plus first prediction 5.376 s; seven repeats median 0.052 s, range 0.049–0.094 s; forced CPU call 7.188 s. Corrected-path smoke results are recorded below. These are local timings, not accuracy claims. The library emits a checkpoint calibration-temperature warning; confidence remains uncalibrated. No 33 ms/speed claim.

## Known issues, scope, and verification status

- Windows CUDA has only static/mocked device selection here; actual Windows CUDA installation and inference are unverified. README now gives ordered selector-generated PyTorch install → CUDA availability check → requirements steps. CUDA hardware isn't available on this Mac.
- Existing NVIDIA STT support requirements are scoped to Linux x86_64/AMD64 by PEP 508 markers; no other STT changes were made. Linux NVIDIA package-index/setup and Windows CTranslate2 Whisper CUDA runtime still need platform-owner verification.
- At app import, `app.main` has no Laya import or model load. Laya sets `USE_TF=0`, `HF_HUB_OFFLINE=1`, and `TRANSFORMERS_OFFLINE=1` before lazy model dependencies load. Runtime requires the six files listed above and never passes a Hub ID.
- Existing voice/check/notes/error paths from Prerequisite R remain pending browser/microphone end-to-end review. Preserve local STT, speech loop and neural/browser TTS, tutoring/generation, authored checks, quiz notes, grading and learner persistence.
- Existing macOS `start-dev.sh` limitation (`wait -n` unsupported by system Bash) remains; preview startup was not assigned for this architecture-only isolated boundary pass.

## Preserved historical evidence

- Prerequisite R was approved 2026-10-20. Recorded branch-local evidence: frontend build and backend import/syntax checks passed; focused request-model/action-filter checks used a stub provider with no live call. Master reported Uvicorn startup plus HTTP 200 for lesson/frontend; these checks do not establish live provider, browser, microphone/VAD, neural-TTS network, or full hands-on voice acceptance.
- Existing R implementation retained authored lesson checks, checks-gated progression, Home/back-from-first-scene/help, quiz recap/notes, load-error retry and expanded validated classifier-state context. Quiz questions remain Nemotron-generated; deterministic quiz grading/proficiency writes stay separate from authored-check comparison. Quiz feedback currently advances automatically; manual Next exists only as a UI handler, not a classifier action.
- Earlier classifier-context verification recorded that visible check state/options, quiz phases/notes and load errors are part of validated request construction and stale snapshots are invalidated. Detailed hands-on retry/grading and browser voice flows remained pending.
- The superseded Vercel client's prior offline mocks tested transport/payload, distribution validation/ties, sanitized failures and no retry. Those client-specific checks were against deleted code and do not validate Laya.

## Verification evidence (Pass 7; approved 2026-10-21)

- `backend/.venv/bin/pip install 'laya==0.4.12'` succeeded; `backend/.venv/bin/pip install -r backend/requirements.txt` succeeded on macOS with platform-specific NVIDIA STT requirements excluded. The updated `pip install --dry-run -r backend/requirements.txt` parsed both markers and skipped them on macOS. Markers enable the packages only on Linux x86_64/AMD64. macOS reports `torch.cuda.is_available() == False`, MPS available.
- Explicit `huggingface_hub.snapshot_download(...)` to the ignored directory completed for the pinned revision. The six runtime files were checked as files; safetensors SHA-256 and ignore rule are recorded above. Runtime model loading did not use a remote ID.
- Direct package introspection reported `laya 0.4.12`, `load(model_id_or_path, device, ...)`, `Agent.predict(state, questions, ...)`. Real inference confirmed output container keys `model`, `answers`, `usage`, with actual Choice fields; only synthetic smoke choice/confidence/timing evidence is reported.
- Focused fake checks passed for valid choices including integer 0/1 endpoints, ties/ambiguity, malformed/missing output, strict numeric type and finite/range checks, exact keys/sum/max-choice validation, invalid input boundaries and max 19 options, device selection, auto CUDA failure→MPS→CPU fallback, CUDA→CPU internal return continuing to MPS, adjacent CUDA→MPS / CUDA→CPU (CUDA+CPU available) / MPS→CPU internal fallback acceptance with actual-device metadata, explicit unavailable/load/mismatch failures with no fallback, all-device failure with sanitized error, singleton load and serialized prediction concurrency, root-relative resolution from repository and backend CWD, absolute path containing spaces, six-file/non-file artifact rejection, and sanitized errors.
- The first real Laya wrapper inference exposed four-decimal probability rounding (`0.9999` total); acceptance tolerance is `1e-3`.
- Master final wrapper smoke with the pinned local artifact returned permitted choice `next`, `ambiguous=false`, device `mps`; cold process/model load plus prediction **6.417 s**. Confidence was `0.203`, uncalibrated; the package emitted its known checkpoint calibration warning. This is smoke evidence only, not accuracy or speed evidence. Earlier local CPU/MPS smoke results remain recorded above.
- Additional master live-local wrapper smoke: one MPS process used the real pinned local artifact for four synthetic state-aware Choice cases. `home-start` → `start-lesson`, confidence `0.2703`, non-ambiguous, cold elapsed **9.543 s**; `lesson-next` → `next`, confidence `0.1903`, non-ambiguous, **0.640 s**; `quiz-option-b` → `select-B`, confidence `0.3021`, non-ambiguous, **0.738 s**; `lesson-back` → `back`, confidence `0.0165`, non-ambiguous, **0.291 s**. All four expected choices matched and device was MPS. The known checkpoint calibration warning appeared. These are four synthetic smoke cases, not an accuracy evaluation; confidences are uncalibrated and acceptance thresholds have not been chosen. The public endpoint still uses Nemotron, so this is not end-to-end Laya routing evidence.
- Startup/import assertion passed with network sockets blocked and `dotenv.load_dotenv` stubbed (so no `.env` read): importing `app.main` made no network attempt and loaded neither Torch nor Laya; `intent` still imports `app.llm` and contains no Laya import. Offline flags were set before lazy model imports.
- Master final checks: frontend `npm run build` passed; backend compile/import passed with app title `Voice2Learn API`, and importing the app left both `laya` and `torch` absent from `sys.modules`; `pip check` reported no broken requirements. Preview services were reused: frontend root at `127.0.0.1:5173` and backend `GET /api/lesson` at `127.0.0.1:8000` both returned HTTP 200. This preview was reused, not newly started for this final check.
- Passes 1–6 text compared byte-for-byte equal to HEAD (8,848 bytes). Protected application/frontend/provider/learner files remained unchanged. `git diff --check` and model ignore check passed; the artifact SHA-256 remains `4fa56de72383a9d3efa9cfa78955733c81b9fc8067a587ca4beb82c78107a24e`.
- Learner-state preservation: SHA-256 before/after `backend/data/learner_state.json` is unchanged at `b4a4dc8fab2d1e8b8c188e526c2da9df91eb6a55d5e7416aa5f5a09264a39198`; only GET/read operations were used, no reset/grading.
- No live hosted providers were used. Browser/microphone and actual Windows CUDA remain unverified. The existing preview was reused as noted above.

## Next action

Implement only revised Pass 8 per `BUILD_PLAN.md`: switch `/api/intent/classify` to state-aware local Laya while preserving the current public API/action vocabulary, hidden-answer rules, gating, tutoring/generation, grading and existing voice behavior. Verify the Pass 8 cases and stop for review. Do not begin Pass 9 evaluation or Pass 10–12 general navigation; Pass 8 remains unapproved until reviewed.
