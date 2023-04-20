import { TypedSocketWithUser } from './Socket.interface';

export type PlayerStatus = 'playing' | 'bust' | 'won' | 'lost' | 'blackjack'
export type PlayerDecision = 'hit' | 'stand' | 'doubleDown'

export interface Player {
  user: TypedSocketWithUser,
  seatId: number,
  bet: number,
}

export interface ActivePlayer extends Player{
  status: PlayerStatus,
  cards: string[],
  cardsScore: number[],
  decision: PlayerDecision | null;
  hasMadeFinalDecision: boolean,
}
