import React, { useState } from 'react';
import type { Clue, Round } from '../types/game';
import { apiService } from '../services/api';
import './ClueModal.css';

interface ClueModalProps {
  clue: Clue | null;
  round: Round | null;
  isOpen: boolean;
  onClose: () => void;
  onAnswerSubmit: (isCorrect: boolean, points: number) => void;
}

const ClueModal: React.FC<ClueModalProps> = ({ clue, round, isOpen, onClose, onAnswerSubmit }) => {
  const [userAnswer, setUserAnswer] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isCorrect: boolean;
    confidence: number;
    explanation: string;
  } | null>(null);

  if (!isOpen || !clue || !round) return null;

  // Find the category name for this clue
  const category = round.categories.find(cat => cat.id === clue.category_id);
  const categoryName = category?.name || 'Unknown Category';

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;

    setIsValidating(true);
    try {
      const result = await apiService.validateAnswer(userAnswer, clue.answer);
      setValidationResult(result);
      
      if (result.isCorrect) {
        onAnswerSubmit(true, clue.value || 0);
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

  const handleClose = () => {
    setUserAnswer('');
    setValidationResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>${clue.value || 0}</h2>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="question-display">
            <h3>{categoryName}</h3>
            <p className="question-text">{clue.question}</p>
            
            <div className="answer-form">
              <label htmlFor="user-answer">Your Answer:</label>
              <input
                id="user-answer"
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="answer-input"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && userAnswer.trim()) {
                    handleSubmitAnswer();
                  }
                }}
              />
              <button 
                className="action-button"
                onClick={handleSubmitAnswer}
                disabled={isValidating || !userAnswer.trim()}
              >
                {isValidating ? 'Validating...' : 'Submit Answer'}
              </button>
            </div>

            {validationResult && (
              <div className={`validation-result ${validationResult.isCorrect ? 'correct' : 'incorrect'}`}>
                <h4>{validationResult.isCorrect ? 'Correct!' : 'Incorrect'}</h4>
                <p>Confidence: {(validationResult.confidence * 100).toFixed(1)}%</p>
                <p>{validationResult.explanation}</p>
                <div className="correct-answer">
                  <h5>Correct Answer:</h5>
                  <p>{clue.answer}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClueModal; 