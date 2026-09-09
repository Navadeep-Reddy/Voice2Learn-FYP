# Voice2Learn — Design Language

**Scope:** Pre-Review MVP and the visual foundation for later Voice2Learn screens.

The supplied mockup is a **design-language reference**, not a content or feature reference.

Carry forward its playful learning aesthetic, spacious composition, tactile controls, strong microphone anchor, and gentle motion. Do not carry forward unrelated mockup features such as multiple subjects, streaks, XP, or random-test systems.

## 1. Design Character

Voice2Learn should feel:

- playful;
- bright;
- calm;
- tactile;
- encouraging;
- modern;
- clearly made for children;
- accessible without feeling clinical.

Avoid both extremes:

- not a corporate SaaS dashboard;
- not a noisy arcade game.

The visual hierarchy should remain simple enough that the child always knows what to look at and what the system is doing.

## 2. Core Principles

### One Primary Focus Per Screen

Each screen has one obvious focus:

- Home -> lesson card
- Lesson -> learning visual
- Quiz -> current question
- Results -> progress

Do not fill empty space just because it exists.

### Voice Is the Product Anchor

The microphone is persistent and visually important.

It should make the current voice state obvious:

- idle
- listening
- processing
- speaking
- error

### Tactile, Not Flat

Primary cards and buttons should feel pressable through:

- rounded corners;
- heavier bottom/right border;
- short press translation;
- restrained hover scale.

### Motion Supports Meaning

Animate:

- objects entering a lesson;
- groups being counted;
- apples being shared;
- equation transitions;
- listening state;
- correct/incorrect feedback.

Do not continuously animate important reading content.

## 3. Color Tokens

Use a small palette derived from the reference design.

| Token | Value | Use |
|---|---:|---|
| `canvas` | `#F7F9FB` | page background |
| `surface` | `#FFFFFF` | cards/panels |
| `surface-subtle` | `#F2F4F6` | soft secondary surfaces |
| `border` | `#E0E3E5` | neutral borders |
| `text` | `#191C1E` | primary text |
| `text-muted` | `#424754` | supporting text |
| `blue` | `#0057C2` | brand / primary action |
| `blue-bright` | `#0D6EF0` | active primary accents |
| `green` | `#60FE6C` | success / positive learning state |
| `green-dark` | `#00731D` | text/icons on green |
| `yellow` | `#FFE171` | voice/listening / warm highlight |
| `yellow-dark` | `#705D00` | text/icons on yellow |
| `red-soft` | `#FFDAD6` | incorrect/error background |
| `red` | `#BA1A1A` | error text/icon |

Rules:

- `canvas` should dominate the page.
- Most content cards remain white.
- Blue is the identity color.
- Green, yellow, and red are semantic accents, not full-screen washes.
- Do not use gradients unless a later explicit design pass adds them.
- No dark mode in the Pre-Review MVP.

## 4. Typography

Use **Quicksand** throughout.

Weights:

- `500` for body/supporting text
- `700` for headings, labels, buttons, important numbers

Recommended scale:

| Role | Desktop | Mobile |
|---|---:|---:|
| Hero | 48px / 1.1 / 700 | 32px / 1.2 / 700 |
| Screen title | 32px / 1.2 / 700 | 28px / 1.2 / 700 |
| Card title | 24px / 1.3 / 700 | 22px / 1.3 / 700 |
| Body large | 20px / 1.5 / 500 | 18px / 1.5 / 500 |
| Body | 16px / 1.5 / 500 | 16px / 1.5 / 500 |
| Label | 14px / 1.2 / 700 | 14px / 1.2 / 700 |

Keep student-facing sentences short.

Do not use all-caps for normal UI copy.

## 5. Spacing and Layout

Base spacing unit: `8px`.

Key values:

- mobile page margin: `20px`
- desktop page margin: `64px`
- normal grid gap: `24px`
- large content gap: `32px`
- minimum touch target: `48px`
- main content max width: approximately `1120px`

The layout should be airy.

Use large vertical gaps between major sections instead of adding separator lines everywhere.

Reserve sufficient bottom padding so the fixed microphone never covers content.

## 6. Shape Language

Use:

- cards: `12px` radius
- major buttons: `12px` radius
- pills: full radius
- icon containers: circles
- microphone: circle

Avoid sharp corners.

### Tactile Card Treatment

For prominent clickable cards/buttons:

- bottom border: approximately `6px`
- right border: approximately `4px`
- border color: darker or more neutral version of the surface
- transition: about `150ms ease-out`

Pressed:

- translate down about `4px`
- translate right about `2px`
- reduce heavy borders to approximately `2px`

This physical press language should be reused consistently.

## 7. Header

Keep the header minimal.

Left:

- `Voice2Learn` wordmark in blue using Quicksand 700.

Right:

- optional simple demo avatar/status element.

Do not add streaks, currency, achievements, menus, or settings for the Pre-Review.

Header background should visually merge with the canvas.

## 8. Decorative Background

Use a few large mathematical symbols at low opacity, such as:

- `×`
- `÷`
- `+`
- star
- simple calculator/math symbol

Rules:

- decorative only;
- pointer-events disabled;
- low opacity;
- never behind critical text at high contrast;
- only a handful on screen.

Motion:

- 6–8 second ease-in-out float;
- vertical travel around 15–20px;
- slight rotation;
- stagger animation delays.

These elements should make the screen feel alive without distracting from learning.

## 9. Persistent Microphone

The microphone is the strongest recurring component.

Placement:

- fixed bottom center;
- large circular control;
- label below or immediately adjacent;
- content must leave space for it.

Target size:

- roughly `72–80px` on desktop;
- never below the minimum accessible touch size.

### States

**Idle**
- yellow surface
- calm, no aggressive glow

**Listening**
- visible pulse/glow
- label: `Listening...`

**Processing**
- subtle animated ring or dots
- label: `Thinking...`

**Speaking**
- small waveform/ripple treatment
- label: `Speaking...`

**Error**
- red-soft treatment
- label: `Try again`

The microphone may scale slightly on hover and compress on press.

Do not use a rapid flashing animation.

## 10. Home Screen

The Pre-Review Home screen has only one main learning card.

Recommended hierarchy:

1. greeting
2. short encouraging line
3. Multiplication & Division card
4. small multiplication/division progress summary
5. persistent microphone

The lesson card should use:

- large colored circular math icon;
- title;
- one short subtitle;
- tactile card treatment.

Do not create placeholder cards for future topics.

## 11. Lesson Screen

This is the visual centerpiece of the Pre-Review.

Structure:

- compact header / lesson title
- `1 / 5` scene progress
- large central visual stage
- equation/explanation area
- short narration card
- fallback Back/Next buttons
- microphone anchor

### Lesson Visual Stage

The stage should feel more like an interactive children's learning canvas than a normal card.

Use:

- oversized objects;
- clear group boundaries;
- plenty of spacing;
- strong visual correspondence between objects and equations.

For the apples/groups lesson, the child should immediately see:

- how many groups exist;
- how many apples are in each group;
- how the equation maps to the visual.

### Tutor Answer

When the child asks a question:

- keep the lesson visible;
- show the tutor response as a friendly speech-bubble/panel;
- do not navigate to a separate chatbot screen;
- visually indicate that the lesson is paused;
- resume the same scene after the answer.

## 12. Quiz Screen

The quiz should be simple and confident.

Structure:

- question count
- large question card
- four large answer cards
- microphone

Desktop:

- options may use a 2 × 2 grid.

Mobile:

- stack vertically.

Each option should show a strong A/B/C/D label.

### Answer Feedback

Correct:

- selected option briefly shifts to green;
- small celebratory motion;
- encouraging line such as `Nice work!`

Incorrect:

- selected option shifts to red-soft;
- correct answer may be shown in green;
- explanation remains short and readable.

Feedback animation should finish quickly. Do not create long celebration sequences.

## 13. Results Screen

Show:

- large `X / 5` result;
- multiplication progress bar;
- division progress bar;
- one short encouraging summary;
- `Review Lesson`;
- `Take Quiz Again`.

Progress bars:

- rounded;
- visually thick enough for children;
- percentage label visible;
- use blue/green rather than dashboard-like charts.

Do not add charts, historical analytics, streaks, or badges.

## 14. Motion Language

### Timing

- button/card press: `120–180ms`
- hover scale: `150–200ms`
- scene transition: `300–500ms`
- object/group reveal: `250–450ms`
- stagger between repeated objects: `80–120ms`
- success burst: under `900ms`
- background float: `6–8s`

### Feel

Motion should be:

- soft;
- springy;
- readable;
- purposeful.

Avoid:

- large bouncing layouts;
- rapid spinning;
- constant confetti;
- animation that delays the next action.

Honor `prefers-reduced-motion` by removing non-essential motion and keeping the final visual state.

## 15. Accessibility

Even though voice is primary:

- every action must also have a visible fallback control;
- touch targets should be at least 48px;
- maintain good text/background contrast;
- do not communicate correctness through color alone;
- show text labels for microphone state;
- keep focus states visible;
- keep reading order logical;
- avoid tiny helper text;
- avoid dense menus.

The design should feel inclusive by being simple and forgiving, not by looking medical or institutional.

## 16. Responsive Rules

At narrow widths:

- reduce outer margin;
- stack content;
- keep the microphone unobstructed;
- keep lesson visuals large enough to understand;
- stack quiz options;
- keep body text at least 16px.

At wider widths:

- expand whitespace;
- use wider learning stages;
- allow 2 × 2 quiz options;
- do not stretch text lines excessively.

## 17. Do / Do Not

### Do

- use the supplied playful tactile language consistently;
- prioritize the lesson visual over decorative UI;
- use bold friendly typography;
- make listening state obvious;
- keep screens spacious;
- use simple math-themed background motion;
- make success feel rewarding but brief.

### Do Not

- recreate unrelated mockup content;
- add multiple topic cards;
- add streaks, XP, coins, badges, leaderboards, or stores;
- create a generic dashboard;
- use thin corporate UI;
- overuse shadows;
- use neon gradients;
- pack the screen with controls;
- let decorative animation compete with lesson content.
