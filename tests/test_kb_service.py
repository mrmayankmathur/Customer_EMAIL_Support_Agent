"""
Tests for the FAISS-backed Knowledge Base service.

These tests cover:
- Document loading and chunking (no API calls needed)
- Search behavior (mocked FAISS store for unit tests)
- Index building (integration test, requires OPENAI_API_KEY)
"""

from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from src.services.kb_service import (
    KnowledgeBase,
    _KB_DIR,
    _FAISS_INDEX_DIR,
    _load_and_chunk_documents,
)


# ── Document loading tests (no API calls) ────────────────────────────


def test_load_and_chunk_documents():
    """Should load and chunk all 4 KB markdown files."""
    docs = _load_and_chunk_documents()
    assert len(docs) > 0

    # Check we got all 4 categories
    categories = {d.metadata["category"] for d in docs}
    assert "billing" in categories
    assert "technical" in categories
    assert "account" in categories
    assert "general" in categories


def test_chunks_have_metadata():
    """Each chunk should have source, category, and chunk_index metadata."""
    docs = _load_and_chunk_documents()
    for doc in docs:
        assert "source" in doc.metadata
        assert "category" in doc.metadata
        assert "chunk_index" in doc.metadata
        assert doc.metadata["source"].endswith(".md")


def test_chunk_sizes():
    """Chunks should be within the configured size limits."""
    docs = _load_and_chunk_documents()
    for doc in docs:
        # chunk_size=500 with some overlap margin
        assert len(doc.page_content) <= 600, (
            f"Chunk too large ({len(doc.page_content)} chars) from {doc.metadata['source']}"
        )
        assert len(doc.page_content) > 0


def test_chunk_content_billing():
    """Billing document chunks should contain billing-related content."""
    docs = _load_and_chunk_documents()
    billing_chunks = [d for d in docs if d.metadata["category"] == "billing"]
    assert len(billing_chunks) > 0
    all_text = " ".join(c.page_content.lower() for c in billing_chunks)
    assert "refund" in all_text or "billing" in all_text or "subscription" in all_text


def test_chunk_content_technical():
    """Technical document chunks should contain technical content."""
    docs = _load_and_chunk_documents()
    tech_chunks = [d for d in docs if d.metadata["category"] == "technical"]
    assert len(tech_chunks) > 0
    all_text = " ".join(c.page_content.lower() for c in tech_chunks)
    assert "api" in all_text or "error" in all_text or "login" in all_text


# ── KnowledgeBase search tests (mocked FAISS store) ─────────────────


def _make_mock_doc(content: str, category: str, source: str = "test.md"):
    """Create a mock LangChain Document."""
    doc = MagicMock()
    doc.page_content = content
    doc.metadata = {"category": category, "source": source, "chunk_index": 0}
    return doc


def test_search_returns_results_when_store_initialized():
    """Search should return page_content from FAISS results."""
    kb_instance = KnowledgeBase()
    kb_instance._loaded = True

    mock_store = MagicMock()
    mock_store.similarity_search_with_score.return_value = [
        (_make_mock_doc("Refund policy is 30 days", "billing"), 0.1),
        (_make_mock_doc("Contact support for help", "general"), 0.3),
    ]
    kb_instance._store = mock_store

    results = kb_instance.search("refund policy", top_k=2)

    assert len(results) == 2
    assert "Refund policy is 30 days" in results[0]
    mock_store.similarity_search_with_score.assert_called_once()


def test_search_with_category_filter():
    """Category filter should prioritize matching chunks."""
    kb_instance = KnowledgeBase()
    kb_instance._loaded = True

    mock_store = MagicMock()
    mock_store.similarity_search_with_score.return_value = [
        (_make_mock_doc("General info about returns", "general"), 0.1),
        (_make_mock_doc("Billing refund within 30 days", "billing"), 0.2),
        (_make_mock_doc("More general FAQ", "general"), 0.3),
    ]
    kb_instance._store = mock_store

    results = kb_instance.search("refund", category="billing", top_k=2)

    assert len(results) == 2
    # Billing chunk should come first despite higher distance score
    assert "Billing refund" in results[0]


def test_search_empty_query():
    """An empty query should return no results."""
    kb_instance = KnowledgeBase()
    kb_instance._loaded = True
    kb_instance._store = MagicMock()

    results = kb_instance.search("")
    assert results == []
    results2 = kb_instance.search("   ")
    assert results2 == []


def test_search_no_store():
    """Search without a loaded store should return empty list."""
    kb_instance = KnowledgeBase()
    kb_instance._loaded = True
    kb_instance._store = None

    results = kb_instance.search("test query")
    assert results == []


def test_search_top_k_limit():
    """Results should be limited to top_k."""
    kb_instance = KnowledgeBase()
    kb_instance._loaded = True

    mock_store = MagicMock()
    mock_store.similarity_search_with_score.return_value = [
        (_make_mock_doc(f"Result {i}", "general"), 0.1 * i)
        for i in range(5)
    ]
    kb_instance._store = mock_store

    results = kb_instance.search("test", top_k=2)
    assert len(results) == 2


def test_kb_idempotent_load():
    """Loading the knowledge base multiple times should be idempotent."""
    kb_instance = KnowledgeBase()
    kb_instance._loaded = True
    kb_instance._store = MagicMock()

    # Second load should not overwrite
    kb_instance.load()
    assert kb_instance._store is not None
