"""
Security utilities for prompt sanitization and safety.
"""

import re

# Patterns that may indicate prompt injection attempts
_SUSPICIOUS_PATTERNS = re.compile(
    r"(ignore\s+(all\s+)?previous\s+instructions|"
    r"you\s+are\s+now\s+a|"
    r"system\s*:\s*|"
    r"ASSISTANT\s*:\s*|"
    r"</?(system|user|assistant)>)",
    re.IGNORECASE,
)

def sanitize_input(text: str) -> str:
    """
    Sanitize user-controlled input before injecting into the LLM prompt.
    Strips suspicious prompt-injection patterns and truncates to a safe length
    to prevent token abuse and bypass native LLM provider jailbreak filters.
    """
    if not text:
        return ""
    
    sanitized = _SUSPICIOUS_PATTERNS.sub("[REDACTED]", text)
    # Truncate excessively long inputs to prevent token abuse
    return sanitized[:8000]
