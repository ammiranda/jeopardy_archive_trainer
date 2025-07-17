# Jeopardy Archive MCP (Model Context Protocol)

A FastAPI backend and React frontend for generating Jeopardy rounds from past questions and categories, with LLM-powered answer validation.

## Setup (Docker Compose)

### Production (Static Build)

1. **Build and start all services:**
   ```bash
   docker compose up --build
   ```
   - Frontend: [http://localhost:5173](http://localhost:5173)
   - Backend: [http://localhost:8000](http://localhost:8000)
   - Ollama: [http://localhost:11434](http://localhost:11434)

2. **Stop all services:**
   ```bash
   docker compose down
   ```

### Development (Vite Dev Server)

1. **Build and start with hot reload:**
   ```bash
   docker compose --profile dev up --build
   ```
   - Frontend (Vite): [http://localhost:5173](http://localhost:5173)

2. **Stop all services:**
   ```bash
   docker compose down
   ```

## LLM Integration (Ollama)

Ollama is automatically started as a service in Docker Compose. The backend will use it for answer validation.

## Local (Non-Docker) Setup

You can still run everything locally with Makefile commands (see below).

## Makefile Commands

- `make run` — Start FastAPI backend locally
- `make frontend` — Start React frontend locally (Vite dev server)
- `make load-db` — Load Jeopardy data into the database
- `make webui` — Start Open WebUI for LLM chat
- `make ollama-setup` — Pull the LLM model for Ollama

## Endpoints

- `GET /` — Root endpoint
- `POST /rounds/generate` — Generate a new Jeopardy round
- `POST /validate-answer` — Validate user answers using LLM

## Data

Sample data is in `data/jeopardy_sample.json`.

## Kaggle Credentials

Before running the loader script, you must create a `.env` file in the project root with your Kaggle credentials:

```
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_key
```

You can use the provided `.env.example` as a template.

These credentials are required for downloading the Jeopardy dataset using KaggleHub. 