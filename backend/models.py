from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from enum import Enum

class RoundType(str, Enum):
    jeopardy = "jeopardy"
    double_jeopardy = "doublejeopardy"
    final_jeopardy = "finaljeopardy"

class LLMProvider(str, Enum):
    sentence_transformer = "sentence_transformer"
    openrouter = "openrouter"
    openai = "openai"
    ollama = "ollama"

class Category(BaseModel):
    id: UUID
    name: str

class Clue(BaseModel):
    id: UUID
    category_id: UUID
    question: str
    answer: str
    value: Optional[int]
    display_value: Optional[int] = None
    row: Optional[int] = None
    round: RoundType
    air_date: Optional[str]

class Round(BaseModel):
    id: UUID
    categories: List[Category]
    clues: List[Clue]

class AnswerValidationRequest(BaseModel):
    user_answer: str
    correct_answer: str

class AnswerValidationResponse(BaseModel):
    is_correct: bool
    confidence: float
    explanation: str

class LLMConfig(BaseModel):
    provider: LLMProvider
    model: Optional[str] = None
    similarity_threshold: Optional[float] = 0.75

class LLMConfigResponse(BaseModel):
    provider: LLMProvider
    model: Optional[str] = None
    similarity_threshold: Optional[float] = 0.75
    available_providers: List[str]