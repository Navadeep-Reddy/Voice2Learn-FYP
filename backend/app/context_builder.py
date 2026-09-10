"""Context builder for Nemotron calls.

Reads learner state, lesson JSON, current scene, recent attempts, and the
child question, then overwrites ``backend/data/context.md`` before each
provider call. ``lesson.json`` and ``learner_state.json`` stay the sources
of truth; ``context.md`` is generated runtime context only.
"""

from __future__ import annotations

from pathlib import Path

from .models import LearnerState, Lesson, Scene

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
CONTEXT_PATH = DATA_DIR / "context.md"


def build_tutor_context(
    lesson: Lesson,
    learner: LearnerState,
    scene: Scene,
    scene_index: int,
    question: str,
) -> str:
    concepts = [s.concept for s in lesson.scenes[: scene_index + 1] if s.concept]
    lines = [
        "# Voice2Learn Tutor Context",
        "",
        f"Student: {learner.student_name}",
        f"Chapter: {lesson.chapter}",
        f"Lesson: {lesson.title}",
        "",
        "## Current scene",
        f"- Scene ID: {scene.id}",
        f"- Title: {scene.title}",
        f"- Concept: {scene.concept}",
        f"- Narration: {scene.narration}",
        f"- Visual: {scene.visual_description}",
        "",
        "## Concepts taught through this scene",
    ]
    if concepts:
        lines.extend(f"- {concept}" for concept in concepts)
    else:
        lines.append("- (none yet)")
    lines.extend(
        [
            "",
            "## Proficiency",
            f"- multiplication: {learner.proficiency.multiplication}",
            f"- division: {learner.proficiency.division}",
            "",
            "## Recent attempts",
        ]
    )
    if learner.recent_attempts:
        for attempt in learner.recent_attempts[-10:]:
            lines.append(
                f"- {attempt.skill}: {attempt.question} "
                f"(correct: {attempt.correct})"
            )
    else:
        lines.append("- (none yet)")
    lines.extend(
        [
            "",
            "## Child question",
            question.strip(),
        ]
    )
    return "\n".join(lines) + "\n"


def write_context(content: str) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with CONTEXT_PATH.open("w", encoding="utf-8") as handle:
        handle.write(content)
    return CONTEXT_PATH


def rebuild_tutor_context(
    lesson: Lesson,
    learner: LearnerState,
    scene: Scene,
    scene_index: int,
    question: str,
) -> str:
    content = build_tutor_context(lesson, learner, scene, scene_index, question)
    write_context(content)
    return content


def build_quiz_context(lesson: Lesson, learner: LearnerState) -> str:
    concepts = [s.concept for s in lesson.scenes if s.concept]
    final_scene = lesson.scenes[-1] if lesson.scenes else None
    lines = [
        "# Voice2Learn Quiz Context",
        "",
        f"Student: {learner.student_name}",
        f"Chapter: {lesson.chapter}",
        f"Lesson: {lesson.title}",
        "",
        "## Current task",
        "Quiz generation: generate exactly one multiple-choice question for "
        "this lesson. Prefer the skill or concept the learner needs more "
        "practice with, based on proficiency and recent attempts below.",
        "",
        "## Completed lesson (final scene)",
    ]
    if final_scene is not None:
        lines.extend(
            [
                f"- Scene ID: {final_scene.id}",
                f"- Title: {final_scene.title}",
                f"- Narration: {final_scene.narration}",
                f"- Visual: {final_scene.visual_description}",
            ]
        )
    else:
        lines.append("- (no scenes)")
    lines.append("")
    lines.append("## Concepts taught in this lesson")
    if concepts:
        lines.extend(f"- {concept}" for concept in concepts)
    else:
        lines.append("- (none yet)")
    lines.extend(
        [
            "",
            "## Proficiency",
            f"- multiplication: {learner.proficiency.multiplication}",
            f"- division: {learner.proficiency.division}",
            "",
            "## Recent attempts and questions",
        ]
    )
    if learner.recent_attempts:
        for attempt in learner.recent_attempts[-10:]:
            lines.append(
                f"- {attempt.skill}: {attempt.question} "
                f"(correct: {attempt.correct})"
            )
    else:
        lines.append("- (none yet)")
    return "\n".join(lines) + "\n"


def rebuild_quiz_context(lesson: Lesson, learner: LearnerState) -> str:
    content = build_quiz_context(lesson, learner)
    write_context(content)
    return content


def build_intent_context(
    lesson: Lesson,
    learner: LearnerState,
    transcript: str,
    screen: str,
    allowed_actions: list[str],
    scene: Scene | None = None,
    scene_index: int | None = None,
    is_final_scene: bool | None = None,
    quiz_question: str | None = None,
    quiz_options: list[dict[str, str]] | None = None,
) -> str:
    """Build screen-aware intent-classification context (visible data only)."""
    lines = [
        "# Voice2Learn Intent Context",
        "",
        f"Student: {learner.student_name}",
        f"Chapter: {lesson.chapter}",
        f"Lesson: {lesson.title}",
        "",
        "## Current screen",
        f"- Screen: {screen}",
        f"- Allowed actions: {', '.join(allowed_actions)}",
        "",
        "## Proficiency",
        f"- multiplication: {learner.proficiency.multiplication}",
        f"- division: {learner.proficiency.division}",
        "",
    ]
    if scene is not None and scene_index is not None:
        concepts = [s.concept for s in lesson.scenes[: scene_index + 1] if s.concept]
        lines.extend(
            [
                "## Current lesson scene",
                f"- Scene ID: {scene.id}",
                f"- Title: {scene.title}",
                f"- Concept: {scene.concept}",
                f"- Narration: {scene.narration}",
                f"- Visual: {scene.visual_description}",
                f"- Scene position: {scene_index + 1} of {len(lesson.scenes)}",
                f"- Is final scene: {bool(is_final_scene)}",
                "",
                "## Concepts taught through this scene",
            ]
        )
        if concepts:
            lines.extend(f"- {concept}" for concept in concepts)
        else:
            lines.append("- (none yet)")
        lines.append("")
    if quiz_question is not None and quiz_options is not None:
        lines.extend(
            [
                "## Visible quiz question (sanitized; no answer included)",
                quiz_question.strip(),
                "",
                "## Visible options",
            ]
        )
        for option in quiz_options:
            lines.append(f"- {option['id']}: {option['text']}")
        lines.append("")
    lines.extend(
        [
            "## Child transcript (raw STT, may be imperfect)",
            transcript.strip(),
        ]
    )
    return "\n".join(lines) + "\n"


def rebuild_intent_context(
    lesson: Lesson,
    learner: LearnerState,
    transcript: str,
    screen: str,
    allowed_actions: list[str],
    scene: Scene | None = None,
    scene_index: int | None = None,
    is_final_scene: bool | None = None,
    quiz_question: str | None = None,
    quiz_options: list[dict[str, str]] | None = None,
) -> str:
    content = build_intent_context(
        lesson,
        learner,
        transcript,
        screen,
        allowed_actions,
        scene,
        scene_index,
        is_final_scene,
        quiz_question,
        quiz_options,
    )
    write_context(content)
    return content
