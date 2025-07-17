export interface Clue {
  id: string;
  category_id: string;
  question: string;
  answer: string;
  value: number | null;
  round: 'Jeopardy' | 'Double Jeopardy' | 'Final Jeopardy';
  air_date: string | null;
}

export interface Category {
  id: string;
  name: string;
}

export interface Round {
  id: string;
  categories: Category[];
  clues: Clue[];
}

export interface GameState {
  currentRound: Round | null;
  selectedClue: Clue | null;
  isQuestionVisible: boolean;
  isAnswerVisible: boolean;
  userAnswer: string;
  isAnswerCorrect: boolean | null;
  score: number;
  answeredClues: Set<string>;
}

export type RoundType = 'jeopardy' | 'doublejeopardy' | 'finaljeopardy'; 