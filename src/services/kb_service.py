"""
Knowledge Base service — uses FAISS vector store with OpenAI embeddings
for semantic search across support documentation.

Usage:
    1. Run `python -m src.services.kb_service` to build/rebuild the FAISS index
       from the markdown files in knowledge_base/.
    2. At runtime the retriever node loads the pre-built index and performs
       similarity search against it.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List, Optional

from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger

from src.core.config import settings

# ── Paths ────────────────────────────────────────────────────────────
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_KB_DIR = _PROJECT_ROOT / "knowledge_base"
_FAISS_INDEX_DIR = _KB_DIR / "faiss_index"


# ── Helpers ──────────────────────────────────────────────────────────


def _get_embeddings() -> OpenAIEmbeddings:
    """Return an OpenAI embeddings instance routed through GitHub Models."""
    return OpenAIEmbeddings(
        model=settings.EMBEDDING_MODEL,
        api_key=settings.GITHUB_TOKEN,
        base_url=settings.LLM_BASE_URL,
    )


def _load_and_chunk_documents() -> list:
    """
    Load all .md files from the knowledge base directory, split them
    into semantically meaningful chunks, and return LangChain Document
    objects with metadata.
    """
    from langchain_core.documents import Document

    if not _KB_DIR.exists():
        logger.warning("Knowledge base directory not found: {}", _KB_DIR)
        return []

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=80,
        separators=["\n## ", "\n### ", "\n\n", "\n", " "],
    )

    documents: list[Document] = []

    for filepath in sorted(_KB_DIR.glob("**/*.md")):
        # Skip README and FAISS index directory
        if filepath.name.lower() == "readme.md":
            continue
        if _FAISS_INDEX_DIR in filepath.parents or filepath.parent == _FAISS_INDEX_DIR:
            continue

        content = filepath.read_text(encoding="utf-8")
        category = filepath.stem.lower()

        # Split into chunks
        chunks = splitter.split_text(content)

        for i, chunk in enumerate(chunks):
            documents.append(
                Document(
                    page_content=chunk,
                    metadata={
                        "source": filepath.name,
                        "category": category,
                        "chunk_index": i,
                    },
                )
            )

        logger.debug("Loaded KB document: {} → {} chunk(s)", filepath.name, len(chunks))

    logger.info(
        "Knowledge base: {} document(s), {} total chunk(s)",
        len(set(d.metadata["source"] for d in documents)),
        len(documents),
    )
    return documents


# ── Index builder ────────────────────────────────────────────────────


def build_faiss_index() -> FAISS:
    """
    Build (or rebuild) the FAISS index from the knowledge base markdown
    files and persist it to disk.

    Returns the created FAISS vector store.
    """
    documents = _load_and_chunk_documents()
    if not documents:
        raise ValueError("No documents found in knowledge_base/ to index")

    embeddings = _get_embeddings()

    logger.info("Building FAISS index from {} chunk(s)…", len(documents))
    vector_store = FAISS.from_documents(documents, embeddings)

    # Persist to disk
    vector_store.save_local(str(_FAISS_INDEX_DIR))
    logger.info("FAISS index saved to {}", _FAISS_INDEX_DIR)

    return vector_store


# ── Runtime search ───────────────────────────────────────────────────


class KnowledgeBase:
    """
    FAISS-backed knowledge base with semantic search.

    Loads a pre-built FAISS index from disk and performs similarity
    search with optional category filtering.
    """

    def __init__(self) -> None:
        self._store: Optional[FAISS] = None
        self._loaded = False

    def load(self) -> None:
        """Load the FAISS index from disk."""
        if self._loaded:
            return

        if not _FAISS_INDEX_DIR.exists():
            logger.warning(
                "FAISS index not found at {}. "
                "Run `python -m src.services.kb_service` to build it.",
                _FAISS_INDEX_DIR,
            )
            self._loaded = True
            return

        try:
            embeddings = _get_embeddings()
            self._store = FAISS.load_local(
                str(_FAISS_INDEX_DIR),
                embeddings,
                allow_dangerous_deserialization=True,
            )
            logger.info("FAISS index loaded ({} vectors)", self._store.index.ntotal)
        except Exception as e:
            logger.error("Failed to load FAISS index: {}", e)

        self._loaded = True

    def search(
        self,
        query: str,
        category: Optional[str] = None,
        top_k: int = 3,
    ) -> List[str]:
        """
        Perform semantic similarity search against the knowledge base.

        Args:
            query: The search query string.
            category: If provided, a filter to prefer chunks from this
                      category (post-search filtering).
            top_k: Maximum number of context chunks to return.

        Returns:
            A list of relevant text chunks from the FAISS index.
        """
        self.load()

        if self._store is None or not query.strip():
            return []

        # Fetch more results than needed so we can filter by category
        fetch_k = top_k * 3 if category else top_k

        try:
            results = self._store.similarity_search_with_score(query, k=fetch_k)
        except Exception as e:
            logger.error("FAISS search failed: {}", e)
            return []

        if not results:
            return []

        # If a category filter is specified, sort category-matched chunks first
        if category:
            cat_lower = category.lower()
            results.sort(
                key=lambda r: (
                    0 if r[0].metadata.get("category") == cat_lower else 1,
                    r[1],  # then by distance (lower = better)
                )
            )

        # Take top_k and return just the text content
        return [doc.page_content for doc, _score in results[:top_k]]


# Singleton instance used by the retriever node
kb = KnowledgeBase()


# ── CLI: build the index ─────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    logger.remove()
    logger.add(sys.stderr, level="DEBUG")

    logger.info("Building FAISS index from knowledge_base/ …")
    vs = build_faiss_index()
    logger.info("Done! Index contains {} vectors", vs.index.ntotal)

    # Quick sanity search
    test_results = vs.similarity_search("refund policy", k=2)
    logger.info("Sanity check — top 2 results for 'refund policy':")
    for r in test_results:
        logger.info(
            "  [{}/{}] {}",
            r.metadata["category"],
            r.metadata["source"],
            r.page_content[:100].replace("\n", " "),
        )
