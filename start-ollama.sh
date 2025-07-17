#!/bin/sh
set -e

echo "Starting Ollama server..."
ollama serve &

echo "Waiting for Ollama to be ready..."
sleep 10

echo "Pulling model llama3.2:1b..."
ollama pull qwen2.5:0.5b

echo "Warming up model with test prompt..."
ollama run qwen2.5:0.5b "What is the capital of France?" --verbose

echo "Setup complete, keeping container running..."
wait