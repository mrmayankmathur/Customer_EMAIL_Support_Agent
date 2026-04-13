"""
Retriever node — fetches relevant context from the FAISS knowledge base.
"""

from loguru import logger

from src.schemas.state import SupportState
from src.services.kb_service import kb


async def retrieve_context(state: SupportState) -> dict:
    """
    Retrieve relevant knowledge base articles based on the email
    content and its classified category.

    Uses FAISS vector similarity search with OpenAI embeddings for
    semantic matching against the knowledge base documentation.
    """
    logger.info("Retrieving context for category: {}", state.category.value)

    # Build a combined search query from subject + body
    query = f"{state.email.subject} {state.email.body}"

    context = kb.search(
        query=query,
        category=state.category.value,
        top_k=3,
    )

    logger.info("Retrieved {} context chunk(s)", len(context))

    return {"context": context}
