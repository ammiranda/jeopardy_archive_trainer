var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const API_BASE_URL = 'http://localhost:8000';
export const apiService = {
    generateRound() {
        return __awaiter(this, arguments, void 0, function* (roundType = 'jeopardy') {
            const response = yield fetch(`${API_BASE_URL}/rounds/generate?round_type=${roundType}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to generate round: ${response.statusText}`);
            }
            return response.json();
        });
    },
    validateAnswer(userAnswer, correctAnswer) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch(`${API_BASE_URL}/validate-answer`, {
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
            const result = yield response.json();
            return {
                isCorrect: result.is_correct,
                confidence: result.confidence,
                explanation: result.explanation,
            };
        });
    }
};
