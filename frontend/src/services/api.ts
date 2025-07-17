import type { Round, RoundType } from '../types/game';

const API_BASE_URL = 'http://localhost:8000';

export const apiService = {
  async generateRound(roundType: RoundType = 'jeopardy'): Promise<Round> {
    const response = await fetch(`${API_BASE_URL}/rounds/generate?round_type=${roundType}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to generate round: ${response.statusText}`);
    }

    return response.json();
  },

  async validateAnswer(userAnswer: string, correctAnswer: string): Promise<{ isCorrect: boolean; confidence: number; explanation: string }> {
    const response = await fetch(`${API_BASE_URL}/validate-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_answer: userAnswer,
        correct_answer: correctAnswer,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to validate answer: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      isCorrect: result.is_correct,
      confidence: result.confidence,
      explanation: result.explanation,
    };
  }
};