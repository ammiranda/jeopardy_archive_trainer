import React, { useState, useEffect } from 'react';
import JeopardyBoard from './components/JeopardyBoard';
import ClueModal from './components/ClueModal';
import { apiService } from './services/api';
import type { Round, Clue, RoundType } from './types/game';
import './App.css';

function App() {
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [answeredClues, setAnsweredClues] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roundType, setRoundType] = useState<RoundType>('jeopardy');

  const roundTypeLabels: Record<RoundType, string> = {
    jeopardy: 'Jeopardy',
    doublejeopardy: 'Double Jeopardy',
    finaljeopardy: 'Final Jeopardy',
  };

  const generateNewRound = async (type: RoundType = roundType) => {
    setIsLoading(true);
    setError(null);
    try {
      const round = await apiService.generateRound(type);
      setCurrentRound(round);
      setAnsweredClues(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate round');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateNewRound(roundType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundType]);

  const handleClueClick = (clue: Clue) => {
    setSelectedClue(clue);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedClue(null);
  };

  const handleAnswerSubmit = (isCorrect: boolean, points: number) => {
    if (selectedClue) {
      setAnsweredClues(prev => new Set([...prev, selectedClue.id]));
      if (isCorrect) {
        setScore(prev => prev + points);
      } else {
        setScore(prev => Math.max(0, prev - points));
      }
    }
  };

  const handleNewGame = () => {
    setScore(0);
    generateNewRound(roundType);
  };

  const handleRoundTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoundType(e.target.value as RoundType);
    setScore(0);
  };

  if (isLoading) {
    return (
      <div className="loading">
        <h2>Loading Jeopardy Round...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => generateNewRound(roundType)}>Try Again</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-header">
        <div className="score-display">
          <h2>Score: ${score}</h2>
        </div>
        <div className="game-controls">
          <label htmlFor="round-type-select" style={{ color: 'white', marginRight: 12 }}>
            Round:
          </label>
          <select
            id="round-type-select"
            value={roundType}
            onChange={handleRoundTypeChange}
            style={{ marginRight: 16, padding: '6px 12px', borderRadius: 6 }}
          >
            <option value="jeopardy">Jeopardy</option>
            <option value="doublejeopardy">Double Jeopardy</option>
            <option value="finaljeopardy">Final Jeopardy</option>
          </select>
          <button onClick={handleNewGame} className="new-game-button">
            New Game
          </button>
        </div>
      </div>
      {currentRound && (
        <JeopardyBoard
          round={currentRound}
          onClueClick={handleClueClick}
          answeredClues={answeredClues}
          roundTypeLabel={roundTypeLabels[roundType]}
        />
      )}
      <ClueModal
        clue={selectedClue}
        round={currentRound}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onAnswerSubmit={handleAnswerSubmit}
      />
    </div>
  );
}

export default App;
