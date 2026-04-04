FROM python:3.13-slim
WORKDIR /app

# Install system dependencies for ML packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/ ./backend
COPY backend/requirements.txt ./requirements.txt

# Install Python dependencies
RUN pip install -r requirements.txt

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"] 