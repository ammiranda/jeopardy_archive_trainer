import React, { useState, useEffect } from 'react';
import type { Clue, Round } from '../types/game';
import { apiService } from '../services/api';
import './FinalJeopardy.css';

interface FinalJeopardyProps {
  clue: Clue;
  round: Round;
  onAnswerSubmit: (isCorrect: boolean, points: number) => void;
  onNewRound: () => void;
}

const FinalJeopardy: React.FC<FinalJeopardyProps> = ({ clue, round, onAnswerSubmit, onNewRound }) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isCorrect: boolean;
    confidence: number;
    explanation: string;
  } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  const category = round.categories.find(cat => cat.id === clue.category_id);
  const categoryName = category?.name || 'Unknown Category';

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;

    setIsValidating(true);
    try {
      const result = await apiService.validateAnswer(userAnswer, clue.answer);
      setValidationResult(result);
      
      if (result.isCorrect) {
        setShowCelebration(true);
        onAnswerSubmit(true, clue.value || 0);
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        onAnswerSubmit(false, clue.value || 0);
      }
    } catch (error) {
      console.error('Error validating answer:', error);
      setValidationResult({
        isCorrect: false,
        confidence: 0,
        explanation: 'Error validating answer'
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setUserAnswer('');
    setValidationResult(null);
    setShowCelebration(false);
  };

  useEffect(() => {
    handleReset();
  }, [clue.id]);

  return (
    <div className="final-jeopardy">
      {showCelebration && (
        <div className="celebration-overlay">
          <div className="confetti">
            {[...Array(50)].map((_, i) => (
              <div 
                key={i} 
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  backgroundColor: ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'][Math.floor(Math.random() * 5)]
                }}
              />
            ))}
          </div>
          <div className="celebration-text">
            <h1>🎉 CORRECT! 🎉</h1>
            <p>You got it right!</p>
          </div>
        </div>
      )}

      <div className="final-jeopardy-container">
        <div className="final-header">
          <h1>Final Jeopardy</h1>
          <div className="category-badge">{categoryName}</div>
        </div>

        <div className="final-question-card">
          <p className="final-question">{clue.question}</p>
        </div>

        <div className="final-answer-section">
          <label htmlFor="final-answer">Your Answer:</label>
          <div className="final-input-group">
            <input
              id="final-answer"
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="final-answer-input"
              disabled={isValidating || validationResult?.isCorrect === true}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && userAnswer.trim() && !validationResult) {
                  handleSubmitAnswer();
                }
              }}
            />
            {!validationResult && (
              <button 
                className="final-submit-btn"
                onClick={handleSubmitAnswer}
                disabled={isValidating || !userAnswer.trim()}
              >
                {isValidating ? '...' : 'Submit'}
              </button>
            )}
          </div>
        </div>

        {validationResult && (
          <div className={`final-result ${validationResult.isCorrect ? 'correct' : 'incorrect'}`}>
            <h2>{validationResult.isCorrect ? 'Correct!' : 'Incorrect'}</h2>
            <p className="confidence">
              Confidence: {(validationResult.confidence * 100).toFixed(1)}%
            </p>
            <p className="explanation">{validationResult.explanation}</p>
            <div className="correct-answer-display">
              <span className="answer-label">Correct Answer:</span>
              <span className="answer-value">{clue.answer}</span>
            </div>
            <button className="new-round-btn" onClick={onNewRound}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinalJeopardy;
