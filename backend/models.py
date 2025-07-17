from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID
from enum import Enum

class RoundType(str, Enum):
    jeopardy = "jeopardy"
    double_jeopardy = "doublejeopardy"
    final_jeopardy = "finaljeopardy"

class Category(BaseModel):
    id: UUID
    name: str

class Clue(BaseModel):
    id: UUID
    category_id: UUID
    question: str
    answer: str
    value: Optional[int]
    round: RoundType
    air_date: Optional[str]

class Round(BaseModel):
    id: UUID
    categories: List[Category]
    clues: List[Clue]  # grouped by category in logic, flat here for simplicity 

class AnswerValidationRequest(BaseModel):
    user_answer: str
    correct_answer: str

class AnswerValidationResponse(BaseModel):
    is_correct: bool
    confidence: float
    explanation: str