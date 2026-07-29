from app.rag.retriever import BM25Retriever, format_context


def test_retrieves_relevant_chunks_for_special_category_query():
    retriever = BM25Retriever()
    results = retriever.search("we process health data about patients", k=3)
    assert len(results) > 0
    assert any("Art. 9" in r.source or "special" in r.text.lower() for r in results)


def test_retrieves_transfer_guidance_for_international_query():
    retriever = BM25Retriever()
    results = retriever.search("transferring personal data to our US vendor", k=3)
    assert len(results) > 0
    sources = " ".join(r.source for r in results)
    assert "44" in sources or "transfer" in " ".join(r.title.lower() for r in results)


def test_irrelevant_query_returns_low_or_no_results():
    retriever = BM25Retriever()
    results = retriever.search("xyzzy plugh nonsense query", k=3)
    assert all(r.score == 0 for r in results) or len(results) == 0


def test_format_context_empty():
    assert format_context([]) == ""


def test_format_context_includes_source_and_title():
    retriever = BM25Retriever()
    results = retriever.search("automated decision making profiling", k=2)
    ctx = format_context(results)
    assert results
    for r in results:
        assert r.source in ctx
        assert r.title in ctx
