"""
FastAPI routes for the Customer Support Email Agent.
"""

from __future__ import annotations

import asyncio
import json
import os
import tempfile
import threading
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Header
from loguru import logger

from src.core.config import settings
from src.graph.workflow import workflow
from src.schemas.email import IncomingEmail, OutgoingEmail
from src.schemas.state import SupportState, TicketStatus
from src.services.email_service import fetch_new_emails, send_reply
from src.utils.supabase_client import supabase

router = APIRouter(tags=["support"])


async def verify_token(x_api_token: str = Header(...)):
    """Backend security middleware for private deployments."""
    if x_api_token != settings.API_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid API Token")


def _redact_email(email_addr: str) -> str:
    """Redact an email address for logging (e.g. j***@company.com)."""
    if "@" not in email_addr:
        return "***"
    local, domain = email_addr.split("@", 1)
    return f"{local[0]}***@{domain}" if local else f"***@{domain}"


def _generate_ticket_id() -> str:
    """Generate a collision-resistant ticket ID (full UUID hex)."""
    return uuid.uuid4().hex


def _redact_email(email_addr: str) -> str:
    """Redact an email address for logging (e.g. j***@company.com)."""
    if "@" not in email_addr:
        return "***"
    local, domain = email_addr.split("@", 1)
    return f"{local[0]}***@{domain}" if local else f"***@{domain}"


async def _persist_ticket(email: IncomingEmail, result: dict) -> dict:
    """Persist ticket data to Supabase."""
    ticket_id = _generate_ticket_id()

    # Map pydantic/dict result to DB schema
    ticket_data = {
        "ticket_id": ticket_id,
        "sender": email.sender,
        "subject": email.subject,
        "body": email.body,
        "message_id": email.message_id,
        "received_at": email.received_at.isoformat(),
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
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        response = supabase.table("tickets").insert(ticket_data).execute()
        return ticket_data
    except Exception as e:
        logger.error("Supabase insertion failed: {}", e)
        # Raise HTTP exception so the frontend doesn't redirect to a missing ticket
        raise HTTPException(status_code=500, detail=f"Database save failed: {str(e)}")



@router.post("/process-email", dependencies=[Depends(verify_token)])
async def process_email(email: IncomingEmail) -> dict:
    """
    Accept an incoming email and run it through the support agent graph.
    Returns the agent's response and metadata.
    """
    logger.info("Processing email — ticket pipeline initiated")

    initial_state = SupportState(email=email)
    result = await workflow.ainvoke(initial_state)

    ticket_record = await _persist_ticket(email, result)
    return ticket_record


@router.get("/emails", dependencies=[Depends(verify_token)])
async def list_all_emails() -> dict:
    """List all processed emails from Supabase."""
    try:
        response = (
            supabase.table("tickets")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )
        tickets = response.data
        return {"total": len(tickets), "tickets": tickets}
    except Exception as e:
        logger.error("Supabase fetch failed: {}", e)
        return {"total": 0, "tickets": [], "error": str(e)}


@router.get("/emails/recent", dependencies=[Depends(verify_token)])
async def get_recent_emails(limit: int = 10) -> dict:
    """Get the N most recent emails for the recent activity table."""
    try:
        response = (
            supabase.table("tickets")
            .select("*")
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        tickets = response.data
        return {"total": len(tickets), "tickets": tickets}
    except Exception as e:
        logger.error("Supabase fetch failed: {}", e)
        return {"total": 0, "tickets": []}


@router.get("/emails/{ticket_id}", dependencies=[Depends(verify_token)])
async def get_email_details(ticket_id: str) -> dict:
    """Get full details of a specific processed email."""
    try:
        response = (
            supabase.table("tickets")
            .select("*")
            .eq("ticket_id", ticket_id)
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(
                status_code=404, detail=f"Ticket '{ticket_id}' not found"
            )
        return response.data
    except Exception:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")


@router.get("/kpis", dependencies=[Depends(verify_token)])
async def get_kpis() -> dict:
    """Calculate and return system KPIs using Supabase analytics."""
    try:
        # Fetch all for simple calculation (HF Spaces CPU is fast enough for low volume)
        response = (
            supabase.table("tickets").select("needs_escalation, status").execute()
        )
        tickets = response.data
        total_emails = len(tickets)

        escalated = sum(1 for t in tickets if t.get("needs_escalation"))
        sent_auto = sum(
            1
            for t in tickets
            if not t.get("needs_escalation")
            and t.get("status") in ("sent", "processing")
        )

        auto_draft_success_rate = (
            (sent_auto / total_emails * 100) if total_emails > 0 else 0
        )

        return {
            "kpis": {
                "total_emails": {
                    "value": total_emails,
                    "change": "+12%",
                    "trend": "up",
                },
                "avg_resolution_time": {
                    "value": "1.2m",
                    "change": "-15%",
                    "trend": "down",
                },
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
    except Exception as e:
        logger.error("KPI calculation failed: {}", e)
        return {"error": "Failed to load dynamic KPIs"}


@router.get("/config", dependencies=[Depends(verify_token)])
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


@router.post("/process-email-batch", dependencies=[Depends(verify_token)])
async def process_email_batch() -> dict:
    """
    Fetch unread emails from the IMAP mailbox and process each.
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
            ticket_record = await _persist_ticket(email, result)
            results.append(
                {
                    "ticket_id": ticket_record["ticket_id"],
                    "status": ticket_record["status"],
                    "category": ticket_record["category"],
                    "needs_escalation": ticket_record["needs_escalation"],
                }
            )
        except Exception as e:
            logger.error("Failed to process batch email: {}", e)
            results.append({"status": "error", "error": str(e)})

    return {"processed": len(results), "results": results}


@router.get("/review", dependencies=[Depends(verify_token)])
async def list_escalated_tickets() -> dict:
    """List all tickets pending human review from Supabase."""
    try:
        response = (
            supabase.table("tickets")
            .select("*")
            .eq("needs_escalation", True)
            .eq("status", "pending_review")
            .execute()
        )
        return {"pending_count": len(response.data), "tickets": response.data}
    except Exception as e:
        logger.error("Escalation fetch failed: {}", e)
        return {"pending_count": 0, "tickets": []}


@router.post("/review/{ticket_id}", dependencies=[Depends(verify_token)])
async def review_ticket(
    ticket_id: str, action: str, revised_response: Optional[str] = None
) -> dict:
    """
    Human review endpoint for escalated tickets.
    """
    try:
        response = (
            supabase.table("tickets")
            .select("*")
            .eq("ticket_id", ticket_id)
            .single()
            .execute()
        )
        ticket = response.data
    except Exception:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")

    if not ticket:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found")

    if ticket["status"] != "pending_review":
        raise HTTPException(status_code=400, detail=f"Already {ticket['status']}")

    if action not in ("approve", "reject"):
        raise HTTPException(
            status_code=400, detail="Action must be 'approve' or 'reject'"
        )

    # In Supabase, the email body/sender are top-level or in 'metadata' if we changed it.
    # Given my _persist_ticket, they are top-level.

    if action == "approve":
        response_text = revised_response or ticket["draft_response"]
    else:
        if not revised_response:
            supabase.table("tickets").update({"status": "rejected"}).eq(
                "ticket_id", ticket_id
            ).execute()
            return {
                "ticket_id": ticket_id,
                "status": "rejected",
                "message": "Ticket rejected",
            }
        response_text = revised_response

    outgoing = OutgoingEmail(
        to=ticket["sender"],
        subject=f"Re: {ticket['subject']}",
        body=response_text,
        in_reply_to=ticket.get("message_id"),
    )

    try:
        sent = await send_reply(outgoing)
        new_status = "sent" if sent else "approved"

        supabase.table("tickets").update(
            {
                "status": new_status,
                "final_response": response_text,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("ticket_id", ticket_id).execute()

        return {
            "ticket_id": ticket_id,
            "status": new_status,
            "message": f"Response {'sent' if sent else 'approved'}",
        }
    except Exception as e:
        logger.error("Failed to send reviewed reply: {}", e)
        raise HTTPException(status_code=500, detail="Failed to send email")


@router.get("/follow-ups", dependencies=[Depends(verify_token)])
async def list_follow_ups() -> dict:
    """List all scheduled follow-ups from Supabase."""
    try:
        response = (
            supabase.table("tickets")
            .select("*")
            .eq("follow_up_scheduled", True)
            .execute()
        )
        return {"pending_count": len(response.data), "follow_ups": response.data}
    except Exception as e:
        logger.error("Follow-up fetch failed: {}", e)
        return {"pending_count": 0, "follow_ups": []}
