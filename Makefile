VENV_DIR=.venv

.PHONY: venv
venv:
	uv venv .venv
	uv pip install -r backend/requirements.txt

.PHONY: run
run:
	.venv/bin/uvicorn backend.main:app --reload

.PHONY: create-env
create-env:
	cp .env.example .env

.PHONY: lint
lint:
	ruff backend

.PHONY: load-db
load-db:
	.venv/bin/python scripts/load_jeopardy_csv.py

.PHONY: webui
webui:
	docker run -d \
	  -p 3000:8080 \
	  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
	  --name open-webui \
	  --restart always \
	  ghcr.io/open-webui/open-webui:main
# On Linux, use -e OLLAMA_BASE_URL=http://localhost:11434 instead

.PHONY: frontend
frontend:
	cd frontend && npm run dev

.PHONY: ollama-setup
ollama-setup:
	ollama pull llama3

.PHONY: docker-up
docker-up:
	docker compose up --build

.PHONY: docker-down
docker-down:
	docker compose down

.PHONY: docker-dev
docker-dev:
	docker compose --profile dev up --build