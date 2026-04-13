"""
LLM service — initialises and exposes the LangChain ChatOpenAI model
configured to use GitHub Models inference endpoint.

GitHub Models provides OpenAI-compatible API at
https://models.github.ai/inference, authenticated with a GitHub token.
"""

import json

from langchain_openai import ChatOpenAI
from loguru import logger

from src.core.config import settings


def get_llm() -> ChatOpenAI:
    """Return a ChatOpenAI instance pointing at GitHub Models."""
    return ChatOpenAI(
        model=settings.LLM_MODEL,
        api_key=settings.GITHUB_TOKEN,
        base_url=settings.LLM_BASE_URL,
        temperature=0.3,
    )


async def invoke_llm(prompt: str) -> str:
    """
    Send a prompt to the LLM and return the raw text response.
    """
    llm = get_llm()
    try:
        response = await llm.ainvoke(prompt)
        return response.content.strip()
    except Exception as e:
        logger.error("LLM invocation failed: {}", e)
        raise


async def invoke_llm_json(prompt: str) -> dict:
    """
    Send a prompt to the LLM and parse the response as JSON.

    Falls back to an empty dict if parsing fails, logging the error
    so the pipeline can continue gracefully.
    """
    raw = await invoke_llm(prompt)

    # Strip markdown code fences if the LLM wraps its response
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (possibly ```json)
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.warning(
            "Failed to parse LLM response as JSON: {} — raw: {}", e, raw[:200]
        )
        return {}
