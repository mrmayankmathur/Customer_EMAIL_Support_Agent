"""
Follow-up node — evaluates whether a follow-up should be scheduled.
"""

from datetime import datetime, timedelta

from loguru import logger

from src.prompts.templates import FOLLOW_UP_PROMPT
from src.schemas.state import SupportState, TicketStatus
from src.services.llm_service import invoke_llm_json


async def check_follow_up(state: SupportState) -> dict:
    """
    Determine if a follow-up check-in with the customer is appropriate.

    Uses the LLM to evaluate whether the nature of the issue warrants
    a scheduled follow-up, and if so, how many days out.
    """
    logger.info("Checking follow-up for: {}", state.email.subject)

    prompt = FOLLOW_UP_PROMPT.format(
        category=state.category.value,
        body=state.email.body,
        response=state.final_response or state.draft_response,
    )

    result = await invoke_llm_json(prompt)

    needs_follow_up = result.get("needs_follow_up", False)
    follow_up_days = int(result.get("follow_up_days", 7))
    reason = result.get("reason", "")

    if needs_follow_up:
        follow_up_date = datetime.now() + timedelta(days=follow_up_days)
        logger.info(
            "Follow-up scheduled for '{}' in {} day(s): {}",
            state.email.subject,
            follow_up_days,
            reason,
        )
        return {
            "follow_up_scheduled": True,
            "follow_up_date": follow_up_date,
            "status": TicketStatus.FOLLOW_UP_SCHEDULED,
            "metadata": {
                **state.metadata,
                "follow_up_reason": reason,
                "follow_up_days": follow_up_days,
            },
        }

    logger.info("No follow-up needed for '{}'", state.email.subject)
    return {"follow_up_scheduled": False}
