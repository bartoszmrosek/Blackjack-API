import { Socket } from 'socket.io';
import User from '../entity/user.entity';
import { ActivePlayer, Player, PlayerDecision } from './Player.interface';
import { GameState } from './Table.interfaces';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithTimeoutAck<isSender extends boolean, args extends any[]> =
isSender extends true ? [Error, ...args] : args;

type SocketSafeActivePlayer = Omit<ActivePlayer, 'socket' | 'reservedBalance'>;
type SocketSafePendingPlayer = Omit<Player, 'socket' | 'reservedBalance'>;

type GameStatusObject = {
    gameState: GameState,
    timer: number,
    activePlayers: SocketSafeActivePlayer[],
    pendingPlayers: SocketSafePendingPlayer[],
    presenterState: {cards: string[], score: number[]},
    currentlyAsking: {userId: number, seatId: number} | null,
}

export interface ServerToClienEvents<isSender extends boolean = false>{
    gameTimerStarting: (timerTime: number)=>void;
    userJoinedSeat: ({ username, userId, seatId }:
        {username: string, userId: number, seatId: number, timer: number}
    )=>void;
    userLeftSeat: ({
      userId,
      seatId,
      username,
    }: {userId: number, seatId: number; username: string})=>void;
    userLeftGame: (userId: number)=>void;
    betPlaced: (bet: number, seatId: number)=>void;
    gameStatusUpdate: (
        {
          gameState,
          timer,
          activePlayers,
          pendingPlayers,
          presenterState,
          currentlyAsking,
        }: GameStatusObject
    )=>void,
    gameStarts: ({
      gameState,
      timer,
      activePlayers,
      pendingPlayers,
      presenterState,
      currentlyAsking,
    }: GameStatusObject)=>void,
    askingStatusUpdate: (currentlyAsking: GameStatusObject['currentlyAsking'])=>void;
    userMadeDecision: (currentlyAsking: GameStatusObject['currentlyAsking'], decision: PlayerDecision, card?: string)=>void
    getPlayerDecision: (seatId: number,
         callback: (...args: WithTimeoutAck<isSender, [PlayerDecision]>)=>void
    )=>void;
    presenterTime: (
        {
          gameState,
          timer,
          activePlayers,
          pendingPlayers,
          presenterState,
          currentlyAsking,
        }: GameStatusObject
    )=>void,
    newPresenterCard: (card: string)=>void;
    gameEnded: (
        {
          gameState,
          timer,
          activePlayers,
          pendingPlayers,
          presenterState,
          currentlyAsking,
        }: GameStatusObject
    )=>void,
    balanceUpdate: (newBalance: number)=>void
}

export interface ClientToServerEvents{
    joinGameTable: (roomId: string, callback:
      (code: number, user?: {username: string, userId: number, balance: number})
      =>void)=>void;
    joinTableSeat: (seatId: number, callback: (ack: number, newBalance?: number)=>void)=>void;
    leaveTableSeat: (seatId: number)=>void;
    placeBet: (bet: number, seatId: number, callback: (ack: number)=>void)=>void;
}

export type TypedSocket = Socket<ClientToServerEvents, ServerToClienEvents>;
export interface TypedSocketWithUser extends TypedSocket {
    user: User
}
