"""Pydantic contracts. Mirror packages/shared's Zod schemas — keep in sync."""

from typing import Literal

from pydantic import BaseModel, Field

DataCategory = Literal[
    "BASIC_PERSONAL",
    "CONTACT",
    "IDENTIFIERS",
    "FINANCIAL",
    "LOCATION",
    "BEHAVIOURAL",
    "COMMUNICATIONS",
    "EMPLOYMENT",
    "EDUCATION",
    "IMAGES_AV",
    "ONLINE_ACTIVITY",
    "HEALTH",
    "GENETIC",
    "BIOMETRIC",
    "RACIAL_ETHNIC",
    "POLITICAL_OPINIONS",
    "RELIGIOUS_BELIEFS",
    "TRADE_UNION",
    "SEX_LIFE_ORIENTATION",
    "CRIMINAL_CONVICTIONS",
    "CHILDREN",
]

SPECIAL_CATEGORIES: set[str] = {
    "HEALTH",
    "GENETIC",
    "BIOMETRIC",
    "RACIAL_ETHNIC",
    "POLITICAL_OPINIONS",
    "RELIGIOUS_BELIEFS",
    "TRADE_UNION",
    "SEX_LIFE_ORIENTATION",
}


class DetectedCategory(BaseModel):
    category: DataCategory
    confidence: float = Field(ge=0, le=1)
    rationale: str


class ScreeningCriterion(BaseModel):
    key: str
    label: str
    met: bool
    rationale: str
    source: str


class ClassificationResult(BaseModel):
    categories: list[DetectedCategory]
    special_category: bool = Field(alias="specialCategory")
    children_data: bool = Field(alias="childrenData")
    criminal_offence_data: bool = Field(alias="criminalOffenceData")
    ai_processing: bool = Field(alias="aiProcessing")
    automated_decision_making: bool = Field(alias="automatedDecisionMaking")
    large_scale: bool = Field(alias="largeScale")
    international_transfers: bool = Field(alias="internationalTransfers")
    screening: list[ScreeningCriterion]
    dpia_required: Literal["REQUIRED", "RECOMMENDED", "NOT_REQUIRED"] = Field(alias="dpiaRequired")
    dpia_rationale: str = Field(alias="dpiaRationale")
    suggested_answers: dict | None = Field(default=None, alias="suggestedAnswers")
    model: str | None = None

    # populate_by_name lets construction use either the Python snake_case
    # name or the camelCase alias (the LLM emits camelCase JSON keys).
    model_config = {"populate_by_name": True}


class ClassifyRequest(BaseModel):
    description: str
    context: dict | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    context: dict | None = None


class ChatResponse(BaseModel):
    reply: str
    model: str
    usage: dict[str, int] | None = None


class ImproveRequest(BaseModel):
    question: str
    draft: str
    context: dict | None = None


class ImproveResponse(BaseModel):
    improved: str
    issues: list[str]
    model: str


class SummariseRequest(BaseModel):
    dpia: dict


class SummariseResponse(BaseModel):
    summary: str
    model: str
