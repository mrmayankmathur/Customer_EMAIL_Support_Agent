"""
Customer Support Email Agent — FastAPI Application Entry Point
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from src.api.routes import router
from src.core.config import settings
from src.core.logging import setup_logging

# Resolve static directory
_STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def create_app() -> FastAPI:
    """Application factory."""
    setup_logging()

    app = FastAPI(
        title="Customer Support Email Agent",
        description="AI-powered email support agent using LangGraph",
        version="0.1.0",
        debug=settings.DEBUG,
    )

    app.include_router(router, prefix="/api/v1")

    # Serve static files (CSS, JS, images)
    if _STATIC_DIR.exists():
        app.mount("/static", StaticFiles(directory=str(_STATIC_DIR)), name="static")

    @app.get("/health")
    async def health_check():
        return {"status": "ok"}

    @app.get("/")
    async def serve_dashboard():
        """Serve the main dashboard UI."""
        return FileResponse(str(_STATIC_DIR / "index.html"))

    return app


app = create_app()
