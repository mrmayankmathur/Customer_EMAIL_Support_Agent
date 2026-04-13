"""
Send-reply node — sends the final response to the customer via email.
"""

from loguru import logger

from src.schemas.email import OutgoingEmail
from src.schemas.state import SupportState, TicketStatus
from src.services.email_service import send_reply


async def send_email_reply(state: SupportState) -> dict:
    """
    Send the drafted response to the customer.

    Builds an OutgoingEmail from the current state and dispatches
    it through the email service. The draft becomes the final response.
    """
    logger.info("Sending reply for: {}", state.email.subject)

    # The draft is promoted to the final response
    final_response = state.draft_response

    # Build the outgoing email
    outgoing = OutgoingEmail(
        to=state.email.sender,
        subject=f"Re: {state.email.subject}",
        body=final_response,
        in_reply_to=state.email.message_id,
    )

    # Attempt to send
    try:
        sent = await send_reply(outgoing)
        if sent:
            logger.info("Reply sent successfully to {}", state.email.sender)
            return {
                "final_response": final_response,
                "status": TicketStatus.SENT,
            }
        else:
            # Credentials not configured — mark as approved but unsent
            logger.info("Email sending skipped (credentials not configured)")
            return {
                "final_response": final_response,
                "status": TicketStatus.APPROVED,
            }
    except Exception as e:
        logger.error("Failed to send reply: {}", e)
        return {
            "final_response": final_response,
            "status": TicketStatus.APPROVED,
            "metadata": {
                **state.metadata,
                "send_error": str(e),
            },
        }
