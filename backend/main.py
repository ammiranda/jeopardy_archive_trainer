from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .models import Category, Clue, Round, RoundType, AnswerValidationRequest, AnswerValidationResponse
from uuid import uuid5, NAMESPACE_OID, UUID, uuid4
from typing import List
import sqlite3
import random
import os
import requests
import json
from pydantic import BaseModel
import re

app = FastAPI()

# Add CORS middleware to allow all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def int_to_uuid(i):
    # Use a namespace-based UUID for deterministic conversion
    return uuid5(NAMESPACE_OID, str(i))

def map_round_type(round_str: str) -> RoundType:
    if not round_str:
        return RoundType.jeopardy
    s = str(round_str).strip().replace(' ', '').lower()
    if s in ["jeopardy"]:
        return RoundType.jeopardy
    elif s in ["doublejeopardy", "double_jeopardy"]:
        return RoundType.double_jeopardy
    elif s in ["finaljeopardy", "final_jeopardy"]:
        return RoundType.final_jeopardy
    return RoundType.jeopardy

def normalize_round_type(s: str) -> str:
    s = str(s).strip().replace(' ', '').lower()
    if s in ["jeopardy"]:
        return "jeopardy"
    elif s in ["doublejeopardy", "double_jeopardy"]:
        return "doublejeopardy"
    elif s in ["finaljeopardy", "final_jeopardy"]:
        return "finaljeopardy"
    return "jeopardy"

class LLMValidator:
    def validate(self, user_answer: str, correct_answer: str):
        raise NotImplementedError

class OllamaValidator(LLMValidator):
    def __init__(self, ollama_url):
        self.ollama_url = ollama_url

    async def validate(self, user_answer: str, correct_answer: str):
        prompt = f"""
You are a Jeopardy answer validator. Determine if the user's answer is equivalent to the correct answer.

User's answer: \"{user_answer}\"
Correct answer: \"{correct_answer}\"

Consider synonyms, paraphrasing, common variations, and acceptable alternative answers.
Do not be concerned with capitalization or use of articles like \"the\" or \"a\" in the correct answer.
Respond with ONLY a JSON object in this exact format:
{{
    "is_correct": true/false,
    "confidence": 0.0-1.0,
    "explanation": "brief explanation of your reasoning"
}}

The is_correct field should be true if the user's answer is equivalent to the correct answer, and false otherwise.
Also the is_correct field should correlate with the explanation field so if the explanation is explaining why
something is not correct, the is_correct field should be false.

Examples:
- "George Washington" vs "Washington" → is_correct: true
- "Mars" vs "The Red Planet" → is_correct: true  
- "Paris" vs "London" → is_correct: false
"""
        try:
            payload = {
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False
            }
            response = requests.post(self.ollama_url, json=payload, timeout=30)
            response.raise_for_status()
            result = response.json()
            llm_response = result.get('response', '').strip()
            start_idx = llm_response.find('{')
            end_idx = llm_response.rfind('}') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = llm_response[start_idx:end_idx]
                parsed = json.loads(json_str)
                return AnswerValidationResponse(
                    is_correct=parsed.get('is_correct', False),
                    confidence=float(parsed.get('confidence', 0.0)),
                    explanation=parsed.get('explanation', 'LLM validation failed')
                )
        except Exception as e:
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=1.0 if is_correct else 0.0,
                explanation=f"Ollama not available or LLM parsing failed ({str(e)}), using string comparison"
            )

class OpenAIValidator(LLMValidator):
    def __init__(self, api_key):
        import openai
        self.client = openai.OpenAI(api_key=api_key)

    async def validate(self, user_answer: str, correct_answer: str):
        prompt = (
            f"You are a Jeopardy answer checker. "
            f"Question: (not provided)\n"
            f"Correct Answer: {correct_answer}\n"
            f"User's Answer: {user_answer}\n"
            "Respond ONLY with a JSON object in the following format:\n"
            '{"is_correct": true/false, "confidence": float, "explanation": string}\n'
            "The is_correct field MUST match your explanation."
        )
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=256,
            )
            content = response.choices[0].message.content
            import re, json
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                return AnswerValidationResponse(
                    is_correct=parsed.get('is_correct', False),
                    confidence=float(parsed.get('confidence', 0.0)),
                    explanation=parsed.get('explanation', 'LLM validation failed')
                )
        except Exception as e:
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=1.0 if is_correct else 0.0,
                explanation=f"OpenAI not available or LLM parsing failed ({str(e)}), using string comparison"
            )

# Provider selection
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_API_KEY:
    validator = OpenAIValidator(api_key=OPENAI_API_KEY)
else:
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
    if OLLAMA_URL:
        validator = OllamaValidator(ollama_url=OLLAMA_URL)
    else:
        raise ValueError("No LLM provider available: set OPENAI_API_KEY or OLLAMA_URL in the environment.")

@app.get("/")
def read_root():
    return {"message": "Jeopardy Archive MCP API"}

@app.post("/validate-answer", response_model=AnswerValidationResponse)
async def validate_answer(request: AnswerValidationRequest):
    """
    Validate a user's answer against the correct answer using the selected LLM provider.
    """
    return await validator.validate(request.user_answer, request.correct_answer)

@app.post("/rounds/generate", response_model=Round)
def generate_round(round_type: RoundType = Query(RoundType.jeopardy, alias="round_type")):
    db_path = os.path.join(os.path.dirname(__file__), '../data', 'jeopardy.db')
    if not os.path.exists(db_path):
        raise HTTPException(status_code=500, detail="Database not found. Please run the loader script first.")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Use round_type.value directly for filtering
    cur.execute("SELECT DISTINCT category FROM clues WHERE LOWER(REPLACE(round, ' ', '')) = ?", (round_type.value.replace(' ', '').lower(),))
    all_categories = [row[0] for row in cur.fetchall()]
    if len(all_categories) < 6:
        raise HTTPException(status_code=500, detail="Not enough categories in the database for this round type.")
    selected_categories = random.sample(all_categories, 6)

    # Build Category models with UUIDs
    categories = [Category(id=int_to_uuid(cat), name=cat) for cat in selected_categories]
    category_name_to_id = {cat.name: cat.id for cat in categories}

    # For each category, get up to 5 random clues for the specified round
    clues: List[Clue] = []
    for cat in selected_categories:
        cur.execute(
            "SELECT * FROM clues WHERE category = ? AND LOWER(REPLACE(round, ' ', '')) = ? ORDER BY value ASC LIMIT 5",
            (cat, round_type.value.replace(' ', '').lower())
        )
        for row in cur.fetchall():
            clue_id = int_to_uuid(row['question'] + row['answer'])  # UUID from question+answer
            clues.append(Clue(
                id=clue_id,
                category_id=category_name_to_id[cat],
                question=row['question'],
                answer=row['answer'],
                value=row['value'] if 'value' in row.keys() else None,
                round=map_round_type(row['round']) if 'round' in row.keys() else RoundType.jeopardy,
                air_date=str(row['air_date']) if 'air_date' in row.keys() else None
            ))
    conn.close()
    round_id = uuid4()
    return Round(id=round_id, categories=categories, clues=clues) 