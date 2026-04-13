"""
Responder node — drafts a reply to the customer using the LLM.
"""

from loguru import logger

from src.prompts.templates import RESPONDER_PROMPT
from src.schemas.state import SupportState
from src.services.llm_service import invoke_llm


async def generate_response(state: SupportState) -> dict:
    """
    Generate a draft response using the LLM, the classified category,
    and retrieved knowledge base context.
    """
    logger.info("Generating response for: {}", state.email.subject)

    # Combine context chunks into a single block
    context_text = "\n\n---\n\n".join(state.context) if state.context else "No relevant context found."

    prompt = RESPONDER_PROMPT.format(
        category=state.category.value,
        sender=state.email.sender,
        subject=state.email.subject,
        body=state.email.body,
        context=context_text,
    )

    draft = await invoke_llm(prompt)

    logger.info("Draft response generated ({} chars)", len(draft))

    return {"draft_response": draft}
