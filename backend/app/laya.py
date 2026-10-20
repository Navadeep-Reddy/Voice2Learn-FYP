"""Offline local boundary for Laya Typed-Decisions."""

from __future__ import annotations

import asyncio
import math
import os
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Any

MODEL_ID = "convaiinnovations/laya-typed-decisions"
MODEL_REVISION = "e929ae5cf69bc34259cd2f95c9e91145b818b1f0"
_DEFAULT_MODEL_DIR = Path(__file__).resolve().parents[1] / "models" / "laya-typed-decisions"
_REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
_load_lock = threading.Lock()
_predict_lock = threading.Lock()
_agent: Any | None = None
_loaded_device: str | None = None


class LayaError(Exception):
    """Sanitized error suitable for the application boundary."""


class LayaConfigurationError(LayaError):
    pass


class LayaLoadError(LayaError):
    pass


class LayaInferenceError(LayaError):
    pass


class LayaOutputError(LayaError):
    pass


@dataclass(frozen=True)
class LayaChoiceResult:
    choice: str
    confidence: float
    probabilities: dict[str, float]
    ambiguous: bool
    device: str
    model: str = MODEL_ID
    revision: str = MODEL_REVISION


def _model_path() -> Path:
    configured = os.environ.get("VOICE2LEARN_LAYA_MODEL_DIR", "").strip()
    if not configured:
        return _DEFAULT_MODEL_DIR
    path = Path(configured).expanduser()
    return path if path.is_absolute() else _REPOSITORY_ROOT / path


def _available_devices(torch: Any) -> set[str]:
    available = {"cpu"}
    if torch.cuda.is_available():
        available.add("cuda")
    mps = getattr(getattr(torch, "backends", None), "mps", None)
    if mps is not None and mps.is_available():
        available.add("mps")
    return available


def _select_device(requested: str | None, torch: Any) -> str:
    value = (requested or "auto").strip().lower()
    if value not in {"auto", "cuda", "mps", "cpu"}:
        raise LayaConfigurationError("Laya device configuration is invalid.")
    available = _available_devices(torch)
    if value == "auto":
        return next(device for device in ("cuda", "mps", "cpu") if device in available)
    if value not in available:
        raise LayaConfigurationError("Configured Laya device is unavailable.")
    return value


def _device_candidates(requested: str | None, torch: Any) -> list[str]:
    value = (requested or "auto").strip().lower()
    if value != "auto":
        return [_select_device(value, torch)]
    available = _available_devices(torch)
    return [device for device in ("cuda", "mps", "cpu") if device in available]


def _device_name(device: Any) -> str:
    text = str(device).lower()
    return text.split(":", 1)[0]


def _load_agent() -> tuple[Any, str]:
    global _agent, _loaded_device
    with _load_lock:
        if _agent is not None:
            return _agent, _loaded_device or "cpu"
        path = _model_path()
        if not path.is_dir() or not all((path / item).is_file() for item in (
            "config.json", "rl_agent_config.json", "model.safetensors",
            "encoder/config.json", "tokenizer/tokenizer.json", "tokenizer/tokenizer_config.json",
        )):
            raise LayaConfigurationError("The local Laya model is missing or incomplete.")
        os.environ["USE_TF"] = "0"
        os.environ["HF_HUB_OFFLINE"] = "1"
        os.environ["TRANSFORMERS_OFFLINE"] = "1"
        try:
            import torch
            import laya

            requested = os.environ.get("VOICE2LEARN_LAYA_DEVICE", "auto")
            candidates = _device_candidates(requested, torch)
            auto = (requested or "auto").strip().lower() == "auto"
            for selected in candidates:
                try:
                    candidate = laya.load(str(path), device=selected)
                except Exception:
                    if auto:
                        continue
                    raise LayaLoadError("The local Laya model could not be loaded.") from None
                actual = _device_name(candidate.device)
                if actual == selected:
                    agent = candidate
                    break
                if auto:
                    selected_index = candidates.index(selected)
                    actual_index = candidates.index(actual) if actual in candidates else -1
                    if actual_index == selected_index + 1:
                        agent = candidate
                        selected = actual
                        break
                    continue
                raise LayaLoadError("Laya loaded on a different device than requested.")
            else:
                raise LayaLoadError("The local Laya model could not be loaded.")
            actual = _device_name(agent.device)
        except LayaError:
            raise
        except Exception:
            raise LayaLoadError("The local Laya model could not be loaded.") from None
        _agent, _loaded_device = agent, actual
        return agent, actual


def _validate_input(state: str, instructions: str, criteria: dict[str, str], question_id: str) -> None:
    if not isinstance(state, str) or not state.strip():
        raise LayaConfigurationError("Laya request is invalid.")
    if not isinstance(instructions, str) or not instructions.strip():
        raise LayaConfigurationError("Laya request is invalid.")
    if not isinstance(question_id, str) or not question_id.strip():
        raise LayaConfigurationError("Laya request is invalid.")
    if not isinstance(criteria, dict) or not 2 <= len(criteria) <= 19:
        raise LayaConfigurationError("Laya request is invalid.")
    if any(not isinstance(key, str) or not key.strip() or not isinstance(value, str) or not value.strip()
           for key, value in criteria.items()):
        raise LayaConfigurationError("Laya request is invalid.")


def _result(output: Any, question_id: str, criteria: dict[str, str], device: str) -> LayaChoiceResult:
    try:
        answer = output["answers"][question_id]
        choice = answer["choice"]
        confidence = answer["confidence"]
        raw_probs = answer["probabilities"]
        if not isinstance(choice, str) or choice not in criteria or not isinstance(raw_probs, dict):
            raise ValueError
        if set(raw_probs) != set(criteria):
            raise ValueError
        for value in raw_probs.values():
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
                raise ValueError
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not math.isfinite(confidence) or not 0 <= confidence <= 1:
            raise ValueError
        probabilities = {key: float(value) for key, value in raw_probs.items()}
        maximum = max(probabilities.values())
        # Laya returns probabilities rounded to four decimal places.
        if abs(sum(probabilities.values()) - 1.0) > 1e-3 or probabilities[choice] != maximum:
            raise ValueError
        return LayaChoiceResult(choice, float(confidence), probabilities,
                                sum(value == maximum for value in probabilities.values()) > 1, device)
    except (KeyError, TypeError, ValueError, OverflowError):
        raise LayaOutputError("Laya returned an invalid decision.") from None


def _predict(state: str, instructions: str, criteria: dict[str, str], question_id: str) -> LayaChoiceResult:
    agent, device = _load_agent()
    try:
        with _predict_lock:
            output = agent.predict(state, {question_id: {
                "type": "choice", "instructions": instructions, "criteria": criteria,
            }})
    except Exception:
        raise LayaInferenceError("Laya decision failed.") from None
    return _result(output, question_id, criteria, device)


async def choose(*, state: str, instructions: str, criteria: dict[str, str], question_id: str = "intent") -> LayaChoiceResult:
    """Make one local typed Choice; no network, retry, or provider fallback."""
    _validate_input(state, instructions, criteria, question_id)
    return await asyncio.to_thread(_predict, state, instructions, criteria, question_id)
