var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import JeopardyBoard from './components/JeopardyBoard';
import ClueModal from './components/ClueModal';
import { apiService } from './services/api';
import './App.css';
function App() {
    const [currentRound, setCurrentRound] = useState(null);
    const [selectedClue, setSelectedClue] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [score, setScore] = useState(0);
    const [answeredClues, setAnsweredClues] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const generateNewRound = (...args_1) => __awaiter(this, [...args_1], void 0, function* (roundType = 'jeopardy') {
        setIsLoading(true);
        setError(null);
        try {
            const round = yield apiService.generateRound(roundType);
            setCurrentRound(round);
            setAnsweredClues(new Set());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate round');
        }
        finally {
            setIsLoading(false);
        }
    });
    useEffect(() => {
        generateNewRound();
    }, []);
    const handleClueClick = (clue) => {
        setSelectedClue(clue);
        setIsModalOpen(true);
    };
    const handleModalClose = () => {
        setIsModalOpen(false);
        setSelectedClue(null);
    };
    const handleAnswerSubmit = (isCorrect, points) => {
        if (selectedClue) {
            setAnsweredClues(prev => new Set([...prev, selectedClue.id]));
            if (isCorrect) {
                setScore(prev => prev + points);
            }
            else {
                setScore(prev => Math.max(0, prev - points));
            }
        }
    };
    const handleNewGame = () => {
        setScore(0);
        generateNewRound();
    };
    if (isLoading) {
        return (_jsxs("div", { className: "loading", children: [_jsx("h2", { children: "Loading Jeopardy Round..." }), _jsx("div", { className: "spinner" })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "error", children: [_jsx("h2", { children: "Error" }), _jsx("p", { children: error }), _jsx("button", { onClick: () => generateNewRound(), children: "Try Again" })] }));
    }
    return (_jsxs("div", { className: "app", children: [_jsxs("div", { className: "game-header", children: [_jsx("div", { className: "score-display", children: _jsxs("h2", { children: ["Score: $", score] }) }), _jsx("div", { className: "game-controls", children: _jsx("button", { onClick: handleNewGame, className: "new-game-button", children: "New Game" }) })] }), currentRound && (_jsx(JeopardyBoard, { round: currentRound, onClueClick: handleClueClick, answeredClues: answeredClues })), _jsx(ClueModal, { clue: selectedClue, round: currentRound, isOpen: isModalOpen, onClose: handleModalClose, onAnswerSubmit: handleAnswerSubmit })] }));
}
export default App;
