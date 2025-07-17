import React from 'react';
import type { Round, Clue } from '../types/game';
import './JeopardyBoard.css';

interface JeopardyBoardProps {
  round: Round;
  onClueClick: (clue: Clue) => void;
  answeredClues: Set<string>;
  incorrectClues: Set<string>;
  roundTypeLabel: string;
}

const JeopardyBoard: React.FC<JeopardyBoardProps> = ({ round, onClueClick, answeredClues, incorrectClues, roundTypeLabel }) => {
  const values = [200, 400, 600, 800, 1000];
  
  // Group clues by category
  const cluesByCategory = round.categories.map(category => {
    const categoryClues = round.clues.filter(clue => clue.category_id === category.id);
    return {
      category,
      clues: categoryClues
    };
  });

  return (
    <div className="jeopardy-board">
      <div className="board-header">
        <h1>{roundTypeLabel}</h1>
      </div>
      
      <div className="categories-row">
        {round.categories.map((category, index) => (
          <div key={category.id} className="category-header">
            {category.name}
          </div>
        ))}
      </div>
      
      <div className="clues-grid">
        {values.map((value, rowIndex) => (
          <div key={value} className="clue-row">
            {cluesByCategory.map((categoryData, colIndex) => {
              const clue = categoryData.clues[rowIndex];
              const isAnswered = clue ? answeredClues.has(clue.id) : false;
              const isIncorrect = clue ? incorrectClues.has(clue.id) : false;
              
              return (
                <div key={`${categoryData.category.id}-${clue?.value}`} className="clue-cell">
                  {clue ? (
                    <button
                      className={`clue-button ${isAnswered ? 'answered' : ''} ${isIncorrect ? 'incorrect' : ''}`}
                      onClick={() => !isAnswered && onClueClick(clue)}
                      disabled={isAnswered}
                    >
                      {isAnswered ? (isIncorrect ? '✗' : '✓') : `$${clue?.value}`}
                    </button>
                  ) : (
                    <div className="empty-clue">$0</div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JeopardyBoard; 