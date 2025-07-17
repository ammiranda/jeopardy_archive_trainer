var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { apiService } from '../services/api';
import './ClueModal.css';
const ClueModal = ({ clue, round, isOpen, onClose, onAnswerSubmit }) => {
    const [userAnswer, setUserAnswer] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);
    if (!isOpen || !clue || !round)
        return null;
    // Find the category name for this clue
    const category = round.categories.find(cat => cat.id === clue.category_id);
    const categoryName = (category === null || category === void 0 ? void 0 : category.name) || 'Unknown Category';
    const handleSubmitAnswer = () => __awaiter(void 0, void 0, void 0, function* () {
        if (!userAnswer.trim())
            return;
        setIsValidating(true);
        try {
            const result = yield apiService.validateAnswer(userAnswer, clue.answer);
            setValidationResult(result);
            if (result.isCorrect) {
                onAnswerSubmit(true, clue.value || 0);
            }
            else {
                onAnswerSubmit(false, 0);
            }
        }
        catch (error) {
            console.error('Error validating answer:', error);
            setValidationResult({
                isCorrect: false,
                confidence: 0,
                explanation: 'Error validating answer'
            });
        }
        finally {
            setIsValidating(false);
        }
    });
    const handleClose = () => {
        setUserAnswer('');
        setValidationResult(null);
        onClose();
    };
    return (_jsx("div", { className: "modal-overlay", onClick: handleClose, children: _jsxs("div", { className: "modal-content", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "modal-header", children: [_jsxs("h2", { children: ["$", clue.value || 0] }), _jsx("button", { className: "close-button", onClick: handleClose, children: "\u00D7" })] }), _jsx("div", { className: "modal-body", children: _jsxs("div", { className: "question-display", children: [_jsx("h3", { children: categoryName }), _jsx("h4", { children: "Question:" }), _jsx("p", { className: "question-text", children: clue.question }), _jsxs("div", { className: "answer-form", children: [_jsx("label", { htmlFor: "user-answer", children: "Your Answer:" }), _jsx("input", { id: "user-answer", type: "text", value: userAnswer, onChange: (e) => setUserAnswer(e.target.value), placeholder: "Type your answer...", className: "answer-input", onKeyPress: (e) => {
                                            if (e.key === 'Enter' && userAnswer.trim()) {
                                                handleSubmitAnswer();
                                            }
                                        } }), _jsx("button", { className: "action-button", onClick: handleSubmitAnswer, disabled: isValidating || !userAnswer.trim(), children: isValidating ? 'Validating...' : 'Submit Answer' })] }), validationResult && (_jsxs("div", { className: `validation-result ${validationResult.isCorrect ? 'correct' : 'incorrect'}`, children: [_jsx("h4", { children: validationResult.isCorrect ? 'Correct!' : 'Incorrect' }), _jsxs("p", { children: ["Confidence: ", (validationResult.confidence * 100).toFixed(1), "%"] }), _jsx("p", { children: validationResult.explanation }), _jsxs("div", { className: "correct-answer", children: [_jsx("h5", { children: "Correct Answer:" }), _jsx("p", { children: clue.answer })] })] }))] }) })] }) }));
};
export default ClueModal;
