# Voice2Learn — Pre-Review MVP Specification

**Status:** Implementation source of truth
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
- Voice navigation
- Contextual lesson Q&A with Nemotron
- Local Whisper STT
- Browser speech synthesis for TTS
- Five-question quiz
- One Nemotron-generated MCQ at a time
- Deterministic quiz grading
- Two proficiency values:
  - multiplication
  - division
- Local JSON persistence
- Results/progress screen

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
- Tutor + question generation: Nemotron (`nvidia/nemotron-3-super-120b-a12b:free`) through OpenRouter
- TTS: browser `speechSynthesis`

The frontend must never call OpenRouter directly.

## 5. Screens

The MVP has four primary screens.

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
- anything else non-empty -> `unclear` (stay on Home and ask the child to repeat)

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
- `repeat` (repeat the current scene narration)
- `start-quiz` (spoken as `start quiz` / `quiz me`), allowed only on the final scene
- free-form lesson question -> `ask-question`
- anything else non-empty that is neither navigation nor a lesson question -> `unclear`

On the final scene, show a `Start Quiz` fallback button and prompt the child to say `start quiz`.

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
- anything else non-empty -> `unclear`

Click/tap on an option is a fallback.

Generate the next question only after the previous answer has been graded and learner state has been updated.

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
- anything else non-empty -> `unclear` (stay on Results and ask the child to repeat)

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

- TTS speaks lesson/tutor/quiz content.
- STT pauses while TTS is speaking.
- Listening resumes after speech ends.
- Repeated physical interaction should not be required.

True barge-in while the system is speaking is not required.

### 7.3 Semantic Intent Classification

Every non-empty STT transcript must be sent to `POST /api/intent/classify` for backend Nemotron semantic, screen-aware intent classification through OpenRouter. Frontend exact phrase matching must not decide voice actions.

The classifier maps imperfect STT semantically to only actions allowed on the current screen:

- home: `start-lesson`, `unclear`
- lesson: `next`, `back`, `repeat`, `start-quiz` (final scene only), `ask-question`, `unclear` (spoken `continue` maps semantically to `next`, never a separate action)
- quiz: `select-option` with `option` A/B/C/D, `repeat-question`, `unclear`
- results: `review-lesson`, `retake-quiz`, `unclear`

When the action is `ask-question`, the frontend calls the existing tutor endpoint (`POST /api/tutor/ask`) with the original transcript. The classifier response never sends or rewrites lesson question content.

Quiz classification may receive only the visible sanitized question and options (`quiz_question`, `quiz_options`); it must never receive the hidden correct answer or explanation.

Empty transcripts and silence are not sent to the LLM. The app resumes listening silently without showing an error.

Validate classifier output strictly with Pydantic. On invalid model output, retry once, then return a friendly recoverable error that keeps the child on the current screen.

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

Before each Nemotron call, including every intent-classifier provider attempt, overwrite a generated runtime file at:

`backend/data/context.md`

`learner_state.json` and `lesson.json` remain the sources of truth. `context.md` is generated context for Nemotron and must never be edited manually.

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

Classifies every non-empty STT transcript semantically with Nemotron through OpenRouter, using the current screen/context.

Input:

```json
{
  "transcript": "go next please",
  "screen": "lesson",
  "scene_id": "scene-2",
  "quiz_question": null,
  "quiz_options": null
}
```

- `transcript` (string, required): the raw non-empty STT text.
- `screen` (string, required): `home`, `lesson`, `quiz`, or `results`.
- `scene_id` (string or null): current lesson scene when `screen` is `lesson`.
- `quiz_question` / `quiz_options` (present only when `screen` is `quiz`): the visible sanitized question text and options. Never send the hidden correct answer or explanation.

Output:

```json
{
  "action": "next",
  "option": null
}
```

- `action` is restricted to the actions allowed on the given `screen` (see Section 7.3).
- `option` carries `A`, `B`, `C`, or `D` only when the action is `select-option`; otherwise null.
- The response never carries lesson question content; when the action is `ask-question`, the frontend sends the original transcript to `POST /api/tutor/ask`.

Validate strictly with Pydantic, retry once on invalid model output, then return a friendly recoverable error.

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

Restores the demo learner to the initial state.

## 13. Error Behavior

The demo must fail gracefully.

Examples:

- Whisper cannot transcribe -> show `I didn't catch that. Try again.`
- command is unclear -> stay on the current screen and ask the child to repeat
- OpenRouter error -> show `My helper is having trouble right now. Try again.`
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
