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

- At handoff for this implementation, branch `jev`, HEAD `5ce5520`; Prerequisite R implementation changes are local. No branch change, commit or push performed during Prerequisite R verification.
- Public intent classification is still Nemotron through `llm.py`: NVIDIA Integrate primary, OpenRouter fallback. No `backend/app/jev.py` exists on this base.
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

- 2026-10-20: inspected current code, root docs and Git state; reconciled architecture/contracts and pass order for Jev plus the requested voice navigation. Consolidated former `POST_REVIEW_PLAN.md` content into Prerequisite R in BUILD_PLAN; preserved its unapproved state. No application/configuration/model code changed.
- Documentation consistency checks: all 18 current classifier action names documented, Markdown fences/whitespace checked, original BUILD_PLAN Passes 1–6 preserved byte-for-byte, obsolete plan consolidated, and git diff --check passed. No application tests/builds or preview were needed/run for this documentation-only task.
- Provider references checked against official Vercel TypeSafe-compatible API and TypeSafe Choice docs. This verifies documentation, not model access/performance.
- Pre-existing untracked `.DS_Store` preserved; USER_NAVIGATION catalogue retained and revised. No staging, commit, push, branch creation or merge.

## Next action

Implement Pass 7 only, following `BUILD_PLAN.md` and SPEC Section 16. Keep the current Nemotron classifier routing unchanged; do not begin the Pass 8 routing switch. Do not assume Jev credentials/team/model access or claim a live Jev call. Record live-provider, browser and microphone limitations accurately, then stop for review before any next pass.
