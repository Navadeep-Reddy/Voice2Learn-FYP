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
