"""
Logging configuration using loguru.
"""

import sys

from loguru import logger

from src.core.config import settings


def setup_logging() -> None:
    """Configure loguru logger for the application."""
    logger.remove()  # Remove default handler
    logger.add(
        sys.stderr,
        level=settings.LOG_LEVEL,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level:<8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    )
    logger.info("Logging initialised (level={})", settings.LOG_LEVEL)
