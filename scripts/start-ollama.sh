#!/bin/sh
set -e

echo "Starting Ollama server..."
ollama serve &

echo "Waiting for Ollama to be ready..."
sleep 10

echo "Pulling model llama3.2:1b..."
ollama pull llama3.2:3b

echo "Warming up model with test prompt..."
ollama run llama3.2:3b "What is the capital of France?"

echo "Setup complete, keeping container running..."
wait