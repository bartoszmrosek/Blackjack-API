import { GameState, PresenterState } from '../interfaces/Table.interfaces';

export const initialGameState: Readonly<GameState> = {
  isGameStarting: false,
  isGameStarted: false,
  isGameFinished: false,
};

export const initialPresenterState: Readonly<PresenterState> = {
  cards: [],
  score: [0],
  didGetBlackjack: false,
};
