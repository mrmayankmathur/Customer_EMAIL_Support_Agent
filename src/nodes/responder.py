"""
Responder node — drafts a reply to the customer using the LLM.
"""

import re

from loguru import logger

from src.prompts.templates import RESPONDER_PROMPT
from src.schemas.state import SupportState
from src.services.llm_service import invoke_llm
from src.utils.security import sanitize_input


async def generate_response(state: SupportState) -> dict:
    """
    Generate a draft response using the LLM, the classified category,
    and retrieved knowledge base context.
    """
    logger.info("Generating draft response for ticket")

    # Combine context chunks into a single block
    context_text = "\n\n---\n\n".join(state.context) if state.context else "No relevant context found."

    # Sanitize user-controlled fields before prompt formatting
    safe_sender = sanitize_input(state.email.sender)
    safe_subject = sanitize_input(state.email.subject)
    safe_body = sanitize_input(state.email.body)

    prompt = RESPONDER_PROMPT.format(
        category=state.category.value,
        sender=safe_sender,
        subject=safe_subject,
        body=safe_body,
        context=context_text,
    )

    draft = await invoke_llm(prompt)

    logger.info("Draft response generated ({} chars)", len(draft))

    return {"draft_response": draft}
