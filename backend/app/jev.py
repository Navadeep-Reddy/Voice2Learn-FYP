"""Isolated Vercel AI Gateway TypeSafe Choice client for Jev."""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from typing import Literal

import httpx
from pydantic import (
    BaseModel,
    ConfigDict,
    StrictFloat,
    StrictInt,
    StrictStr,
    ValidationError,
    field_validator,
)

GATEWAY_URL = "https://ai-gateway.vercel.sh/typesafe/v1/systemone"
DEFAULT_MODEL = "typesafe-ai/jev"
DEFAULT_TIMEOUT_SECONDS = 10.0
MAX_TIMEOUT_SECONDS = 30.0


class JevError(Exception):
    """Safe error suitable for handling at the application boundary."""


class JevConfigurationError(JevError):
    pass


class JevTransportError(JevError):
    pass


class JevResponseError(JevError):
    pass


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class JevQuestion(_StrictModel):
    type: Literal["choice"] = "choice"
    instructions: str
    criteria: dict[str, str]

    @field_validator("instructions")
    @classmethod
    def nonblank_instructions(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("instructions must not be blank")
        return value

    @field_validator("criteria")
    @classmethod
    def valid_criteria(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) < 2 or any(not key.strip() or not desc.strip() for key, desc in value.items()):
            raise ValueError("at least two nonblank criteria are required")
        return value


class JevRequest(_StrictModel):
    model: str
    state: str
    questions: dict[str, JevQuestion]

    @field_validator("model", "state")
    @classmethod
    def nonblank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("value must not be blank")
        return value


class _Usage(BaseModel):
    model_config = ConfigDict(extra="allow")
    input_tokens: StrictInt | None = None
    output_tokens: StrictInt | None = None
    total_tokens: StrictInt | None = None


_MetadataCost = StrictStr | StrictInt | StrictFloat | None


class _RoutingMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")
    originalModelId: str | None = None
    resolvedProvider: str | None = None
    canonicalSlug: str | None = None
    finalProvider: str | None = None


class _GatewayMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")
    routing: _RoutingMetadata | None = None
    cost: _MetadataCost = None
    marketCost: _MetadataCost = None
    surchargeCost: _MetadataCost = None
    gatewayCost: _MetadataCost = None
    generationId: str | None = None


class _ProviderMetadata(BaseModel):
    model_config = ConfigDict(extra="allow")
    gateway: _GatewayMetadata | None = None


class _ChoiceAnswer(_StrictModel):
    type: Literal["choice"]
    choice: str
    confidence: StrictInt | StrictFloat
    probabilities: dict[str, StrictInt | StrictFloat]

    @field_validator("confidence")
    @classmethod
    def valid_confidence(cls, value: int | float) -> int | float:
        if isinstance(value, bool) or not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError("invalid confidence")
        return value


class _Response(BaseModel):
    model_config = ConfigDict(extra="allow")
    model: str
    answers: dict[str, _ChoiceAnswer]
    usage: _Usage | None = None
    provider_metadata: _ProviderMetadata | None = None

    @field_validator("model")
    @classmethod
    def nonblank_model(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("model must not be blank")
        return value


@dataclass(frozen=True)
class JevChoiceResult:
    choice: str
    confidence: float
    probabilities: dict[str, float]
    model: str
    ambiguous: bool
    usage: _Usage | None = None
    provider_metadata: _ProviderMetadata | None = None


def _configuration() -> tuple[str, str, float]:
    key = os.environ.get("AI_GATEWAY_API_KEY", "").strip()
    if not key:
        raise JevConfigurationError("Jev configuration is unavailable.")
    model = os.environ.get("AI_GATEWAY_MODEL", "").strip() or DEFAULT_MODEL
    raw_timeout = os.environ.get("AI_GATEWAY_TIMEOUT_SECONDS", "").strip()
    if not raw_timeout:
        timeout = DEFAULT_TIMEOUT_SECONDS
    else:
        try:
            timeout = float(raw_timeout)
        except (TypeError, ValueError):
            raise JevConfigurationError("Jev timeout configuration is invalid.") from None
    if not math.isfinite(timeout) or not 0 < timeout <= MAX_TIMEOUT_SECONDS:
        raise JevConfigurationError("Jev timeout configuration is invalid.")
    return key, model, timeout


def _validate_input(
    model: str, state: str, instructions: str, criteria: dict[str, str], question_id: str
) -> JevRequest:
    try:
        if not isinstance(question_id, str) or not question_id.strip():
            raise ValueError
        return JevRequest(
            model=model,
            state=state,
            questions={question_id: JevQuestion(instructions=instructions, criteria=criteria)},
        )
    except (ValidationError, TypeError, ValueError):
        raise JevConfigurationError("Jev request is invalid.") from None


def _parse_response(response: httpx.Response, question_id: str, criteria: dict[str, str]) -> JevChoiceResult:
    try:
        payload = response.json()
        parsed = _Response.model_validate(payload)
        answer = parsed.answers[question_id]
        probabilities = answer.probabilities
        if set(probabilities) != set(criteria):
            raise ValueError
        for value in probabilities.values():
            if isinstance(value, bool) or not math.isfinite(value) or not 0 <= value <= 1:
                raise ValueError
        if abs(sum(probabilities.values()) - 1.0) > 1e-6 or answer.choice not in criteria:
            raise ValueError
        maximum = max(probabilities.values())
        if probabilities[answer.choice] != maximum:
            raise ValueError
        return JevChoiceResult(
            choice=answer.choice,
            confidence=float(answer.confidence),
            probabilities={key: float(value) for key, value in probabilities.items()},
            model=parsed.model,
            ambiguous=sum(value == maximum for value in probabilities.values()) > 1,
            usage=parsed.usage,
            provider_metadata=parsed.provider_metadata,
        )
    except (ValueError, TypeError, KeyError, OverflowError, ValidationError):
        raise JevResponseError("Jev returned an invalid response.") from None


async def choose(
    *,
    state: str,
    instructions: str,
    criteria: dict[str, str],
    question_id: str = "intent",
    client: httpx.AsyncClient | None = None,
) -> JevChoiceResult:
    """Ask Jev one Choice question. Injected clients remain caller-owned."""
    key, model, timeout = _configuration()
    request = _validate_input(model, state, instructions, criteria, question_id)
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    owned = client is None
    if owned:
        async with httpx.AsyncClient(timeout=httpx.Timeout(timeout)) as owned_client:
            return await _send(owned_client, headers, request, timeout, question_id, criteria)
    return await _send(client, headers, request, timeout, question_id, criteria)


async def _send(
    client: httpx.AsyncClient,
    headers: dict[str, str],
    request: JevRequest,
    timeout: float,
    question_id: str,
    criteria: dict[str, str],
) -> JevChoiceResult:
    try:
        response = await client.post(GATEWAY_URL, headers=headers, json=request.model_dump(), timeout=timeout)
    except (httpx.HTTPError, OSError):
        raise JevTransportError("Jev request failed.") from None
    if not 200 <= response.status_code < 300:
        raise JevTransportError("Jev service is unavailable.")
    return _parse_response(response, question_id, criteria)
