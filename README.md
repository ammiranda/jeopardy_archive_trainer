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
JEOPARDY_DATASET_ID=tunguz/200000-jeopardy-questions
# To use OpenAI for answer validation, add:
# OPENAI_API_KEY=sk-...
```

### 2. Build and Start All Services

For production (static frontend build):
```bash
make docker-up
```
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:8000](http://localhost:8000)
- Ollama (LLM): [http://localhost:11434](http://localhost:11434) (only needed if not using OpenAI)

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
- **Ollama model not found:** The Ollama service will automatically pull the model specified in `OLLAMA_MODELS` (default: `llama3`). If you see errors, check Ollama logs: `docker compose logs ollama`. You do **not** need Ollama if using OpenAI.
- **Kaggle credentials error:** Ensure your `.env` file is present and correct. The loader service will fail if credentials or dataset ID are missing.
- **Database not loading:** The loader service runs automatically to populate the SQLite database. Check its logs for errors.
- **Backend can't reach Ollama:** The backend will only try to reach Ollama if `OPENAI_API_KEY` is not set. If you are using OpenAI, you do not need to start the Ollama service or use the `--profile ollama` flag.
- **OpenAI issues:** If you want to use OpenAI, set `OPENAI_API_KEY` in your `.env` file. If not set, the backend will default to Ollama.

---

## LLM Provider Selection

The backend will automatically select the LLM provider for answer validation:
- If `OPENAI_API_KEY` is set in your environment, the backend will use OpenAI's API for answer validation.
- If `OPENAI_API_KEY` is **not** set, the backend will use Ollama (if running).
- If neither is available, answer validation will fall back to string comparison.

**To use OpenAI:**
1. Add your OpenAI API key to your `.env` file:
   ```
   OPENAI_API_KEY=sk-...
   ```
2. You do **not** need to start the Ollama service.

**To use Ollama:**
- Do **not** set `OPENAI_API_KEY` in your `.env` file.
- Start the Ollama service (see Docker Compose profiles or use `make docker-up`).

## LLM Integration (Ollama/OpenAI)

- Ollama is started as a service in Docker Compose. The backend uses it for answer validation if OpenAI is not configured. The model is pulled automatically on first run.
- OpenAI is used if you set `OPENAI_API_KEY` in your environment.

## Frontend Features

- The game UI allows you to select the round type (Jeopardy, Double Jeopardy, Final Jeopardy) before starting a new round.
- Score is tracked and displayed.
- Responsive and modern design.

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