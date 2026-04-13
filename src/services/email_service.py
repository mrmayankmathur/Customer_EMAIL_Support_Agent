"""
Email service — fetches incoming emails via IMAP and sends replies via SMTP.
"""

from __future__ import annotations

import asyncio
import email as email_lib
import email.header
from email.mime.text import MIMEText

import aiosmtplib
from imapclient import IMAPClient
from loguru import logger

from src.core.config import settings
from src.schemas.email import IncomingEmail, OutgoingEmail


def _decode_header(header_value: str) -> str:
    """Decode an RFC 2047 encoded email header into a plain string."""
    if header_value is None:
        return ""
    decoded_parts = email.header.decode_header(header_value)
    parts = []
    for part, charset in decoded_parts:
        if isinstance(part, bytes):
            parts.append(part.decode(charset or "utf-8", errors="replace"))
        else:
            parts.append(part)
    return "".join(parts)


def _is_attachment(part: email_lib.message.Message) -> bool:
    """Check if a MIME part is an attachment (should be skipped for body extraction)."""
    disposition = part.get_content_disposition()
    if disposition == "attachment":
        return True
    if part.get_filename():
        return True
    return False


def _extract_body(msg: email_lib.message.Message) -> str:
    """Extract the plain-text body from an email message, skipping attachments."""
    if msg.is_multipart():
        for part in msg.walk():
            if _is_attachment(part):
                continue
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
        # Fallback: try text/html if no plain text found
        for part in msg.walk():
            if _is_attachment(part):
                continue
            if part.get_content_type() == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    return payload.decode(charset, errors="replace")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace")
    return ""


def _fetch_new_emails_sync() -> list[IncomingEmail]:
    """
    Synchronous IMAP fetch — runs in a thread pool to avoid blocking
    the async event loop.
    """
    emails: list[IncomingEmail] = []

    with IMAPClient(
        settings.EMAIL_HOST, port=settings.EMAIL_PORT, ssl=True
    ) as client:
        client.login(settings.EMAIL_USERNAME, settings.EMAIL_PASSWORD)
        client.select_folder("INBOX")

        # Search for unread messages
        message_ids = client.search(["UNSEEN"])
        if not message_ids:
            logger.info("No new emails found")
            return []

        logger.info("Found {} unread email(s)", len(message_ids))

        # Fetch messages
        raw_messages = client.fetch(message_ids, ["RFC822"])

        for uid, data in raw_messages.items():
            raw_email = data[b"RFC822"]
            msg = email_lib.message_from_bytes(raw_email)

            sender = _decode_header(msg.get("From", ""))
            subject = _decode_header(msg.get("Subject", ""))
            message_id = msg.get("Message-ID", "")
            body = _extract_body(msg)

            incoming = IncomingEmail(
                sender=sender,
                subject=subject,
                body=body,
                message_id=message_id,
            )
            emails.append(incoming)

        logger.info("Fetched and parsed {} email(s)", len(emails))

    return emails


async def fetch_new_emails() -> list[IncomingEmail]:
    """
    Fetch unread emails from the configured IMAP mailbox.

    Connects to the IMAP server, searches for UNSEEN messages,
    parses each into an IncomingEmail, and returns the list.
    Runs blocking IMAP I/O in a thread pool to avoid starving the event loop.
    """
    _placeholder_markers = ("your-", "your_", "sk-your", "changeme", "placeholder")

    def _is_placeholder(val: str) -> bool:
        return not val or any(m in val.lower() for m in _placeholder_markers)

    if _is_placeholder(settings.EMAIL_USERNAME) or _is_placeholder(
        settings.EMAIL_PASSWORD
    ):
        logger.warning("Email credentials not configured — skipping IMAP fetch")
        return []

    try:
        return await asyncio.to_thread(_fetch_new_emails_sync)
    except Exception as e:
        logger.error("IMAP fetch failed: {}", e)
        raise


async def send_reply(outgoing: OutgoingEmail) -> bool:
    """
    Send a reply email via SMTP with STARTTLS.
    """
    _placeholder_markers = ("your-", "your_", "sk-your", "changeme", "placeholder")

    def _is_placeholder(val: str) -> bool:
        return not val or any(m in val.lower() for m in _placeholder_markers)

    if _is_placeholder(settings.EMAIL_USERNAME) or _is_placeholder(
        settings.EMAIL_PASSWORD
    ):
        logger.warning("Email credentials not configured — skipping SMTP send")
        return False

    # Build the MIME message
    msg = MIMEText(outgoing.body, "plain", "utf-8")
    msg["From"] = settings.EMAIL_USERNAME
    msg["To"] = outgoing.to
    msg["Subject"] = outgoing.subject
    if outgoing.in_reply_to:
        msg["In-Reply-To"] = outgoing.in_reply_to
        msg["References"] = outgoing.in_reply_to

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            start_tls=True,
            username=settings.EMAIL_USERNAME,
            password=settings.EMAIL_PASSWORD,
        )
        logger.info("Reply sent successfully")
        return True

    except Exception as e:
        logger.error("SMTP send failed: {}", e)
        # Return False instead of raising, so the pipeline can gracefully
        # mark the ticket as 'approved' without a physical email rather than crashing.
        return False
