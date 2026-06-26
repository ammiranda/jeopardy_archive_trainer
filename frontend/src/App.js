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
import FinalJeopardy from './components/FinalJeopardy';
import Settings from './components/Settings';
import { apiService } from './services/api';
import './App.css';
function App() {
    const [currentRound, setCurrentRound] = useState(null);
    const [selectedClue, setSelectedClue] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [score, setScore] = useState(0);
    const [answeredClues, setAnsweredClues] = useState(new Set());
    const [incorrectClues, setIncorrectClues] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [roundType, setRoundType] = useState('jeopardy');
    const roundTypeLabels = {
        jeopardy: 'Jeopardy',
        doublejeopardy: 'Double Jeopardy',
        finaljeopardy: 'Final Jeopardy',
    };
    const generateNewRound = (...args_1) => __awaiter(this, [...args_1], void 0, function* (type = roundType) {
        setIsLoading(true);
        setError(null);
        try {
            const round = yield apiService.generateRound(type);
            setCurrentRound(round);
            setAnsweredClues(new Set());
            setIncorrectClues(new Set());
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate round');
        }
        finally {
            setIsLoading(false);
        }
    });
    useEffect(() => {
        generateNewRound(roundType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roundType]);
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
                setIncorrectClues(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedClue.id);
                    return newSet;
                });
            }
            else {
                setScore(prev => prev - points);
                setIncorrectClues(prev => new Set([...prev, selectedClue.id]));
            }
        }
    };
    const handleNewGame = () => {
        setScore(0);
        generateNewRound(roundType);
    };
    const handleRoundTypeChange = (e) => {
        setRoundType(e.target.value);
        setScore(0);
    };
    if (isLoading) {
        return (_jsxs("div", { className: "loading", children: [_jsx("h2", { children: "Loading Jeopardy Round..." }), _jsx("div", { className: "spinner" })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "error", children: [_jsx("h2", { children: "Error" }), _jsx("p", { children: error }), _jsx("button", { onClick: () => generateNewRound(roundType), children: "Try Again" })] }));
    }
    return (_jsxs("div", { className: "app", children: [_jsxs("div", { className: "game-header", children: [_jsx("div", { className: "score-display", children: _jsxs("h2", { children: ["Score: $", score] }) }), _jsxs("div", { className: "game-controls", children: [_jsx("label", { htmlFor: "round-type-select", style: { color: 'white', marginRight: 12 }, children: "Round:" }), _jsxs("select", { id: "round-type-select", value: roundType, onChange: handleRoundTypeChange, style: { marginRight: 16, padding: '6px 12px', borderRadius: 6 }, children: [_jsx("option", { value: "jeopardy", children: "Jeopardy" }), _jsx("option", { value: "doublejeopardy", children: "Double Jeopardy" }), _jsx("option", { value: "finaljeopardy", children: "Final Jeopardy" })] }), _jsx("button", { onClick: handleNewGame, className: "new-game-button", children: "New Game" }), _jsx("button", { onClick: () => setIsSettingsOpen(true), className: "settings-button", style: { marginLeft: 12, padding: '6px 12px', borderRadius: 6 }, children: "Settings" })] })] }), currentRound && roundType === 'finaljeopardy' && currentRound.clues.length > 0 && (_jsx(FinalJeopardy, { clue: currentRound.clues[0], round: currentRound, onAnswerSubmit: handleAnswerSubmit, onNewRound: handleNewGame })), currentRound && roundType !== 'finaljeopardy' && (_jsx(JeopardyBoard, { round: currentRound, onClueClick: handleClueClick, answeredClues: answeredClues, incorrectClues: incorrectClues, roundTypeLabel: roundTypeLabels[roundType] })), _jsx(ClueModal, { clue: selectedClue, round: currentRound, isOpen: isModalOpen, onClose: handleModalClose, onAnswerSubmit: handleAnswerSubmit }), _jsx(Settings, { isOpen: isSettingsOpen, onClose: () => setIsSettingsOpen(false) })] }));
}
export default App;
