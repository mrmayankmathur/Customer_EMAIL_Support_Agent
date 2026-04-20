---
title: Customer EMAIL Agent
emoji: 📧
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
---

# 📧 Customer Support Email Agent

An AI-powered customer support email agent built with **LangGraph**, **LangChain**, and **FastAPI**.

The agent automatically classifies incoming support emails, retrieves relevant knowledge, drafts responses, and optionally escalates complex issues — all orchestrated as a stateful LangGraph workflow.

## Architecture

```
Incoming Email
      │
      ▼
┌─────────────┐
│  Classifier │  ← Categorizes intent (billing, technical, general, etc.)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Retriever  │  ← Fetches relevant knowledge base articles
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Responder  │  ← Drafts a reply using context + LLM
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Escalation │  ← Routes to human agent if confidence is low
└─────────────┘
```

## Project Structure

```
cust_support_system/
├── src/
│   ├── main.py              # FastAPI application entry point
│   ├── api/                  # API routes & dependencies
│   ├── core/                 # Config, logging, constants
│   ├── graph/                # LangGraph workflow definition
│   ├── nodes/                # Individual graph nodes
│   ├── schemas/              # Pydantic models
│   ├── services/             # Email & LLM services
│   ├── prompts/              # Prompt templates
│   └── utils/                # Helper utilities
├── knowledge_base/           # Support articles & FAQ docs
├── tests/                    # Pytest test suite
├── requirements.txt
├── .env
└── README.md
```

## Setup

```bash
# 1. Create & activate a virtual environment (Python 3.12)
python3.12 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env   # then fill in your keys

# 4. Run the server
uvicorn src.main:app --reload
```

## Tech Stack

| Layer         | Technology            |
| ------------- | --------------------- |
| LLM           | OpenAI (GPT-4.1)      |
| Orchestration | LangGraph + LangChain |
| API           | FastAPI               |
| Validation    | Pydantic v2           |
| Language      | Python 3.12           |
