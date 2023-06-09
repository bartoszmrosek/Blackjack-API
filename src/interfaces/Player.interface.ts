import { TypedSocketWithUser } from './Socket.interface';

export type PlayerStatus = 'playing' | 'bust' | 'won' | 'lost' | 'blackjack' | 'push'
export type PlayerDecision = 'hit' | 'stand' | 'doubleDown'

export interface Player {
  socket: TypedSocketWithUser,
  seatId: number,
  userId: number,
  bet: number,
  previousBet: number,
  username: string,
}

export interface ActivePlayer extends Player{
  status: PlayerStatus,
  cards: string[],
  cardsScore: number[],
  decision: PlayerDecision | null;
  hasMadeFinalDecision: boolean,
}
