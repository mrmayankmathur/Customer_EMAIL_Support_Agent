"""
Classifier node — categorises the incoming email using the LLM.
"""

from loguru import logger

from src.prompts.templates import CLASSIFIER_PROMPT
from src.schemas.state import EmailCategory, SupportState
from src.services.llm_service import invoke_llm_json


# Mapping of raw category strings to the EmailCategory enum
_CATEGORY_MAP = {
    "billing": EmailCategory.BILLING,
    "technical": EmailCategory.TECHNICAL,
    "account": EmailCategory.ACCOUNT,
    "general": EmailCategory.GENERAL,
}


async def classify_email(state: SupportState) -> dict:
    """
    Classify the incoming email into a support category.

    Uses the LLM to determine the intent of the customer email,
    returning the category, confidence score, and reasoning.
    """
    logger.info("Classifying email: {}", state.email.subject)

    prompt = CLASSIFIER_PROMPT.format(
        subject=state.email.subject,
        body=state.email.body,
    )

    result = await invoke_llm_json(prompt)

    # Extract and map category
    raw_category = result.get("category", "general").lower().strip()
    category = _CATEGORY_MAP.get(raw_category, EmailCategory.UNKNOWN)
    confidence = float(result.get("confidence", 0.5))
    reasoning = result.get("reasoning", "")

    logger.info(
        "Classified as '{}' (confidence={:.2f}): {}",
        category.value,
        confidence,
        reasoning,
    )

    return {
        "category": category,
        "confidence": confidence,
        "metadata": {**state.metadata, "classification_reasoning": reasoning},
    }
