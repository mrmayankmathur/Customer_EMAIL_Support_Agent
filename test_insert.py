import asyncio
from httpx import AsyncClient
import requests
import json

data = {
    "sender": "test@test.com",
    "subject": "test",
    "body": "test output"
}
res = requests.post(
    "https://mrmayankmathurorg-customer-email-agent.hf.space/api/v1/process-email",
    json=data,
    headers={"X-API-Token": "dev_token_change_me"}
)
print("Status:", res.status_code)
print("Body:", res.text)
