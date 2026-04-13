"""
General-purpose helper utilities.
"""

import re


def clean_email_body(body: str) -> str:
    """Strip quoted reply chains and excessive whitespace from an email body."""
    # Remove lines starting with '>' (quoted replies)
    lines = [line for line in body.splitlines() if not line.strip().startswith(">")]
    cleaned = "\n".join(lines).strip()
    # Collapse multiple blank lines
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned


def truncate(text: str, max_length: int = 500) -> str:
    """Truncate text to a maximum length, adding an ellipsis if trimmed."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 1] + "…"
