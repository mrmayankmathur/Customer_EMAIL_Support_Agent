"""
Escalation node — decides whether to escalate to a human agent.
"""

from loguru import logger

from src.prompts.templates import ESCALATION_PROMPT
from src.schemas.state import EmailCategory, SupportState, TicketStatus
from src.services.llm_service import invoke_llm_json
from src.utils.security import sanitize_input

CONFIDENCE_THRESHOLD = 0.7

# Categories that always get extra scrutiny
_SENSITIVE_CATEGORIES = {EmailCategory.BILLING}


async def check_escalation(state: SupportState) -> dict:
    """
    Determine if the email should be escalated to a human agent.

    Uses a multi-layered approach:
    1. Hard rules — low confidence always escalates
    2. Category heuristics — billing disputes get extra scrutiny
    3. LLM review — borderline cases are evaluated by the LLM
    """
    logger.info("Checking escalation for ticket")

    # --- Hard rule: very low confidence ---
    if state.confidence < 0.4:
        reason = f"Very low classification confidence ({state.confidence:.2f})"
        logger.warning("Escalating ticket: {}", reason)
        return {
            "needs_escalation": True,
            "escalation_reason": reason,
            "status": TicketStatus.PENDING_REVIEW,
        }

    # --- LLM-based evaluation for borderline and sensitive cases ---
    should_llm_check = (
        state.confidence < CONFIDENCE_THRESHOLD
        or state.category in _SENSITIVE_CATEGORIES
    )

    if should_llm_check:
        prompt = ESCALATION_PROMPT.format(
            subject=sanitize_input(state.email.subject),
            body=sanitize_input(state.email.body),
            category=state.category.value,
            confidence=state.confidence,
            draft_response=state.draft_response,
        )
        result = await invoke_llm_json(prompt)

        # Fail closed: if the LLM response is missing or malformed,
        # default to escalation so borderline tickets go to human review.
        raw_escalation = result.get("needs_escalation")
        if not isinstance(raw_escalation, bool):
            logger.warning("LLM escalation response missing or malformed — defaulting to escalation")
            needs_escalation = True
        else:
            needs_escalation = raw_escalation

        reason = result.get("reason", "LLM escalation review")

        if needs_escalation:
            logger.warning("Escalating ticket: {}", reason)
            return {
                "needs_escalation": True,
                "escalation_reason": reason,
                "status": TicketStatus.PENDING_REVIEW,
            }

    # --- No escalation needed ---
    logger.info("No escalation needed for ticket")
    return {"needs_escalation": False}
