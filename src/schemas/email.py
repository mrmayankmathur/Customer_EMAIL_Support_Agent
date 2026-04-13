"""
Pydantic models for email data.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class IncomingEmail(BaseModel):
    """Represents an incoming customer support email."""

    sender: str
    subject: str
    body: str
    message_id: Optional[str] = None
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OutgoingEmail(BaseModel):
    """Represents a drafted reply to a customer."""

    to: str
    subject: str
    body: str
    in_reply_to: Optional[str] = None
    priority: str = "normal"  # "low", "normal", "high"
