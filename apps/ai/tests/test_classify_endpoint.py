import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.providers.base import LLMResponse
from app.providers.factory import get_provider

MOCK_CLASSIFICATION = {
    "categories": [
        {"category": "HEALTH", "confidence": 0.95, "rationale": "processes patient health records"}
    ],
    "specialCategory": True,
    "childrenData": False,
    "criminalOffenceData": False,
    "aiProcessing": True,
    "automatedDecisionMaking": False,
    "largeScale": True,
    "internationalTransfers": False,
    "screening": [
        {
            "key": "special_category_large_scale",
            "label": "Large-scale special category processing",
            "met": True,
            "rationale": "Health data at scale",
            "source": "UK GDPR Art. 35(3)(b)",
        }
    ],
    "dpiaRequired": "REQUIRED",
    "dpiaRationale": "Large-scale special category health data processing triggers Art. 35(3)(b).",
    "suggestedAnswers": {"data_categories": ["HEALTH"], "uses_ai": True},
}


@pytest.fixture
def client():
    mock_provider = AsyncMock()
    mock_provider.complete.return_value = LLMResponse(
        text=json.dumps(MOCK_CLASSIFICATION),
        model="claude-opus-4-8",
        usage={"inputTokens": 100, "outputTokens": 200},
    )
    app.dependency_overrides[get_provider] = lambda: mock_provider
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_classify_returns_dpia_required(client: TestClient):
    res = client.post(
        "/v1/classify",
        json={"description": "AI chatbot triaging patients using health records at NHS scale"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["dpiaRequired"] == "REQUIRED"
    assert body["specialCategory"] is True
    assert body["model"] == "claude-opus-4-8"
    assert body["categories"][0]["category"] == "HEALTH"


def test_classify_strips_markdown_fences(client: TestClient):
    mock_provider = AsyncMock()
    mock_provider.complete.return_value = LLMResponse(
        text=f"```json\n{json.dumps(MOCK_CLASSIFICATION)}\n```",
        model="claude-opus-4-8",
    )
    app.dependency_overrides[get_provider] = lambda: mock_provider
    client.app.dependency_overrides[get_provider] = lambda: mock_provider
    res = client.post(
        "/v1/classify", json={"description": "test description of a processing activity"}
    )
    assert res.status_code == 200
    assert res.json()["dpiaRequired"] == "REQUIRED"


def test_classify_refusal_returns_422(client: TestClient):
    mock_provider = AsyncMock()
    mock_provider.complete.return_value = LLMResponse(
        text="", model="claude-opus-4-8", refused=True
    )
    client.app.dependency_overrides[get_provider] = lambda: mock_provider
    res = client.post(
        "/v1/classify", json={"description": "test description of a processing activity"}
    )
    assert res.status_code == 422


def test_health_endpoint():
    with TestClient(app) as c:
        res = c.get("/health")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"
