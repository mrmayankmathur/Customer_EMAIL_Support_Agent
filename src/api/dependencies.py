"""
FastAPI dependency injection helpers.
"""

from src.core.config import Settings, settings


def get_settings() -> Settings:
    """FastAPI dependency that returns the app settings singleton."""
    return settings
