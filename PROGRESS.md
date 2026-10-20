# Voice2Learn — Progress

## Current pass

**Pass 7 — Isolated Vercel Jev Client and Configuration (started/authorized; not completed or approved).**

Prerequisite R was explicitly approved on 2026-10-20. Follow the fixed order in `BUILD_PLAN.md`; implement Pass 7 only and stop for review before any later pass.

## Approved history

- [x] Pass 1 — Foundation and Data Contracts (approved)
- [x] Pass 2 — Design Shell and Interactive Lesson (approved)
- [x] Pass 3 — Voice Loop and Local Whisper (approved)
- [x] Pass 4 — Context Builder and Nemotron Lesson Q&A (approved)
- [x] Pass 5 — Nemotron Quiz and Learner Proficiency (approved)
- [x] Pass 6 — Demo Hardening and Polish (approved)

## Follow-up sequence

- [x] Prerequisite R — existing post-review reconciliation; approved 2026-10-20
- [ ] Pass 7 — isolated Vercel Jev client/config; started/authorized, not completed or approved
- [ ] Pass 8 — current screen/state-aware Jev routing; not started
- [ ] Pass 9 — core migration evaluation/review; not started
- [ ] Pass 10 — general voice destinations/resume/orientation; not started
- [ ] Pass 11 — pacing/feedback/confirmed quiz exit; not started
- [ ] Pass 12 — full navigation acceptance/handoff; not started

Code present or committed does not establish approval. Earlier Jev branch implementation/evidence is not implementation or approval on this base. Revalidate any authorized reuse.

## Current implementation, inspected 2026-10-20

- Pass 7 work is on branch `jev`, clean base HEAD `f461f0fbc76086a1bfaab26776eba6d422933e9d` tracking `origin/jev`. No branch change, commit or push performed.
- `backend/app/jev.py` now holds an isolated request-time Vercel TypeSafe Choice client; `backend/.env.example` documents its optional settings. Public intent classification remains Nemotron via `llm.chat_completion` in `intent.py`; `intent.py`, `main.py`, frontend, `llm.py` and provider modules were not changed.
- Existing code includes authored checks in lesson JSON/UI, local comparison/unlock in App, help/Home actions, quiz recap actions and error retry support, neural edge-tts endpoint/browser fallback, and speech-boundary capture (~800 ms silence, 14 s cap).
- Quiz questions remain Nemotron-generated; backend grading and JSON proficiency writes remain separate from lesson checks. Quiz feedback currently advances automatically; manual Next also exists as a UI handler, not a classifier action.
- Prerequisite R locally wires visible check state, quiz phases/notes/load errors, gates actions, and invalidates classification snapshots on relevant state changes. Frontend build and backend import/syntax checks pass; focused request-model/action-filter checks passed with a stub provider and no live call. Master verification reports Uvicorn clean startup and HTTP 200 at `http://127.0.0.1:8000/api/lesson` and `http://127.0.0.1:5173/`. Live provider, browser, microphone/VAD, neural-TTS network and hands-on voice flow remain unverified.

## Known gaps and assumptions

- Classifier request construction now includes validated visible check data and quiz phase context. No live/stubbed endpoint integration exercise of every action path or actual browser voice flow has been run yet; keep end-to-end acceptance pending.
- Quiz-load errors are distinct from answer-submission failures; detailed hands-on retry/grading flow still requires review.
- `./start-dev.sh` failed in this macOS shell because its Bash does not support `wait -n`; master launched the existing backend and frontend commands separately. Script repair is outside this pass.
- SPEC previously listed only original actions in Section 12; updated docs now include the actual expanded vocabulary and mark planned additions explicitly.
- README previously described browser-only TTS in places and machine-specific Whisper defaults as universally verified. Setup now distinguishes current code defaults from local-machine verification.
- Local Whisper defaults point to the original developer's Linux cached model path and CUDA. Inspect the actual local runtime/model before STT work; do not download a model or assume this path works on this machine.
- Neural speech needs network access. Browser microphone/voice and responsive layout still need hands-on review.
- Vercel Jev credentials/team access and successful Choice response are not verified on this base. Historical key/access results on another branch are not a new live check. Never print/read out a key for diagnostics.
- `USER_NAVIGATION.md` includes later planned actions. Destination resolution is generic over existing lesson data; scope remains one chapter/lesson. Resume is in-session only; no cross-lesson engine or persistent navigation state.

## Documentation and verification log

- 2026-10-20 Pass 7 implementation: added isolated Jev Choice request/response validation, bounded request-time configuration, sanitized transport/config/response errors, no retry/fallback, ambiguity reporting, and owned-versus-injected HTTP client lifecycle. README and example env now describe the isolated client while stating the endpoint remains Nemotron until Pass 8. Pass 7 remains pending/unapproved. Preview verification and the unsuccessful live isolated call are recorded below.
- Offline evidence: backend compileall and imports of `app.main`/`app.jev` with Jev variables absent passed; MockTransport checks covered exact POST URL/headers/payload, defaults and timeout bounds, valid output, tie ambiguity, invalid probability/schema/JSON/confidence cases, nullable/evolving metadata, non-2xx and transport errors, sanitized messages, no retry (one request), caller-owned client preservation and internal client cleanup on success/non-2xx/invalid response. Frontend `npm run build` and `git diff --check` passed. Current `intent.py` still calls `llm.chat_completion` and has no Jev reference. Learner state SHA-256 remained `b4a4dc8fab2d1e8b8c188e526c2da9df91eb6a55d5e7416aa5f5a09264a39198`.
- The authorized live call and status-only Gateway diagnostics are recorded below. Browser/microphone checks remain unverified. No credential, environment value, response body, raw provider message, header, cost or generation ID was read out or reported.
- Focused independent-review corrections: strict numeric int/float values now accept JSON integer endpoints while rejecting booleans/strings and return floats; metadata uses the current snake_case usage fields and Gateway routing/cost names, remaining nullable/extra-tolerant; question/answer types are `Literal["choice"]`; configured model is passed into input validation. Parser exceptions are narrowly translated and unexpected/cancellation errors are not caught at the public call boundary. Rechecked integer 0/1 cases, invalid numeric types, official metadata sample/nesting plus null/omitted/extra fields, distribution/tie/config/transport/client-lifecycle behavior offline; no live call.
- Master final verification: frontend `npm run build` passed; backend compile/import of `app.jev` and `app.main` passed with FastAPI title `Voice2Learn API` and no startup network call. Reused preview at `http://127.0.0.1:5173/` and backend at `http://127.0.0.1:8000/`; frontend root and `GET /api/lesson` both returned HTTP 200. `git diff --check` passed and learner state remained unchanged at the recorded SHA-256 above. Current classifier files remain unchanged on Nemotron. No baseline-provider timing was run.
- Authorized live Pass 7 evidence: after the user privately configured `backend/.env`, one live call through `app.jev.choose()` was attempted. The client returned the sanitized `JevTransportError: Jev service is unavailable.` because the System One POST was non-success; no Choice result, model, confidence, probabilities or successful-call latency is established. A status-only authenticated GET to `/typesafe/v1/models` returned HTTP 200; the catalog contained Jev identifiers `jev`, `jev-1.13.0` and `jev-1.14.0`, but did not literally list the configured alias string. This confirms Gateway catalog access only, not decision/model entitlement or resolved version. A status-only repeat of the same System One POST returned HTTP 403. No response body, raw provider message, headers, key, costs, generation ID or environment values were printed/reported. The 403 may be consistent with project/team/model/billing authorization denial, but its cause is not established and it does not establish a code defect.

- 2026-10-20: inspected current code, root docs and Git state; reconciled architecture/contracts and pass order for Jev plus the requested voice navigation. Consolidated former `POST_REVIEW_PLAN.md` content into Prerequisite R in BUILD_PLAN; preserved its unapproved state. No application/configuration/model code changed.
- Documentation consistency checks: all 18 current classifier action names documented, Markdown fences/whitespace checked, original BUILD_PLAN Passes 1–6 preserved byte-for-byte, obsolete plan consolidated, and git diff --check passed. No application tests/builds or preview were needed/run for this documentation-only task.
- Provider references checked against official Vercel TypeSafe-compatible API and TypeSafe Choice docs. This verifies documentation, not model access/performance.
- Pre-existing untracked `.DS_Store` preserved; USER_NAVIGATION catalogue retained and revised. No staging, commit, push, branch creation or merge.

## Next action

Pass 7 remains pending/unapproved. The user should verify Gateway project/team/model/billing permission, then rerun one isolated Choice privately; no code defect is established by the 403. Keep current Nemotron classifier routing unchanged. Await explicit user approval before marking Pass 7 complete or starting Pass 8. Preserve the known macOS `start-dev.sh` issue (`wait -n` unsupported by the shell's Bash); the preview was reused through separate services.
