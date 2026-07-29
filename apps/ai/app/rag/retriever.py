"""
Retrieval-augmented generation over curated UK GDPR / ICO guidance.

BM25 keyword ranking — pure Python, zero extra infra, deterministic, and
strong on regulatory text where terminology is distinctive ("special
category", "large scale", "DPIA").
"""

import json
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Protocol

from rank_bm25 import BM25Okapi

DOCS_PATH = Path(__file__).parent / "documents" / "uk_gdpr_guidance.json"


@dataclass
class Chunk:
    id: str
    source: str
    title: str
    text: str
    score: float = 0.0


_STOPWORDS = {
    "the",
    "a",
    "an",
    "to",
    "of",
    "and",
    "or",
    "in",
    "on",
    "for",
    "is",
    "are",
    "our",
    "we",
}


def _stem(word: str) -> str:
    """Minimal suffix stripping so morphological variants match ("transferring" ~
    "transfer", "processors" ~ "processing"). Not a real stemmer — good enough
    for BM25 recall over a small, terminology-dense corpus."""
    for suffix in ("ational", "ization", "fulness", "ousness", "iveness", "ing", "ed", "es", "s"):
        if len(word) > len(suffix) + 3 and word.endswith(suffix):
            stem = word[: -len(suffix)]
            # Collapse a doubled final consonant left by the suffix strip,
            # e.g. "transferring" -> "transferr" -> "transfer".
            if (
                suffix in ("ing", "ed")
                and len(stem) > 3
                and stem[-1] == stem[-2]
                and stem[-1] not in "aeiou"
            ):
                stem = stem[:-1]
            return stem
    return word


def _tokenize(text: str) -> list[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    return [_stem(w) for w in words if w not in _STOPWORDS]


class Retriever(Protocol):
    def search(self, query: str, k: int = 4) -> list[Chunk]: ...


class BM25Retriever:
    def __init__(self, docs_path: Path = DOCS_PATH):
        raw = json.loads(docs_path.read_text())
        self._chunks = [
            Chunk(id=d["id"], source=d["source"], title=d["title"], text=d["text"]) for d in raw
        ]
        corpus = [_tokenize(f"{c.title} {c.text}") for c in self._chunks]
        self._bm25 = BM25Okapi(corpus)

    def search(self, query: str, k: int = 4) -> list[Chunk]:
        scores = self._bm25.get_scores(_tokenize(query))
        ranked = sorted(zip(scores, self._chunks, strict=True), key=lambda p: p[0], reverse=True)
        return [
            Chunk(id=c.id, source=c.source, title=c.title, text=c.text, score=float(s))
            for s, c in ranked[:k]
            if s > 0
        ]


@lru_cache
def get_retriever() -> BM25Retriever:
    return BM25Retriever()


def format_context(chunks: list[Chunk]) -> str:
    if not chunks:
        return ""
    parts = [f"[{c.source}] {c.title}\n{c.text}" for c in chunks]
    return "\n\n".join(parts)
