"""
FastAPI routes for the Customer Support Email Agent.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

import json
import os
from fastapi import APIRouter, HTTPException
from loguru import logger

from src.graph.workflow import workflow
from src.schemas.email import IncomingEmail, OutgoingEmail
from src.schemas.state import SupportState, TicketStatus
from src.services.email_service import fetch_new_emails, send_reply

router = APIRouter(tags=["support"])

# In-memory stores
_all_tickets: dict[str, dict] = {}
_escalated_tickets: dict[str, dict] = {}
_follow_ups: list[dict] = []

DB_FILE = "data_store.json"


def load_data():
    global _all_tickets, _escalated_tickets, _follow_ups
    if os.path.exists(DB_FILE):
        try:
            with open(DB_FILE, "r") as f:
                data = json.load(f)
                _all_tickets = data.get("_all_tickets", {})
                _escalated_tickets = data.get("_escalated_tickets", {})
                _follow_ups = data.get("_follow_ups", [])
        except Exception as e:
            logger.error("Failed to load DB: {}", e)


def save_data():
    with open(DB_FILE, "w") as f:
        json.dump(
            {
                "_all_tickets": _all_tickets,
                "_escalated_tickets": _escalated_tickets,
                "_follow_ups": _follow_ups,
            },
            f,
            indent=2,
        )


load_data()


@router.post("/process-email")
async def process_email(email: IncomingEmail) -> dict:
    """
    Accept an incoming email and run it through the support agent graph.
    Returns the agent's response and metadata.
    """
    logger.info("Processing email from: {} — subject: {}", email.sender, email.subject)

    initial_state = SupportState(email=email)
    result = await workflow.ainvoke(initial_state)

    # Generate a ticket ID for tracking
    ticket_id = str(uuid.uuid4())[:8]

    # Build the full ticket record
    ticket_record = {
        "ticket_id": ticket_id,
        "email": email.model_dump(mode="json"),
        "category": result.get("category", "unknown"),
        "confidence": result.get("confidence", 0.0),
        "draft_response": result.get("draft_response", ""),
        "final_response": result.get("final_response", ""),
        "needs_escalation": result.get("needs_escalation", False),
        "escalation_reason": result.get("escalation_reason", ""),
        "follow_up_scheduled": result.get("follow_up_scheduled", False),
        "status": result.get("status", "processing"),
        "context": result.get("context", []),
        "metadata": result.get("metadata", {}),
        "created_at": datetime.now().isoformat(),
    }

    # Store every processed email
    _all_tickets[ticket_id] = ticket_record

    # If escalated, also store in escalation queue
    if result.get("needs_escalation"):
        _escalated_tickets[ticket_id] = {
            "ticket_id": ticket_id,
            "email": email.model_dump(mode="json"),
            "category": result.get("category", "unknown"),
            "confidence": result.get("confidence", 0.0),
            "draft_response": result.get("draft_response", ""),
            "escalation_reason": result.get("escalation_reason", ""),
            "status": "pending_review",
            "created_at": datetime.now().isoformat(),
        }
        logger.info("Ticket {} queued for human review", ticket_id)

    # If follow-up scheduled, record it
    if result.get("follow_up_scheduled"):
        follow_up_date = result.get("follow_up_date")
        _follow_ups.append(
            {
                "ticket_id": ticket_id,
                "email_sender": email.sender,
                "email_subject": email.subject,
                "follow_up_date": (
                    follow_up_date.isoformat() if follow_up_date else None
                ),
                "reason": result.get("metadata", {}).get("follow_up_reason", ""),
                "status": "pending",
            }
        )

    save_data()
    return ticket_record


@router.get("/emails")
async def list_all_emails() -> dict:
    """List all processed emails with their full pipeline results."""
    tickets = list(_all_tickets.values())
    # Sort by created_at descending (newest first)
    tickets.sort(key=lambda t: t["created_at"], reverse=True)
    return {"total": len(tickets), "tickets": tickets}


@router.get("/emails/recent")
async def get_recent_emails(limit: int = 10) -> dict:
    """Get the N most recent emails for the recent activity table."""
    tickets = list(_all_tickets.values())
    tickets.sort(key=lambda t: t["created_at"], reverse=True)
    return {"total": len(tickets), "tickets": tickets[:limit]}


@router.get("/emails/{ticket_id}")
async def get_email_details(ticket_id: str) -> dict:
    """Get full details of a specific processed email."""
    if ticket_id not in _all_tickets:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")
    return _all_tickets[ticket_id]


@router.get("/kpis")
async def get_kpis() -> dict:
    """Calculate and return system KPIs."""
    tickets = list(_all_tickets.values())
    total_emails = len(tickets)

    escalated = sum(1 for t in tickets if t.get("needs_escalation"))
    sent_auto = sum(
        1
        for t in tickets
        if not t.get("needs_escalation") and t.get("status") in ("sent", "processing")
    )

    auto_draft_success_rate = (
        (sent_auto / total_emails * 100) if total_emails > 0 else 0
    )

    # Mocking historical data for the sparkline charts
    return {
        "kpis": {
            "total_emails": {"value": total_emails, "change": "+12%", "trend": "up"},
            "avg_resolution_time": {"value": "1.2m", "change": "-15%", "trend": "down"},
            "auto_draft_success": {
                "value": f"{auto_draft_success_rate:.1f}%",
                "raw_value": auto_draft_success_rate,
                "change": "+2.4%",
                "trend": "up",
            },
            "manual_escalations": {
                "value": escalated,
                "change": "-5%",
                "trend": "down",
            },
        },
        "health": {
            "classifier_confidence": 92.5,
            "retriever_precision": 88.0,
            "responder_quality": 95.2,
        },
    }


@router.get("/config")
async def get_system_config() -> dict:
    """Return mock system configurations for the UI."""
    return {
        "knowledge_base": [
            {
                "id": "KB-001",
                "title": "Billing Policies",
                "updated": "2026-04-10",
                "type": "Markdown",
            },
            {
                "id": "KB-002",
                "title": "API Documentation",
                "updated": "2026-04-12",
                "type": "Markdown",
            },
            {
                "id": "KB-003",
                "title": "Account Management",
                "updated": "2026-04-05",
                "type": "Markdown",
            },
        ],
        "prompts": {
            "classifier": "You are a senior support routing agent. Output ONLY JSON...",
            "retriever": "Using the following context chunks, extract the relevance...",
            "responder": "Draft a professional response to the user based on the context.",
        },
        "settings": {
            "top_k_results": 3,
            "confidence_threshold": 0.85,
            "model_selection": "gpt-4.1",
        },
    }


@router.post("/process-email-batch")
async def process_email_batch() -> dict:
    """
    Fetch unread emails from the IMAP mailbox and process each through
    the support agent graph.
    """
    logger.info("Starting batch email processing")

    emails = await fetch_new_emails()
    if not emails:
        return {"processed": 0, "message": "No new emails found"}

    results = []
    for email in emails:
        try:
            initial_state = SupportState(email=email)
            result = await workflow.ainvoke(initial_state)
            results.append(
                {
                    "sender": email.sender,
                    "subject": email.subject,
                    "status": result.get("status", "processing"),
                    "category": result.get("category", "unknown"),
                    "needs_escalation": result.get("needs_escalation", False),
                }
            )
        except Exception as e:
            logger.error("Failed to process email '{}': {}", email.subject, e)
            results.append(
                {
                    "sender": email.sender,
                    "subject": email.subject,
                    "status": "error",
                    "error": str(e),
                }
            )

    return {
        "processed": len(results),
        "results": results,
    }


@router.get("/review")
async def list_escalated_tickets() -> dict:
    """List all tickets pending human review."""
    pending = [
        t for t in _escalated_tickets.values() if t["status"] == "pending_review"
    ]
    return {"pending_count": len(pending), "tickets": pending}


@router.post("/review/{ticket_id}")
async def review_ticket(
    ticket_id: str, action: str, revised_response: Optional[str] = None
) -> dict:
    """
    Human review endpoint for escalated tickets.

    Args:
        ticket_id: The ID of the escalated ticket.
        action: Either 'approve' (send the draft as-is) or 'reject' (with an
                optional revised_response to send instead).
    """
    if ticket_id not in _escalated_tickets:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")

    ticket = _escalated_tickets[ticket_id]

    if ticket["status"] != "pending_review":
        raise HTTPException(
            status_code=400,
            detail=f"Ticket '{ticket_id}' is already {ticket['status']}",
        )

    if action not in ("approve", "reject"):
        raise HTTPException(
            status_code=400, detail="Action must be 'approve' or 'reject'"
        )

    email_data = ticket["email"]

    if action == "approve":
        response_text = revised_response or ticket["draft_response"]
    else:
        # Reject without a revised response means no email is sent
        if not revised_response:
            ticket["status"] = "rejected"
            # Also update the master record
            if ticket_id in _all_tickets:
                _all_tickets[ticket_id]["status"] = "rejected"
            save_data()
            logger.info("Ticket {} rejected without a replacement response", ticket_id)
            return {
                "ticket_id": ticket_id,
                "status": "rejected",
                "message": "Ticket rejected, no email sent",
            }
        response_text = revised_response

    # Send the approved/revised response
    outgoing = OutgoingEmail(
        to=email_data["sender"],
        subject=f"Re: {email_data['subject']}",
        body=response_text,
        in_reply_to=email_data.get("message_id"),
    )

    try:
        sent = await send_reply(outgoing)
        new_status = "sent" if sent else "approved"
        ticket["status"] = new_status
        ticket["final_response"] = response_text
        ticket["reviewed_at"] = datetime.now().isoformat()

        # Also update master record
        if ticket_id in _all_tickets:
            _all_tickets[ticket_id]["status"] = new_status
            _all_tickets[ticket_id]["final_response"] = response_text

        save_data()
        return {
            "ticket_id": ticket_id,
            "status": new_status,
            "message": f"Response {'sent' if sent else 'approved (email skipped — no credentials)'}",
        }
    except Exception as e:
        logger.error("Failed to send reviewed reply for ticket {}: {}", ticket_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")


@router.get("/follow-ups")
async def list_follow_ups() -> dict:
    """List all scheduled follow-ups."""
    pending = [f for f in _follow_ups if f["status"] == "pending"]
    return {"pending_count": len(pending), "follow_ups": pending}
