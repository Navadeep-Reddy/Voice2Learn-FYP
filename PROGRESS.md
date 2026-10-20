# Voice2Learn — Progress

## Current pass

**Prerequisite R — Reconcile the Existing Post-Review Baseline (implementation present in part; repair and verification pending; not approved).**

Documentation has been rebased onto the current `main-ish` implementation for the Jev migration. This is a documentation-only update; it starts no implementation pass. Follow the fixed order in `BUILD_PLAN.md` and stop for review after each pass.

## Approved history

- [x] Pass 1 — Foundation and Data Contracts (approved)
- [x] Pass 2 — Design Shell and Interactive Lesson (approved)
- [x] Pass 3 — Voice Loop and Local Whisper (approved)
- [x] Pass 4 — Context Builder and Nemotron Lesson Q&A (approved)
- [x] Pass 5 — Nemotron Quiz and Learner Proficiency (approved)
- [x] Pass 6 — Demo Hardening and Polish (approved)

## Follow-up sequence

- [ ] Prerequisite R — existing post-review reconciliation; pending, not approved
- [ ] Pass 7 — isolated Vercel Jev client/config; not started on this base
- [ ] Pass 8 — current screen/state-aware Jev routing; not started
- [ ] Pass 9 — core migration evaluation/review; not started
- [ ] Pass 10 — general voice destinations/resume/orientation; not started
- [ ] Pass 11 — pacing/feedback/confirmed quiz exit; not started
- [ ] Pass 12 — full navigation acceptance/handoff; not started

Code present or committed does not establish approval. Earlier Jev branch implementation/evidence is not implementation or approval on this base. Revalidate any authorized reuse.

## Current implementation, inspected 2026-10-20

- Branch `main-ish`, inspected HEAD `5ce5520` (same as `origin/main-ish`); post-review implementation commit `b24ba1e`.
- Public intent classification is still Nemotron through `llm.py`: NVIDIA Integrate primary, OpenRouter fallback. No `backend/app/jev.py` exists on this base.
- Existing code includes authored checks in lesson JSON/UI, local comparison/unlock in App, help/Home actions, quiz recap actions and error retry support, female neural edge-tts with text-only recovery (browser speech removed by explicit user request), and speech-boundary capture (~800 ms silence, 14 s cap).
- Quiz questions remain Nemotron-generated; backend grading and JSON proficiency writes remain separate from lesson checks. Quiz feedback currently advances automatically; manual Next also exists as a UI handler, not a classifier action.
- No live provider, microphone, preview, build or backend-start check was run during this documentation update. Existing pending hands-on review remains pending.

## Known gaps and assumptions

- `App.tsx` `handleTranscript` now includes visible `check_question`/`check_options`; live text-based option A/B checks returned `select-check`. It still omits `notes_open` and `quiz_error`, so close-notes state may be wrong and failed-load voice retry may hit request validation. Prerequisite R state wiring/guards and hands-on voice verification remain pending. Do not claim all post-review voice operations work end-to-end.
- The current contract does not carry check-completion or quiz phase; Prerequisite R adds the specified coordinated state fields and guards. Existing screen/scene/question guards do not fully cover notes/check/phase changes.
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
- 2026-10-21: repaired lesson quick-check feedback so selected correct answers display green confirmation and wrong answers display red retry feedback. Frontend production build passed; local dev preview started at `http://localhost:5173`, backend lesson endpoint responded. Manual browser/voice review remains pending; Prerequisite R is not approved.
- 2026-10-21: fixed missing visible lesson-check context in classifier requests, which previously excluded `select-check`. Live text requests for option A/B returned the corresponding selection, without submitting quiz grades or changing learner state. Updated installed/required edge-tts from 7.2.8 to >=7.3.1 after Microsoft handshake 403s; live `/api/tts/speak` returned 200 with 25,632 audio bytes. Removed raw speech-provider exception trace logging; browser fallback preserved. Feedback now reflects the latest selection independently of an earlier passed check. Full microphone/browser acceptance and the rest of Prerequisite R remain pending.
- 2026-10-21: investigated a subsequent classifier 502 after both Nemotron providers failed. Fresh direct NVIDIA probe returned 200; OpenRouter returned 404 for its configured model. Live home `start lesson` classifier retry returned 200 with `start-lesson`. Original NVIDIA failure cause is unknown; added sanitized HTTP-status/transport-type diagnostics without response bodies or credentials. OpenRouter fallback availability remains a known issue; provider/model routing policy unchanged.
- 2026-10-21: user-requested transcript visibility/error diagnostics: microphone dock now shows the latest accepted non-empty Whisper transcript in a bounded, scrollable, live-announced “You said” card; screen bottom spacing accommodates the expanded dock. Transcript is session-only, updated before classification and retained through classification errors. Provider logs distinguish missing keys, HTTP status/reason, transport exception type and malformed completions; neural speech logs exception type/status without signed URLs. Controlled HTTP 401/403/404/429/503 and timeout checks verified diagnostic categories and excluded synthetic credential/body/URL markers. Frontend production build passed. Browser/microphone and responsive visual review remain pending.
- 2026-10-21: user-requested female-only speech: removed browser/system utterance playback and voice selection. Neural request/playback failure displays text, resumes listening, and holds automatic quiz feedback 4–12 seconds for reading. Single-settlement, stale sequence and cancellation guards prevent duplicate advancement/audio. Unrecognized classified commands now show/speak screen-specific guidance instead of claiming transcription failed (e.g. “Next” on Home). Fixed first-scene Back/explicit Home/click Home cancelling speech while leaving processing stuck: all use a shared Home confirmation that returns to listening. Controlled hook/App checks outside the repo passed stale audio, duplicate completion, text recovery, cancelled timers, cleanup, first-scene Back/Home, unclear Home commands and listening resume after audio success/failure. Frontend production build passed; live neural endpoint returned 200 with 26,208 audio bytes; preview responds at localhost:5173. Full real-microphone/visual review and remaining Prerequisite R wiring still await verification/approval.
- 2026-10-21: screenshot follow-up reproduced Firefox autoplay `NotAllowedError` despite live synthesis 200/audio; priming an HTML audio element did not solve it. Replaced HTML audio playback with a reusable Web Audio context activated during the initial gesture; real Firefox neural decoding/playback then succeeded without subsequent gestures. Moved transcript/reply into inline VoiceStatus cards with a separate audio-error banner; reserved a bottom microphone area and scrollable content viewport, restored the circular microphone, and reset content scroll on navigation. Browser-driven checks at 1280×900 and 390×844 passed transcript display, real neural playback, wrong/right authored-check feedback, Back-from-first-scene/listening, and injected synthesis-503 text recovery with no option/control overlap. Microphone audio and classifier replies were simulated in that browser test; neural synthesis/decoding/playback and layout were real, with accelerated test playback. No learner proficiency writes/reset. Controlled stale/duplicate/cancellation checks and frontend build passed. Real microphone/live classifier reliability and remaining Prerequisite R work are still pending; previous OpenRouter 404 remains unresolved.

- 2026-10-21: user explicitly authorized committing and pushing these focused regression fixes, transcript UI, speech revision, diagnostics and supporting documentation to `main-ish`. This checkpoint does not mark all of Prerequisite R complete or authorize Pass 7.

## Next action

When implementation is requested, finish Prerequisite R only: repair state/context wiring, run its focused checks, start preview, report evidence/limitations and wait for review. User approval is required before marking it complete and starting Pass 7. Update only this tracker for evidence/progress; do not rewrite plan definitions to record status.
