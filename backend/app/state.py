"""Small safe JSON read/write/reset helper for learner state."""

from __future__ import annotations

import json
from pathlib import Path

from .models import LearnerState

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
LEARNER_STATE_PATH = DATA_DIR / "learner_state.json"

INITIAL_STATE = {
    "student_name": "Alex",
    "proficiency": {"multiplication": 50, "division": 50},
    "recent_attempts": [],
}


def read_learner_state() -> LearnerState:
    with LEARNER_STATE_PATH.open("r", encoding="utf-8") as handle:
        return LearnerState.model_validate(json.load(handle))


def write_learner_state(state: LearnerState) -> LearnerState:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with LEARNER_STATE_PATH.open("w", encoding="utf-8") as handle:
        json.dump(state.model_dump(), handle, indent=2)
        handle.write("\n")
    return state


def reset_learner_state() -> LearnerState:
    return write_learner_state(LearnerState.model_validate(INITIAL_STATE))
