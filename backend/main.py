from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    Category, Clue, Round, RoundType, 
    AnswerValidationRequest, AnswerValidationResponse,
    LLMProvider, LLMConfig, LLMConfigResponse
)
from uuid import uuid5, NAMESPACE_OID, UUID, uuid4
from typing import Optional
import sqlite3
import random
import os
import requests
import json
import re
import time
import logging
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
try:
    from sentence_transformers import SentenceTransformer
    from sklearn.metrics.pairwise import cosine_similarity
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

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

class ValidatorManager:
    _instance = None
    _lock = threading.Lock()

    def __init__(self):
        self._validator: Optional[LLMValidator] = None
        self._current_provider: Optional[LLMProvider] = None
        self._openai_api_key = os.getenv("OPENAI_API_KEY")
        self._openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
        self._ollama_url = os.getenv("OLLAMA_URL", "http://ollama:11434/api/generate")
        self._openai_model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
        self._openrouter_model = os.getenv("OPENROUTER_MODEL", "openai/gpt-3.5-turbo")
        self._sentence_transformer_model = os.getenv("SENTENCE_TRANSFORMER_MODEL", "all-MiniLM-L6-v2")
        self._sentence_transformer_threshold = float(os.getenv("SENTENCE_TRANSFORMER_THRESHOLD", "0.75"))
        self._initialize_validator()

    @classmethod
    def get_instance(cls) -> "ValidatorManager":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    def _initialize_validator(self):
        if SENTENCE_TRANSFORMERS_AVAILABLE and os.getenv("USE_SENTENCE_TRANSFORMERS", "false").lower() == "true":
            self._validator = SentenceTransformerValidator(
                model_name=self._sentence_transformer_model,
                similarity_threshold=self._sentence_transformer_threshold
            )
            self._current_provider = LLMProvider.sentence_transformer
        elif self._openrouter_api_key:
            self._validator = OpenRouterValidator(
                api_key=self._openrouter_api_key,
                model=self._openrouter_model
            )
            self._current_provider = LLMProvider.openrouter
        elif self._openai_api_key:
            self._validator = OpenAIValidator(
                api_key=self._openai_api_key,
                model=self._openai_model
            )
            self._current_provider = LLMProvider.openai
        elif self._ollama_url:
            self._validator = OllamaValidator(ollama_url=self._ollama_url)
            self._current_provider = LLMProvider.ollama
        else:
            raise ValueError("No LLM provider available")

    def get_config(self) -> LLMConfigResponse:
        available = []
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            available.append(LLMProvider.sentence_transformer.value)
        if self._openrouter_api_key:
            available.append(LLMProvider.openrouter.value)
        if self._openai_api_key:
            available.append(LLMProvider.openai.value)
        if self._ollama_url:
            available.append(LLMProvider.ollama.value)

        return LLMConfigResponse(
            provider=self._current_provider,
            model=self._get_current_model(),
            similarity_threshold=self._sentence_transformer_threshold,
            available_providers=available
        )

    def _get_current_model(self) -> Optional[str]:
        if self._current_provider == LLMProvider.openrouter:
            return self._openrouter_model
        elif self._current_provider == LLMProvider.openai:
            return self._openai_model
        elif self._current_provider == LLMProvider.sentence_transformer:
            return self._sentence_transformer_model
        return None

    def update_config(self, config: LLMConfig) -> LLMConfigResponse:
        provider = config.provider

        if provider == LLMProvider.sentence_transformer:
            if not SENTENCE_TRANSFORMERS_AVAILABLE:
                raise ValueError("Sentence transformers not available")
            self._validator = SentenceTransformerValidator(
                model_name=config.model or self._sentence_transformer_model,
                similarity_threshold=config.similarity_threshold or 0.75
            )
            if config.model:
                self._sentence_transformer_model = config.model
            if config.similarity_threshold:
                self._sentence_transformer_threshold = config.similarity_threshold

        elif provider == LLMProvider.openrouter:
            if not self._openrouter_api_key:
                raise ValueError("OpenRouter API key not configured")
            self._validator = OpenRouterValidator(
                api_key=self._openrouter_api_key,
                model=config.model or self._openrouter_model
            )
            if config.model:
                self._openrouter_model = config.model

        elif provider == LLMProvider.openai:
            if not self._openai_api_key:
                raise ValueError("OpenAI API key not configured")
            self._validator = OpenAIValidator(
                api_key=self._openai_api_key,
                model=config.model or self._openai_model
            )
            if config.model:
                self._openai_model = config.model

        elif provider == LLMProvider.ollama:
            self._validator = OllamaValidator(ollama_url=self._ollama_url)

        self._current_provider = provider
        logger.info(f"[ValidatorManager] Switched to provider={provider.value} model={config.model}")
        return self.get_config()

    async def validate(self, user_answer: str, correct_answer: str) -> AnswerValidationResponse:
        return await self._validator.validate(user_answer, correct_answer)

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
Consider slight misspellings if it results in a valid answer.
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
        start_time = time.time()
        try:
            payload = {
                "model": "llama3.2:3b",
                "prompt": prompt,
                "stream": False
            }
            response = requests.post(self.ollama_url, json=payload, timeout=30)
            elapsed = time.time() - start_time
            logger.info(f"[Ollama] model=llama3.2:3b url={self.ollama_url} duration={elapsed:.3f}s")
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
            elapsed = time.time() - start_time
            logger.error(f"[Ollama] url={self.ollama_url} duration={elapsed:.3f}s error={str(e)}")
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=1.0 if is_correct else 0.0,
                explanation=f"Ollama not available or LLM parsing failed ({str(e)}), using string comparison"
            )

class OpenAIValidator(LLMValidator):
    def __init__(self, api_key, model):
        import openai
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model

    async def validate(self, user_answer: str, correct_answer: str):
        prompt = (
            f"You are a Jeopardy answer checker. "
            f"Question: (not provided)\n"
            f"Correct Answer: {correct_answer}\n"
            f"User's Answer: {user_answer}\n"
            "Consider synonyms, paraphrasing, common variations, and acceptable alternative answers.\n"
            "Do not be concerned with capitalization or use of articles like \"the\" or \"a\" in the correct answer.\n"
            "Consider slight misspellings if it results in a valid answer.\n"
            "Respond ONLY with a JSON object in the following format:\n"
            '{"is_correct": true/false, "confidence": float, "explanation": string}\n'
            "The is_correct field MUST match your explanation."
        )
        start_time = time.time()
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=256,
            )
            elapsed = time.time() - start_time
            logger.info(f"[OpenAI] model={self.model} duration={elapsed:.3f}s")
            content = response.choices[0].message.content
            import re
            import json
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                return AnswerValidationResponse(
                    is_correct=parsed.get('is_correct', False),
                    confidence=float(parsed.get('confidence', 0.0)),
                    explanation=parsed.get('explanation', 'LLM validation failed')
                )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[OpenAI] model={self.model} duration={elapsed:.3f}s error={str(e)}")
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=1.0 if is_correct else 0.0,
                explanation=f"OpenAI not available or LLM parsing failed ({str(e)}), using string comparison"
            )

class OpenRouterValidator(LLMValidator):
    def __init__(self, api_key, model):
        import openai
        self.client = openai.OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
        )
        self.model = model

    async def validate(self, user_answer: str, correct_answer: str):
        prompt = (
            f"You are a Jeopardy answer checker. "
            f"Question: (not provided)\n"
            f"Correct Answer: {correct_answer}\n"
            f"User's Answer: {user_answer}\n"
            "Consider synonyms, paraphrasing, common variations, and acceptable alternative answers.\n"
            "Do not be concerned with capitalization or use of articles like \"the\" or \"a\" in the correct answer.\n"
            "Consider slight misspellings if it results in a valid answer.\n"
            "Respond ONLY with a JSON object in the following format:\n"
            '{"is_correct": true/false, "confidence": float, "explanation": string}\n'
            "The is_correct field MUST match your explanation."
        )
        start_time = time.time()
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=256,
            )
            elapsed = time.time() - start_time
            logger.info(f"[OpenRouter] model={self.model} duration={elapsed:.3f}s")
            content = response.choices[0].message.content
            import re
            import json
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                return AnswerValidationResponse(
                    is_correct=parsed.get('is_correct', False),
                    confidence=float(parsed.get('confidence', 0.0)),
                    explanation=parsed.get('explanation', 'LLM validation failed')
                )
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[OpenRouter] model={self.model} duration={elapsed:.3f}s error={str(e)}")
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=1.0 if is_correct else 0.0,
                explanation=f"OpenRouter not available or LLM parsing failed ({str(e)}), using string comparison"
            )

class SentenceTransformerValidator(LLMValidator):
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", similarity_threshold: float = 0.75):
        if not SENTENCE_TRANSFORMERS_AVAILABLE:
            raise ImportError("sentence-transformers, torch, and scikit-learn are required for SentenceTransformerValidator")
        self.model = SentenceTransformer(model_name)
        self.similarity_threshold = similarity_threshold

    def _preprocess_answer(self, answer: str) -> str:
        """Clean and normalize answers for better comparison"""
        # Remove common prefixes/suffixes and articles
        answer = answer.strip()
        # Remove "What is", "Who is", etc.
        answer = re.sub(r'^(what|who|where|when|how|why)\s+(is|are|was|were)\s+', '', answer, flags=re.IGNORECASE)
        # Remove articles at the beginning
        answer = re.sub(r'^(the|a|an)\s+', '', answer, flags=re.IGNORECASE)
        # Remove extra whitespace
        answer = ' '.join(answer.split())
        return answer.lower()

    async def validate(self, user_answer: str, correct_answer: str):
        """
        Validate answers using sentence transformer embeddings and cosine similarity
        """
        start_time = time.time()
        try:
            user_clean = self._preprocess_answer(user_answer)
            correct_clean = self._preprocess_answer(correct_answer)
            
            if user_clean == correct_clean:
                elapsed = time.time() - start_time
                logger.info(f"[SentenceTransformer] model={self.model.name} duration={elapsed:.6f}s (exact match)")
                return AnswerValidationResponse(
                    is_correct=True,
                    confidence=1.0,
                    explanation="Exact match after normalization"
                )
            
            embeddings = self.model.encode([user_clean, correct_clean])
            user_embedding = embeddings[0].reshape(1, -1)
            correct_embedding = embeddings[1].reshape(1, -1)
            
            similarity = cosine_similarity(user_embedding, correct_embedding)[0][0]
            is_correct = similarity >= self.similarity_threshold
            
            if similarity >= 0.9:
                explanation = f"Very high semantic similarity ({similarity:.3f})"
            elif similarity >= self.similarity_threshold:
                explanation = f"High semantic similarity ({similarity:.3f}), above threshold"
            elif similarity >= 0.5:
                explanation = f"Moderate semantic similarity ({similarity:.3f}), below threshold"
            else:
                explanation = f"Low semantic similarity ({similarity:.3f})"
            
            elapsed = time.time() - start_time
            logger.info(f"[SentenceTransformer] model={self.model.name} duration={elapsed:.6f}s similarity={similarity:.3f}")
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=float(similarity),
                explanation=explanation
            )
            
        except Exception as e:
            elapsed = time.time() - start_time
            logger.error(f"[SentenceTransformer] duration={elapsed:.6f}s error={str(e)}")
            is_correct = user_answer.strip().lower() == correct_answer.strip().lower()
            return AnswerValidationResponse(
                is_correct=is_correct,
                confidence=1.0 if is_correct else 0.0,
                explanation=f"Sentence transformer validation failed ({str(e)}), using string comparison"
            )

validator_manager = ValidatorManager.get_instance()

@app.get("/")
def read_root():
    return {"message": "Jeopardy Archive MCP API"}

@app.get("/config/llm", response_model=LLMConfigResponse)
def get_llm_config():
    """
    Get current LLM configuration including the active provider and available options.
    """
    return validator_manager.get_config()

@app.put("/config/llm", response_model=LLMConfigResponse)
def update_llm_config(config: LLMConfig):
    """
    Update the LLM configuration to switch providers or change model settings.
    """
    try:
        return validator_manager.update_config(config)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/validate-answer", response_model=AnswerValidationResponse)
async def validate_answer(request: AnswerValidationRequest):
    """
    Validate a user's answer against the correct answer using the selected LLM provider.
    """
    return await validator_manager.validate(request.user_answer, request.correct_answer)

STANDARD_VALUES = {
    "jeopardy": [200, 400, 600, 800, 1000],
    "doublejeopardy": [400, 800, 1200, 1600, 2000],
}

def _assign_board_positions(
    rows: list[sqlite3.Row],
    display_values: list[int],
    category_id: UUID,
) -> list[Clue]:
    value_groups: dict[float, list[sqlite3.Row]] = {}
    for r in rows:
        value_groups.setdefault(r["value"], []).append(r)

    sorted_values = sorted(value_groups.keys())
    selected_values = sorted_values[:5]

    clues = []
    for i, val in enumerate(selected_values):
        row = random.choice(value_groups[val])
        clues.append(Clue(
            id=int_to_uuid(row["question"] + row["answer"]),
            category_id=category_id,
            question=row["question"],
            answer=row["answer"],
            value=row["value"],
            display_value=display_values[i],
            row=i + 1,
            round=map_round_type(row["round"]),
            air_date=str(row["air_date"]) if row["air_date"] else None,
        ))
    return clues


@app.post("/rounds/generate", response_model=Round)
def generate_round(round_type: RoundType = Query(RoundType.jeopardy, alias="round_type")):
    db_path = os.path.join(os.path.dirname(__file__), '../data', 'jeopardy.db')
    if not os.path.exists(db_path):
        raise HTTPException(status_code=500, detail="Database not found. Please run the loader script first.")
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    norm_round = normalize_round_type(round_type.value)

    if round_type == RoundType.final_jeopardy:
        cur.execute(
            "SELECT * FROM clues WHERE LOWER(REPLACE(round, ' ', '')) = ? ORDER BY RANDOM() LIMIT 1",
            (norm_round,)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="No Final Jeopardy clues found.")
        category = Category(id=int_to_uuid(row["category"]), name=row["category"])
        clue = Clue(
            id=int_to_uuid(row["question"] + row["answer"]),
            category_id=category.id,
            question=row["question"],
            answer=row["answer"],
            value=row["value"] if "value" in row.keys() else None,
            round=map_round_type(row["round"]) if "round" in row.keys() else RoundType.final_jeopardy,
            air_date=str(row["air_date"]) if "air_date" in row.keys() else None,
        )
        conn.close()
        return Round(id=uuid4(), categories=[category], clues=[clue])

    display_values = STANDARD_VALUES[norm_round]

    cur.execute("""
        SELECT category FROM clues
        WHERE LOWER(REPLACE(round, ' ', '')) = ?
        GROUP BY category
        HAVING COUNT(DISTINCT value) >= 5
    """, (norm_round,))
    complete_categories = [row[0] for row in cur.fetchall()]
    if len(complete_categories) < 6:
        raise HTTPException(
            status_code=500,
            detail=f"Not enough complete categories (need 6, found {len(complete_categories)})."
        )

    selected_categories = random.sample(complete_categories, 6)
    categories = [Category(id=int_to_uuid(cat), name=cat) for cat in selected_categories]
    category_name_to_id = {cat.name: cat.id for cat in categories}

    clues: list[Clue] = []
    for cat in selected_categories:
        cur.execute("""
            SELECT * FROM clues
            WHERE category = ?
              AND LOWER(REPLACE(round, ' ', '')) = ?
            ORDER BY value ASC
        """, (cat, norm_round))
        rows = cur.fetchall()
        cat_id = category_name_to_id[cat]
        clues.extend(_assign_board_positions(rows, display_values, cat_id))

    conn.close()
    return Round(id=uuid4(), categories=categories, clues=clues)