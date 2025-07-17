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

  const generateNewRound = async (roundType: RoundType = 'jeopardy') => {
    setIsLoading(true);
    setError(null);
    
    try {
      const round = await apiService.generateRound(roundType);
      setCurrentRound(round);
      setAnsweredClues(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate round');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateNewRound();
  }, []);

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
    generateNewRound();
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
        <button onClick={() => generateNewRound()}>Try Again</button>
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
