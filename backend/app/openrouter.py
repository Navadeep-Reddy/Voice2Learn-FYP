"""Isolated OpenRouter provider client for the Pre-Review MVP.

All OpenRouter specifics live here. Callers pass plain chat messages and
receive the assistant text content back.
"""

from __future__ import annotations

import logging
import os
from http import HTTPStatus

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b:free"
log = logging.getLogger("voice2learn.openrouter")


class OpenRouterError(RuntimeError):
    """Raised for missing config, transport failure, or bad provider payload."""


def get_model() -> str:
    configured = os.environ.get("OPENROUTER_MODEL", DEFAULT_MODEL)
    model = (configured or DEFAULT_MODEL).strip()
    return model or DEFAULT_MODEL


def get_api_key() -> str:
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        log.warning("OpenRouter configuration error: OPENROUTER_API_KEY is missing")
        raise OpenRouterError("missing api key")
    return key


async def chat_completion(messages: list[dict[str, str]]) -> str:
    """POST one chat request and return the assistant text content."""
    api_key = get_api_key()
    model = get_model()
    payload = {
        "model": model,
        "messages": messages,
        "reasoning": {"enabled": True},
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OPENROUTER_URL, json=payload, headers=headers)
    except Exception as exc:
        log.warning("OpenRouter transport failure (%s)", type(exc).__name__)
        raise OpenRouterError("provider request failed") from exc
    if response.status_code >= 400:
        try:
            reason = HTTPStatus(response.status_code).phrase
        except ValueError:
            reason = "Unknown status"
        log.warning("OpenRouter request rejected (HTTP %s: %s)", response.status_code, reason)
        raise OpenRouterError("provider request failed")
    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]
    except Exception as exc:
        log.warning("OpenRouter response invalid: missing or malformed completion (%s)", type(exc).__name__)
        raise OpenRouterError("provider response invalid") from exc
    if not isinstance(content, str) or not content.strip():
        log.warning("OpenRouter response invalid: completion content is empty or not text")
        raise OpenRouterError("provider response invalid")
    return content
