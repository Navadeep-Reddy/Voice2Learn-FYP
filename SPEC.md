# Voice2Learn — Pre-Review MVP Specification

**Status:** Product/contract source of truth; includes planned Jev migration. Read `PROGRESS.md` for actual implementation and approval state.
**Phase:** Pre-Review MVP
**Scope:** One polished vertical slice

## 1. Product Definition

Voice2Learn is a **voice-first interactive mathematics learning application** for children around ages 8–12 who may have difficulty using conventional mouse, keyboard, or touchscreen input.

For the Pre-Review MVP, the app teaches one small lesson, lets the child ask questions while learning, then runs an adaptive voice-operated multiple-choice quiz that updates a simple learner proficiency model.

## 2. Pre-Review Goal

Demonstrate this complete flow convincingly:

`Home -> Interactive Lesson -> Ask Questions -> AI-Generated Quiz -> Proficiency Update -> Results`

The demo should prove:

- structured interactive learning material;
- voice-first operation;
- contextual AI tutoring during the lesson;
- dynamic Nemotron-generated assessment;
- learner proficiency updates;
- a polished child-friendly experience.

## 3. Scope

### In Scope

- One demo learner: **Alex**
- One chapter: **Multiplication & Division**
- One lesson: **Groups and Sharing**
- Five authored lesson scenes
- Voice navigation and authored scene understanding checks
- Contextual lesson Q&A with Nemotron
- Local Whisper STT
- Female neural TTS with text-only recovery when speech is unavailable
- Five-question quiz
- One Nemotron-generated MCQ at a time
- Deterministic quiz grading
- Two proficiency values:
  - multiplication
  - division
- Local JSON persistence
- Results/progress screen and authored lesson recap during quiz
- Planned Jev routing through Vercel AI Gateway
- Planned lesson-agnostic voice navigation described in Sections 16–17

### Out of Scope

- Other chapters or lessons
- Long multiplication/division
- Remainders
- Full times-table curriculum
- Authentication
- Multiple learners
- Supabase
- Teacher/admin screens
- RAG/vector databases
- Uploaded learning material
- True mid-sentence interruption
- Gamification systems
- Streaks/XP/currency/leaderboards
- Complex analytics
- Final Whisper fine-tuning/training pipeline

## 4. Technology

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Python
- FastAPI
- Pydantic

### AI / Voice

- STT: user's existing local Whisper installation
- Target intent routing: Jev through Vercel AI Gateway; current baseline classification still uses Nemotron until Pass 8.
- Tutor + question generation: Nemotron through NVIDIA Integrate only
  (`nvidia/nemotron-3-super-120b-a12b`), without an alternate-provider fallback
- TTS: backend female neural speech (`edge-tts`, network required); no browser/system voice playback

The frontend calls only the application backend. Nemotron access uses NVIDIA Integrate only through `backend/app/llm.py`; provider failures return a friendly recoverable error without trying another provider. Jev has its own backend client and key; its failures do not fall back to Nemotron. At the user's request, neural TTS is the only speech source; failed speech displays text rather than using a browser/system voice.

## 5. Screens

The MVP has four primary screens. Section 7.3 lists the full current action vocabulary, including checks and notes; Section 12 defines its contract. Section 15 records post-review behavior. Sections 16–17 define the planned migration and navigation extensions. The lists below describe the current baseline actions; planned extensions are in Section 17.

### 5.1 Home

Purpose: start the demo and show the single available learning area.

Show:

- Voice2Learn brand
- greeting: `Hi, Alex!`
- one large card: `Multiplication & Division`
- subtitle: `Learn with groups, sharing, and quick challenges.`
- simple current proficiency for multiplication and division
- persistent microphone control

Required voice intent (resolved semantically by `POST /api/intent/classify`, not by frontend exact phrase matching):

- `start lesson` and similar imperfect variants such as `start`, `let's learn`, `multiplication and division` -> `start-lesson`
- `help` explains available voice actions
- any other unsupported non-empty request -> `unclear` (stay on Home and ask the child to repeat)

Click/tap on the lesson card is a fallback.

### 5.2 Lesson

Purpose: teach the authored lesson visually and through narration.

Show:

- lesson title
- scene progress, e.g. `2 / 5`
- large animated learning visual
- short scene narration
- `Back` and `Next` fallback controls
- persistent microphone/listening state
- a small hint that the child may ask a question

Required voice intents (resolved semantically by `POST /api/intent/classify`, not by frontend exact phrase matching):

- navigation: `next` (including spoken variants such as `go next` and `continue`, plus imperfect STT variants), `back` (including `go back`)
- `home` returns Home; `back` from the first scene also returns Home
- `select-check` with A/B/C/D answers the current check; correctness unlocks forward movement without updating proficiency
- `help` explains available commands
- `repeat` replays narration plus the current check/options
- `start-quiz` (spoken as `start quiz` / `quiz me`), allowed only on the final scene after its check is passed
- free-form lesson question -> `ask-question`
- any other unsupported non-empty request -> `unclear`

Show the authored check and A/B/C/D options after narration. Disable forward controls until its check is passed. On the final scene, enable the Start Quiz fallback and spoken prompt only after the check is passed.

When a transcript is classified as `ask-question`, send the original transcript to the tutor endpoint (`POST /api/tutor/ask`). The classifier response never carries lesson question content; the frontend uses the original transcript.

### 5.3 Quiz

Purpose: assess the taught concepts.

Show:

- progress, e.g. `Question 2 of 5`
- one question
- exactly four answer options labeled A, B, C, D
- current voice/listening state
- immediate feedback after answering

When a question appears, TTS should read the question and all four options with their A/B/C/D labels before listening for an answer.

Required voice intents (resolved semantically by `POST /api/intent/classify`, not by frontend exact phrase matching):

- `select-option` with `option` A/B/C/D (spoken as `A`, `B`, `C`, `D`, including imperfect variants such as `option A`, `bee`, `see`)
- `repeat-question` (spoken as `repeat question`; repeat the visible question and options)
- `open-notes`, `close-notes`, `read-notes` access the authored recap without losing the question
- `retry-question` retries a failed question load only
- `help` explains available commands
- any other unsupported non-empty request -> `unclear`

Click/tap on an option is a fallback.

Generate the next question only after grading and the learner-state update. Baseline code advances automatically after feedback speech. Pass 11 changes this to a listening feedback phase awaiting Continue; until then, do not claim voice-controlled quiz pacing exists.

### 5.4 Results

Purpose: show that the learner model changed.

Show:

- score out of 5
- multiplication proficiency
- division proficiency
- short encouraging message
- `Review Lesson`
- `Take Quiz Again`

Required voice intents (resolved semantically by `POST /api/intent/classify`, not by frontend exact phrase matching):

- `review-lesson` (spoken as `review lesson`)
- `retake-quiz` (spoken as `take quiz again`)
- `help` explains available commands
- any other unsupported non-empty request -> `unclear` (stay on Results and ask the child to repeat)

## 6. Authored Lesson: Groups and Sharing

The lesson content is predefined. Nemotron does not generate the lesson.

Store lesson content as structured JSON in the backend so the frontend and context builder use one source of truth.

### Scene 1 — Make Equal Groups

**Concept:** equal groups

Narration:

> Let's start with equal groups. Here are 3 groups. Each group has 4 apples. Every group has the same number.

Visual:

- three clearly separated groups/baskets
- four apples in each group
- groups appear one after another

### Scene 2 — Repeated Addition

**Concept:** repeated addition

Narration:

> We can count all the apples by adding 4 three times. 4 plus 4 plus 4 equals 12.

Visual:

- keep the three groups visible
- highlight each group in sequence
- build `4 + 4 + 4 = 12`

### Scene 3 — Turn It Into Multiplication

**Concept:** multiplication

Narration:

> Three equal groups of four can be written as 3 times 4. So 3 times 4 equals 12.

Visual:

- transition from `4 + 4 + 4 = 12`
- reveal `3 × 4 = 12`
- visually label:
  - `3 groups`
  - `4 in each group`

### Scene 4 — Share Equally

**Concept:** division

Narration:

> Now we have 12 apples and share them equally into 3 groups. Each group gets 4 apples. That's division: 12 divided by 3 equals 4.

Visual:

- begin with 12 apples together
- distribute them into three groups
- reveal `12 ÷ 3 = 4`

### Scene 5 — They Work Together

**Concept:** multiplication/division relationship

Narration:

> Multiplication and division are connected. If 3 times 4 equals 12, then 12 divided by 3 equals 4. Nice work! You're ready for a quick quiz.

Visual:

- `3 × 4 = 12`
- `12 ÷ 3 = 4`
- visual connection/arrows between the equations
- clear transition to the quiz

## 7. Voice Behavior

### 7.1 Core State

Use a simple UI voice state:

- `idle`
- `listening`
- `processing`
- `speaking`
- `error`

The microphone visually reflects the current state.

### 7.2 Continuous Demo Flow

Browser security may require an initial physical action to grant microphone permission/start capture.

After that initial activation:

- the microphone stream stays monitored continuously (Web Audio speech
  level measurement, not fixed recording windows);
- an utterance starts when speech crosses a calibrated threshold (with a
  small pre-roll so first phonemes are kept) and ends after sustained
  silence (~700-1000ms);
- transcription (`POST /api/stt/transcribe`) runs only on a complete
  utterance; silence is never sent and resumes monitoring silently;
- a maximum utterance cap (~12-15s) exists only as a runaway safety guard,
  never as the normal utterance boundary;
- TTS speaks lesson/tutor/quiz content;
- STT pauses while TTS is speaking (any partial clip is discarded);
- Listening resumes after speech ends.
- Repeated physical interaction should not be required.

True barge-in while the system is speaking is not required.

### 7.3 Semantic Intent Classification

Target: every accepted non-empty STT transcript goes to `POST /api/intent/classify`, where Jev selects one action allowed by the current screen and interaction state. Until Pass 8, this endpoint uses the NVIDIA-only Nemotron boundary. No frontend exact phrase matching decides actions. Empty turns resume silently.

Preserve the current action names during migration:

| Screen | Actions | State rules |
| --- | --- | --- |
| Home | `start-lesson`, `help`, `unclear` | Start the available lesson at its beginning. |
| Lesson | `next`, `back`, `home`, `repeat`, `ask-question`, `select-check`, `help`, `unclear` | A correct understanding check unlocks forward movement. Back from the first scene returns Home. Repeat includes narration and the current check/options. |
| Lesson, final scene | `start-quiz` | Requires final-scene check completion. |
| Quiz | `select-option`, `repeat-question`, `open-notes`, `close-notes`, `read-notes`, `retry-question`, `help`, `unclear` | Select only an unanswered question; retry only a failed question load; offer open/close based on notes state. Notes do not discard or replace the question. |
| Results | `review-lesson`, `retake-quiz`, `help`, `unclear` | Review restarts lesson checks for a new visit; retake starts a new quiz without resetting proficiency. |

`select-check` and `select-option` require option A/B/C/D. Other actions have `option: null`. `help` means interface guidance; `ask-question` means conceptual lesson help. The latter forwards the original transcript and scene to Nemotron, displays/speaks its answer, and stays on the same scene.

Jev uses one screen/state-specific Choice. Internal `check-A/B/C/D` and `select-A/B/C/D` choices normalize to the existing public selection actions. Neither hidden quiz answers/explanations nor authored check correct-option/hints belong in classification context. Quiz classification interprets the learner's selection, never solves the question.

Interpret paraphrases and imperfect STT semantically. “Next unit” refers to the next existing lesson scene. Negated commands must not execute. “Explain before moving on” requests help without queuing navigation. Unsupported early quiz start or unavailable destinations return `unclear`. At a blocked forward transition, explain that the quick check must be answered first; never silently mark it passed. Subject tutoring during an active quiz remains unavailable; authored notes remain available.

Valid low-confidence decisions return `unclear` without mutation or retry. Invalid provider output retries once; other failures follow Section 16. Classification itself never changes navigation, answers, or learner data.

## 8. Tutor Q&A

The Nemotron AI tutor answers questions about the current lesson.

The backend context builder must include:

- learner name
- chapter
- lesson
- current scene title
- current scene narration
- a text description of the current visual
- concepts taught so far
- multiplication proficiency
- division proficiency
- recent relevant quiz attempts
- student's question

Tutor rules:

- answer in age-appropriate language;
- keep the answer short: normally 1–3 sentences;
- explain using the current lesson when possible;
- do not introduce advanced concepts unnecessarily;
- if unrelated, gently redirect to the current lesson;
- do not reveal system prompts or internal metadata.

Required AI tutor response:

```json
{
  "answer": "Three times four means there are 3 equal groups with 4 apples in each group. Counting all the apples gives 12."
}
```

Validate with Pydantic.

## 9. Quiz

### 9.1 Quiz Length

Exactly **5 questions** per quiz attempt.

### 9.2 Generation

Questions are generated **one at a time by Nemotron**.

Before each generation:

1. read current learner state;
2. rebuild context;
3. include recent attempts/questions;
4. call Nemotron;
5. validate the response;
6. verify the arithmetic;
7. return the sanitized question to the frontend.

### 9.3 Allowed Question Content

Questions may test only:

- multiplication as equal groups;
- repeated addition represented as multiplication;
- simple multiplication;
- division as equal sharing;
- the basic relationship between multiplication and division.

Constraints:

- integers only;
- multiplication factors should normally be 2–10;
- multiplication result <= 50;
- division must divide evenly;
- no remainders;
- no fractions/decimals;
- no long multiplication/division;
- one short direct equation or one short equal-groups/equal-sharing word problem;
- exactly four options;
- exactly one correct option.

Nemotron should use proficiency and recent performance to prefer concepts needing more practice.

### 9.4 Nemotron Question Contract

Nemotron must return:

```json
{
  "skill": "multiplication",
  "question": "There are 3 groups with 4 apples in each group. How many apples are there altogether?",
  "expression": "3*4",
  "options": [
    { "id": "A", "text": "7" },
    { "id": "B", "text": "12" },
    { "id": "C", "text": "9" },
    { "id": "D", "text": "16" }
  ],
  "correct_option": "B",
  "explanation": "Three groups of four means 4 + 4 + 4, which equals 12."
}
```

`skill` must be exactly:

- `multiplication`
- `division`

`correct_option` must be exactly:

- `A`
- `B`
- `C`
- `D`

### 9.5 Arithmetic Verification

Before accepting a generated question, the backend must verify `expression`.

Allowed forms:

- `integer * integer`
- `integer / integer`

Do not use raw `eval`.

Parse the two operands and operator explicitly.

For division:

- divisor must not be zero;
- result must be an integer.

The computed answer must match the text of the option referenced by `correct_option`.

If validation or verification fails:

- retry generation once;
- if it fails again, return a recoverable error;
- do not update learner state.

### 9.6 Frontend Question Contract

Do not send the correct answer or explanation to the frontend before submission.

Return only:

```json
{
  "question_id": "server-generated-id",
  "skill": "multiplication",
  "question": "There are 3 groups with 4 apples in each group. How many apples are there altogether?",
  "options": [
    { "id": "A", "text": "7" },
    { "id": "B", "text": "12" },
    { "id": "C", "text": "9" },
    { "id": "D", "text": "16" }
  ]
}
```

The backend retains the answer for grading.

## 10. Learner State

Use one local JSON file as persistent state for the demo.

Initial state:

```json
{
  "student_name": "Alex",
  "proficiency": {
    "multiplication": 50,
    "division": 50
  },
  "recent_attempts": []
}
```

Each stored attempt should contain:

```json
{
  "skill": "division",
  "question": "12 divided equally into 3 groups gives how many in each group?",
  "selected_option": "C",
  "correct_option": "B",
  "correct": false,
  "timestamp": "ISO-8601"
}
```

Keep only the most recent 10 attempts.

### Proficiency Update

For the skill tested:

- correct: `+10`
- incorrect: `-5`

Clamp to `0..100`.

This rule is intentionally simple for the Pre-Review.

## 11. Context Builder

Implement one small backend function/module responsible for building LLM context.

It reads:

- learner state;
- lesson JSON;
- current scene;
- recent attempts;
- current task type.

It produces concise markdown-formatted context for:

- lesson Q&A;
- quiz generation;
- semantic intent classification.

Before each tutor/quiz model call and each intent-classifier provider attempt, overwrite a generated runtime file at:

`backend/data/context.md`

`learner_state.json` and `lesson.json` remain the sources of truth. `context.md` is generated diagnostic context and must never be edited manually. Each request sends its own in-memory context, never rereads that shared file. Keep tutor/quiz context interfaces intact when adjusting intent context. Build Jev context from visible screen data and validated state; do not copy whole lesson objects containing check answers or recent grading data into it.

Do not scatter prompt/context construction across route handlers.

## 12. Backend API

Keep the API small.

### `GET /api/lesson`

Returns the authored lesson JSON.

### `GET /api/learner`

Returns current learner name and proficiency.

### `POST /api/stt/transcribe`

Input: recorded audio
Output:

```json
{
  "text": "option B"
}
```

Uses the local Whisper adapter.

### `POST /api/intent/classify`

Existing HTTP boundary, switching from Nemotron to Jev in Pass 8. Preserve the current response shape during that pass.

Request fields:

| Field | Meaning / validation |
| --- | --- |
| `transcript` | Required nonblank original STT text. |
| `screen` | `home`, `lesson`, `quiz`, or `results`. |
| `scene_id` | Required valid lesson scene on Lesson; absent/null elsewhere. Resolve title, position and final status from authored data. |
| `check_question`, `check_options` | Paired visible check text/options for an active lesson check. Options contain A/B/C/D once each; validate against the scene. Never include correct option or hint. |
| `quiz_question`, `quiz_options` | Paired visible unanswered quiz question/options; no answer or grading explanation. A/B/C/D once each. |
| `notes_open` | Existing boolean, default false; true only on Quiz. |
| `quiz_error` | Existing boolean, default false; true only for failed question loading without a question/options. |

The baseline backend accepts these fields, but the current frontend omits check/notes/error context (see `PROGRESS.md`). Prerequisite R repairs that wiring before migration.

Planned optional state additions in Prerequisite R, implemented together in Python and TypeScript: `check_passed` (lesson boolean, default false) and `quiz_phase` (`loading`, `answering`, `grading`, `feedback`, `error`; quiz only). Require internally consistent combinations; loading/grading/feedback do not submit answers. For feedback, omit old question/options from classification and expose only actions appropriate to feedback. `quiz_phase` defaults to inferred answering/error for legacy requests. Do not treat absence of context as proof that an action is safe. The app revalidates all transitions against its live state.

Examples after prerequisite wiring:

```json
{"transcript":"go next","screen":"lesson","scene_id":"scene-2","check_passed":true}
```

```json
{"transcript":"try loading again","screen":"quiz","quiz_error":true,"quiz_phase":"error","notes_open":false}
```

Current response, preserved through Pass 9:

```json
{"action":"select-check","option":"B"}
```

`option` is non-null only for `select-option` or `select-check`. No rewritten transcript, category, confidence, probabilities or provider metadata enters the public result. Unknown lesson scene: 404. Invalid input: 422. Provider failure: 502 with `{"detail":"My helper is having trouble right now. Try again."}`. Low confidence: 200 with `{"action":"unclear","option":null}`.

The future Pass 10 navigation contract adds nullable `target_scene_id`, documented in Section 17. Implement coordinated backend/frontend changes in that pass; do not add speculative payload fields earlier.

### `POST /api/tutor/ask`

Input:

```json
{
  "scene_id": "scene-3",
  "question": "Why is it three times four?"
}
```

Output:

```json
{
  "answer": "..."
}
```

### `POST /api/quiz/next`

Generates and returns the next sanitized Nemotron question.

### `POST /api/quiz/answer`

Input:

```json
{
  "question_id": "...",
  "selected_option": "B"
}
```

Output:

```json
{
  "correct": true,
  "correct_option": "B",
  "explanation": "...",
  "proficiency": {
    "multiplication": 60,
    "division": 50
  }
}
```

### `POST /api/demo/reset`

Restores the demo learner to the initial state and clears the active quiz question. Presenter utility, not a casual student voice command.

### `POST /api/tts/speak`

Existing neural TTS boundary. Input `{ "text": "..." }` (1–2500 characters); returns `audio/mpeg`. Uses configured `VOICE2LEARN_TTS_VOICE`, default `en-US-JennyNeural`, via networked `edge-tts`. Unavailable/failed synthesis returns a friendly 503; frontend displays the message as text without browser/system speech. Resume listening after failure; graded feedback with automatic continuation gets a bounded reading delay (4–12 seconds) before advancing. Cancel stale fetch/audio/timers on navigation, suppress recording during speech, and resume listening after completion. Back/Home from the first scene confirms Home and resumes listening. Do not send API credentials to the frontend.

Activate a reusable Web Audio playback context during the initial microphone/click/key gesture; decode and play subsequent neural audio through it without requiring another physical action. Distinguish synthesis HTTP errors from browser activation/decoding/playback errors in safe console diagnostics. Display the latest transcript and recoverable app message in normal page flow, with audio status separate; preserve a reserved microphone area so the conversation never overlays lesson controls.

## 13. Error Behavior

NVIDIA requests use `chat_template_kwargs.enable_thinking=false` for short structured demo responses, with a 60-second total deadline and a 5-second connection timeout. A timed-out question load returns a friendly 502 with “This question is taking too long. Say try again to retry.” Provider timeouts do not automatically retry; retain the existing single retry for invalid structured output. Failed question-load classifier requests carry `quiz_error=true` without question/options and include notes state. Revalidate before retry, reject duplicate loads and stale replies, and never retry grading or mutate proficiency when a question load fails.

Automatically recover from NVIDIA HTTP 500/502/503/504 within the same completion request: at most four total attempts, with 0.5/1/2-second backoff. The 60-second deadline includes every attempt and delay; it is not restarted per attempt. Keep the existing quiz loading state until success or exhausted recovery. Optional backend-only `NVIDIA_FALLBACK_API_KEY` permits one primary-to-fallback credential switch per request after HTTP 401/403/429 or 500/502/503/504, using the same endpoint/model and shared deadline/attempt budget. Blank or identical secondary keys are ignored and `NVIDIA_API_KEY` remains required. Never switch back within a request or retry 401/403/429 on the same credential; without an eligible switch, these statuses fail immediately. Other HTTP statuses, missing primary configuration, transport failures, timeouts and malformed provider envelopes do not switch credentials. Logs may name the credential slot but never its value. This is an NVIDIA-only, side-effect-free completion retry; do not retry quiz answer submission or apply it to Jev's separate no-retry transport policy.

The demo must fail gracefully.

Examples:

- Whisper cannot transcribe -> show `I didn't catch that. Try again.`
- command is unclear -> stay on the current screen and ask the child to repeat
- Jev classifier error, or both Nemotron providers failing for tutoring/generation -> show `My helper is having trouble right now. Try again.`
- invalid LLM output after retry -> do not mutate state; allow retry
- microphone unavailable -> keep click/tap fallback controls usable

Never show stack traces or raw provider errors in the student UI.

## 14. Acceptance Criteria

The Pre-Review MVP is complete when all of the following work:

1. App launches into the Voice2Learn home screen.
2. The single Multiplication & Division lesson can be started by voice.
3. All five lesson scenes render with the required visuals and narration.
4. `next`, `back`, and `repeat` work through speech.
5. A free-form question during a lesson is answered by Nemotron using current lesson/scene context.
6. The lesson can transition into a five-question quiz.
7. Each quiz question is generated by Nemotron one at a time.
8. Every question has four MCQ options and passes backend arithmetic validation.
9. A quiz option can be selected by voice.
10. Grading is deterministic.
11. Multiplication/division proficiency updates after each answer.
12. The next Nemotron question receives the updated learner context.
13. Results show score and updated proficiency.
14. The full normal flow requires no repeated physical interaction after initial microphone activation.
15. The application visually follows `DESIGN.md`.
16. No out-of-scope system was introduced.

## 15. Post-Review Baseline to Preserve

The five existing lesson scenes each include one authored, four-option understanding check, stored with the lesson JSON. Narration is followed by a short check question. A correct response is required before moving forward or starting the quiz; wrong responses receive a brief hint and may be retried without changing proficiency. Going backward and asking the contextual tutor remain available, and completed checks remain complete during the current lesson visit. Spoken answers use backend semantic intent classification with visible question/options; no frontend phrase matching. On scene 1, spoken Back returns Home. Help/repeat prompts describe the available actions without a new screen.

During the quiz, an expandable authored lesson recap is viewable and readable aloud by voice, while the current question and progress remain unchanged. Quiz answers remain hidden before submission; recap content is the public lesson narration only. Essential voice operations across screens include help, repetition, lesson navigation, check selection/retry, quiz recap open/close/read, answering, retry on load error, and results navigation. Invalid commands stay on the current screen with a friendly prompt.

TTS uses a configurable female neural speech voice through a small backend endpoint; if unavailable it displays text without switching to a browser/system voice. Spoken audio must pause STT and resume listening afterward, with cancellation on navigation. Neural TTS requires network availability; it must not download a local model or expose credentials. The original five-question Nemotron quiz, four screens, and proficiency rules remain unchanged.


## 16. Jev Architecture and Provider Boundary (planned)

### End-to-end flow

```text
Microphone → browser speech/silence detection → complete utterance
→ local Whisper → transcript + screen/state → /api/intent/classify
→ backend Jev Choice through Vercel AI Gateway → validated action JSON
  → navigation / repeat / help / checks / notes: application code
  → ask-question: ORIGINAL transcript + scene → Nemotron tutor → answer
  → select-option: deterministic backend quiz grading → learner JSON
→ female neural TTS (text-only recovery on failure) → automatic listening resume
```

Jev selects the specific action in one call. Do not first classify navigation versus learning and then make a second dependent model call to identify navigation. Navigation never needs Nemotron. Nemotron remains the tutor and one-at-a-time quiz generator through the NVIDIA-only boundary. Authored lesson checks remain deterministically compared in application code, without quiz proficiency writes; do not claim they are backend graded today.

### Provider integration

Use `backend/app/jev.py` with existing async `httpx`, typed Pydantic request/response models, and backend-only settings. Chosen transport: Vercel's TypeSafe-compatible HTTP API, not direct TypeSafe hosting. Configuration: `AI_GATEWAY_API_KEY`, `AI_GATEWAY_MODEL` default `typesafe-ai/jev`, `AI_GATEWAY_TIMEOUT_SECONDS` default 10, finite positive maximum 30. Base `https://ai-gateway.vercel.sh/typesafe`; POST `/v1/systemone`, optional diagnostic GET `/v1/models`; bearer Gateway key. Confirm official format at implementation time. No SDK, local Jev weight download, training, startup network call, or Gateway decision/model fallback is required. Missing keys fail only the requesting feature; basic content startup remains available.

Official provider references (checked 2026-10-20): [Vercel TypeSafe-compatible API](https://vercel.com/docs/ai-gateway/sdks-and-apis/typesafe), [Jev model](https://vercel.com/ai-gateway/models/jev), [TypeSafe Choice](https://docs.typesafe.ai/primitives/choice). Catalog listing does not establish key/team access. Verify a real decision before claiming live operation; echoed model aliases do not prove the resolved version.

### Decision validation and recovery

Validate the response envelope, selected offered choice, exact probability keys, finite 0..1 values, distribution sum with explicit tolerance, confidence bounds and selected/max-probability consistency. A tied/ambiguous maximum is uncertainty (unclear), not a reason to retry for a preferred decision. Optional Gateway metadata must be typed without requiring fields that may be omitted/null. Application code owns normalization, state validation and acceptance. Use named conservative provisional thresholds; evaluate navigation and selections separately, with stricter selection acceptance if justified. Jev confidence is not an accuracy guarantee.

- Valid low confidence or valid ambiguity: return `unclear`; no retry to force a choice.
- Invalid provider JSON/schema/distribution: retry once with rebuilt context, then friendly 502. Maximum two provider attempts per turn.
- Missing configuration, authentication/access failure, timeout, network or non-success response: friendly 502, no retry or fallback. Never expose raw bodies, keys, headers, prompts or traces to students.
- Keep provider integration isolated from `llm.py`, `nvidia.py`, tutor and quiz generation.
- Keep duplicate guards and stale-result guards. Discard intent responses if screen, scene, question, check completion, notes state, phase or confirmation state changed before execution. Recheck state before all side effects.
- Record classifier latency separately from VAD, Whisper, tutor, TTS and total turn latency. Do not promise a speedup before comparable measurements.

## 17. Lesson-Agnostic Voice Navigation Extensions (planned after core migration)

`USER_NAVIGATION.md` is a concise command list. This section owns semantics/contracts. The commands use the currently loaded lesson's actual scene IDs, titles, order and concepts; no hardcoded topic names, scene count, new curriculum or generalized lesson engine. Current MVP scope stays one lesson. Additional commands are not live until their planned passes are approved.

### Pass 10: destinations, resume, repetition and orientation

Add `restart-lesson`, `jump-scene`, `resume-lesson`, `return-scene`, `repeat-tutor-answer`, `read-position`, `read-progress`, and `repeat-results`. Reuse existing `home` and `help` names rather than adding synonyms as new actions.

- `home`: extend to Results; Quiz uses the confirmed-exit flow in Pass 11. Preserve proficiency.
- `restart-lesson`: Lesson; restart at first scene, clear checks for the new visit, preserve proficiency.
- `jump-scene`: Lesson; resolve an existing number/title/topic/beginning/end to one scene. For a forward jump, every intervening scene's check must be passed; otherwise explain the first blocking check. Backward jumps remain allowed. Jumping never marks checks complete or starts a quiz.
- `resume-lesson`: Home only with a saved in-session lesson position. Restore that visit's scene and check completions. Starting anew and Review Lesson reset visit checks. Resume survives leaving for Home, not browser reload; no persistence schema change in this scope.
- `return-scene`: Lesson after a direct jump; return to the saved pre-jump scene, subject to the same forward check gating. Store one previous jump origin, not browser-wide history.
- `repeat-tutor-answer`: Lesson only when an answer exists for this scene; replay it without a new LLM call. Do not confuse with scene narration.
- `read-position`: all screens; speak current screen and scene/question position as applicable.
- `read-progress`: Home/Results; read available proficiency. `repeat-results`: Results; repeat current score and encouragement. Do not fabricate missing results/history.

Pass 10 result schema: `{ "action": "jump-scene", "option": null, "target_scene_id": "scene-3" }`. Return null target for other actions; existing action/option rules remain. Jev offers one internal `jump:<scene_id>` choice per existing lesson destination and normalizes it to `jump-scene` plus target; no second model call or free-form invented destination. Unknown or ambiguous destinations return `unclear`; a known destination blocked by an incomplete check produces a gate explanation without movement. State additions: optional `resume_scene_id`, `resume_passed_scene_ids` on Home; `passed_scene_ids`, `return_scene_id`, `tutor_answer_available` on Lesson; validate IDs against authored data and avoid passing answer text. These are application-session context, not authenticated progress or permission proofs.

### Pass 11: pacing, feedback and exit

Add `pause`, `resume`, `continue-quiz`, `repeat-feedback`, `exit-quiz`, `confirm-exit`, `cancel-exit`. No new screens/endpoints are needed.

- Pause is accepted between speech turns on Lesson or an unanswered Quiz; preserve the task and keep listening for allowed resume/help/exit requests. It does not disable the microphone or enable barge-in. Do not claim an utterance during TTS can pause speech.
- While paused, resume returns to the underlying phase without selecting an answer or advancing. “Continue” maps to resume when paused, next on an unpaused lesson, and continue-quiz during graded quiz feedback.
- Replace automatic quiz advancement with a feedback phase that resumes listening. `continue-quiz` loads the next question or opens Results after the last grade. `repeat-feedback` replays the stored explanation without regrading or making an LLM call. Grading/proficiency writes still happen once at submission, before feedback.
- `exit-quiz` (including “Go home” on Quiz) enters spoken confirmation from stable answering/feedback/error/paused states, not during grading/loading. Confirm exits to Home and abandons the unfinished attempt without rolling back already persisted grades. Cancel restores the exact prior phase/question/notes state. Retake begins a fresh attempt; no saved quiz resume.
- Add request state `paused` and `exit_confirmation_pending` (quiz), default false; while confirming, offer confirm/cancel/help/unclear only. Snapshot the prior local state for cancel, prevent stale responses and duplicate actions. Backend validates combinations; app owns all state effects.
- Reuse `retry-question` for failed quiz generation. Generic “Try again” resolves only to a supported safe retry in the current error state; do not introduce automatic ambiguous tutor/grading retries or duplicate writes. Incorrect lesson checks simply accept another selection.

Commands unavailable in a state return `unclear` or a short boundary explanation. No quiz skipping, editing graded answers, hints that reveal answers, cross-chapter navigation, voice Reset Demo or mid-sentence interruption is added.
