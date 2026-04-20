"""
Supabase client initialization.
"""

from supabase import Client, create_client
from src.core.config import settings
from loguru import logger

def get_supabase() -> Client:
    """
    Initialize and return a Supabase client.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        logger.warning("Supabase credentials missing. Persistence will fail.")
        # We don't crash here so the server can still start for local dev,
        # but operations will fail.
    
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Singleton instance
supabase: Client = get_supabase()
