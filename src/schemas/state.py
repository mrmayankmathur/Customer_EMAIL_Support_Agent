"""
LangGraph shared state schema.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field

from src.schemas.email import IncomingEmail


class EmailCategory(str, Enum):
    """Supported email categories."""

    BILLING = "billing"
    TECHNICAL = "technical"
    ACCOUNT = "account"
    GENERAL = "general"
    UNKNOWN = "unknown"


class TicketStatus(str, Enum):
    """Status of the support ticket as it flows through the pipeline."""

    PROCESSING = "processing"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    SENT = "sent"
    SEND_FAILED = "send_failed"
    FOLLOW_UP_SCHEDULED = "follow_up_scheduled"


class SupportState(BaseModel):
    """
    Shared state passed between LangGraph nodes.
    This is the single state object that flows through the entire workflow.
    """

    email: IncomingEmail
    category: EmailCategory = EmailCategory.UNKNOWN
    context: List[str] = Field(default_factory=list)
    draft_response: str = ""
    final_response: str = ""
    needs_escalation: bool = False
    escalation_reason: str = ""
    confidence: float = 0.0
    status: TicketStatus = TicketStatus.PROCESSING
    follow_up_scheduled: bool = False
    follow_up_date: Optional[datetime] = None
    metadata: dict[str, Any] = Field(default_factory=dict)
