import { TypedSocketWithUser } from './Socket.interface';

export type PlayerStatus = 'playing' | 'bust' | 'won' | 'lost' | 'blackjack'

export interface Player {
  user: TypedSocketWithUser,
  seatId: number,
  bet: number,
  reservedBalance: number,
}

export interface ActivePlayer extends Player{
  status: PlayerStatus,
  cards: string[],
  cardsScore: number[],
  hasMadeFinalDecision: boolean,
}
