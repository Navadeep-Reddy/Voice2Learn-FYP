"""NVIDIA-primary Nemotron access with one OpenRouter fallback."""

from __future__ import annotations

import logging

from . import nvidia, openrouter

log = logging.getLogger("voice2learn.llm")


class LLMError(RuntimeError):
    """Raised when neither configured Nemotron provider succeeds."""


async def chat_completion(messages: list[dict[str, str]]) -> str:
    try:
        return await nvidia.chat_completion(messages)
    except nvidia.NvidiaError:
        log.warning("NVIDIA provider failed; attempting OpenRouter fallback")

    try:
        return await openrouter.chat_completion(messages)
    except Exception as exc:  # noqa: BLE001 - provider details stay internal
        log.warning("OpenRouter fallback failed")
        raise LLMError("Nemotron providers unavailable") from exc
