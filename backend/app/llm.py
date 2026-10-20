"""NVIDIA-only Nemotron access behind the shared LLM boundary."""

from __future__ import annotations

import logging

from . import nvidia

log = logging.getLogger("voice2learn.llm")


class LLMError(RuntimeError):
    """Raised when NVIDIA cannot provide a Nemotron completion."""


class LLMTimeoutError(LLMError):
    """Raised when the NVIDIA request deadline is exceeded."""


async def chat_completion(messages: list[dict[str, str]]) -> str:
    try:
        return await nvidia.chat_completion(messages)
    except nvidia.NvidiaTimeoutError as exc:
        raise LLMTimeoutError("NVIDIA Nemotron timed out") from exc
    except nvidia.NvidiaError as exc:
        log.warning("NVIDIA Nemotron unavailable; see NVIDIA provider diagnostics")
        raise LLMError("NVIDIA Nemotron unavailable") from exc
