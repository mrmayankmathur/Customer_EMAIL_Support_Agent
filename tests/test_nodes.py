"""
Unit tests for graph nodes with mocked LLM calls.
"""

from unittest.mock import AsyncMock, patch

import pytest

from src.schemas.email import IncomingEmail
from src.schemas.state import EmailCategory, SupportState, TicketStatus


def _make_state(**overrides) -> SupportState:
    """Create a SupportState with sensible defaults for testing."""
    defaults = {
        "email": IncomingEmail(
            sender="customer@example.com",
            subject="Help with billing",
            body="I was charged twice for my subscription last month.",
        ),
    }
    defaults.update(overrides)
    return SupportState(**defaults)


# ── Classifier ──────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.nodes.classifier.invoke_llm_json", new_callable=AsyncMock)
async def test_classify_billing(mock_llm):
    """Classifier should map a billing email correctly."""
    mock_llm.return_value = {
        "category": "billing",
        "confidence": 0.95,
        "reasoning": "Customer mentions being charged twice.",
    }

    from src.nodes.classifier import classify_email

    state = _make_state()
    result = await classify_email(state)

    assert result["category"] == EmailCategory.BILLING
    assert result["confidence"] == 0.95
    assert "classification_reasoning" in result["metadata"]
    mock_llm.assert_called_once()


@pytest.mark.asyncio
@patch("src.nodes.classifier.invoke_llm_json", new_callable=AsyncMock)
async def test_classify_unknown_category(mock_llm):
    """Classifier should fall back to UNKNOWN for unrecognised categories."""
    mock_llm.return_value = {
        "category": "something_weird",
        "confidence": 0.3,
        "reasoning": "Unclear intent.",
    }

    from src.nodes.classifier import classify_email

    state = _make_state()
    result = await classify_email(state)

    assert result["category"] == EmailCategory.UNKNOWN
    assert result["confidence"] == 0.3


# ── Retriever ───────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.nodes.retriever.kb")
async def test_retrieve_context_billing(mock_kb):
    """Retriever should return relevant context for a billing query."""
    mock_kb.search.return_value = [
        "Refund policy: 30 days full refund",
        "Double charge resolution process",
    ]

    from src.nodes.retriever import retrieve_context

    state = _make_state(category=EmailCategory.BILLING)
    result = await retrieve_context(state)

    assert isinstance(result["context"], list)
    assert len(result["context"]) == 2
    assert "Refund policy" in result["context"][0]
    mock_kb.search.assert_called_once()


@pytest.mark.asyncio
@patch("src.nodes.retriever.kb")
async def test_retrieve_context_empty_query(mock_kb):
    """Retriever should handle emails with minimal content gracefully."""
    mock_kb.search.return_value = []

    from src.nodes.retriever import retrieve_context

    state = _make_state(
        email=IncomingEmail(
            sender="test@test.com",
            subject="",
            body="",
        ),
        category=EmailCategory.GENERAL,
    )
    result = await retrieve_context(state)
    assert isinstance(result["context"], list)
    assert len(result["context"]) == 0


# ── Responder ───────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.nodes.responder.invoke_llm", new_callable=AsyncMock)
async def test_generate_response(mock_llm):
    """Responder should invoke the LLM with context and return a draft."""
    mock_llm.return_value = "Dear customer, we apologize for the double charge..."

    from src.nodes.responder import generate_response

    state = _make_state(
        category=EmailCategory.BILLING,
        context=["Refund policy: 30 days full refund"],
    )
    result = await generate_response(state)

    assert "double charge" in result["draft_response"].lower()
    mock_llm.assert_called_once()


# ── Escalation ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_escalation_low_confidence():
    """Very low confidence should trigger automatic escalation."""
    from src.nodes.escalation import check_escalation

    state = _make_state(confidence=0.2, draft_response="Some draft")
    result = await check_escalation(state)

    assert result["needs_escalation"] is True
    assert result["status"] == TicketStatus.PENDING_REVIEW


@pytest.mark.asyncio
@patch("src.nodes.escalation.invoke_llm_json", new_callable=AsyncMock)
async def test_escalation_high_confidence_no_escalation(mock_llm):
    """High confidence non-billing emails should not escalate."""
    from src.nodes.escalation import check_escalation

    state = _make_state(
        category=EmailCategory.GENERAL,
        confidence=0.95,
        draft_response="Here is the answer...",
    )
    result = await check_escalation(state)

    assert result["needs_escalation"] is False
    # LLM should NOT be called for high-confidence non-sensitive categories
    mock_llm.assert_not_called()


@pytest.mark.asyncio
@patch("src.nodes.escalation.invoke_llm_json", new_callable=AsyncMock)
async def test_escalation_billing_triggers_llm_check(mock_llm):
    """Billing emails should always trigger the LLM escalation check."""
    mock_llm.return_value = {
        "needs_escalation": False,
        "reason": "Issue seems straightforward.",
    }

    from src.nodes.escalation import check_escalation

    state = _make_state(
        category=EmailCategory.BILLING,
        confidence=0.85,
        draft_response="We will process your refund...",
    )
    result = await check_escalation(state)

    assert result["needs_escalation"] is False
    # LLM SHOULD be called because billing is a sensitive category
    mock_llm.assert_called_once()


# ── Send Reply ──────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.nodes.send_reply.send_reply", new_callable=AsyncMock)
async def test_send_reply_success(mock_send):
    """Successful send should mark ticket as SENT."""
    mock_send.return_value = True

    from src.nodes.send_reply import send_email_reply

    state = _make_state(draft_response="Thank you for contacting us...")
    result = await send_email_reply(state)

    assert result["status"] == TicketStatus.SENT
    assert result["final_response"] == "Thank you for contacting us..."


@pytest.mark.asyncio
@patch("src.nodes.send_reply.send_reply", new_callable=AsyncMock)
async def test_send_reply_no_credentials(mock_send):
    """When credentials are missing, mark as APPROVED (unsent)."""
    mock_send.return_value = False

    from src.nodes.send_reply import send_email_reply

    state = _make_state(draft_response="Thank you for contacting us...")
    result = await send_email_reply(state)

    assert result["status"] == TicketStatus.APPROVED


# ── Follow-up ───────────────────────────────────────────────────────


@pytest.mark.asyncio
@patch("src.nodes.follow_up.invoke_llm_json", new_callable=AsyncMock)
async def test_follow_up_scheduled(mock_llm):
    """Follow-up should be scheduled when the LLM says so."""
    mock_llm.return_value = {
        "needs_follow_up": True,
        "follow_up_days": 3,
        "reason": "Refund processing takes time.",
    }

    from src.nodes.follow_up import check_follow_up

    state = _make_state(
        category=EmailCategory.BILLING,
        final_response="Your refund will be processed in 5-10 days.",
    )
    result = await check_follow_up(state)

    assert result["follow_up_scheduled"] is True
    assert result["follow_up_date"] is not None
    assert result["status"] == TicketStatus.FOLLOW_UP_SCHEDULED


@pytest.mark.asyncio
@patch("src.nodes.follow_up.invoke_llm_json", new_callable=AsyncMock)
async def test_follow_up_not_needed(mock_llm):
    """Follow-up should not be scheduled for simple questions."""
    mock_llm.return_value = {
        "needs_follow_up": False,
        "follow_up_days": 0,
        "reason": "Issue fully resolved.",
    }

    from src.nodes.follow_up import check_follow_up

    state = _make_state(
        category=EmailCategory.GENERAL,
        final_response="Our business hours are 9-6 EST.",
    )
    result = await check_follow_up(state)

    assert result["follow_up_scheduled"] is False
