"""
Smoke tests for the FastAPI application.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import app


@pytest.mark.asyncio
async def test_health_check():
    """Health endpoint should return 200 with status ok."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_list_escalated_tickets_empty():
    """Review listing endpoint should return empty list initially."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/review")
    assert response.status_code == 200
    data = response.json()
    assert data["pending_count"] == 0
    assert data["tickets"] == []


@pytest.mark.asyncio
async def test_list_follow_ups_empty():
    """Follow-ups endpoint should return empty list initially."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/follow-ups")
    assert response.status_code == 200
    data = response.json()
    assert data["pending_count"] == 0


@pytest.mark.asyncio
async def test_review_nonexistent_ticket():
    """Reviewing a non-existent ticket should return 404."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/review/nonexistent",
            params={"action": "approve"},
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_process_email_batch_no_credentials():
    """Batch processing with no credentials should return 0 processed."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/api/v1/process-email-batch")
    assert response.status_code == 200
    data = response.json()
    assert data["processed"] == 0
