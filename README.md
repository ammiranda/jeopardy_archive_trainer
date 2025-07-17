# Jeopardy Archive Trainer

A FastAPI backend and React frontend for generating Jeopardy rounds from past questions and categories, with LLM-powered answer validation.

## Running Locally with Docker Compose

### Prerequisites
- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/) installed
- Kaggle API credentials (see below)
- (Optional) Ollama model will be pulled automatically, but requires internet access

### 1. Setup Environment Variables

Create a `.env` file in the project root (you can copy `.env.example`):

```
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_KEY=your_kaggle_key
JEOPARDY_DATASET_ID=alexandermiranda/jeopardy-dataset
```

### 2. Build and Start All Services

For production (static frontend build):
```bash
make docker-up
```
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:8000](http://localhost:8000)
- Ollama (LLM): [http://localhost:11434](http://localhost:11434)

For development (hot reload, Vite dev server):
```bash
make docker-dev
```
- Frontend (Vite): [http://localhost:5173](http://localhost:5173)

### 3. Stopping Services
```bash
make docker-down
```

### 4. Troubleshooting
- **Ollama model not found:** The Ollama service will automatically pull the model specified in `OLLAMA_MODELS` (default: `llama3`). If you see errors, check Ollama logs: `docker compose logs ollama`.
- **Kaggle credentials error:** Ensure your `.env` file is present and correct. The loader service will fail if credentials or dataset ID are missing.
- **Database not loading:** The loader service runs automatically to populate the SQLite database. Check its logs for errors.
- **Backend can't reach Ollama:** The backend is configured to use the `ollama` service hostname. If you see connection errors, ensure both services are up and healthy.

---

## LLM Integration (Ollama)

Ollama is started as a service in Docker Compose. The backend uses it for answer validation. The model is pulled automatically on first run.

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
JEOPARDY_DATASET_ID=alexandermiranda/jeopardy-dataset
```

You can use the provided `.env.example` as a template.

These credentials are required for downloading the Jeopardy dataset using KaggleHub. 