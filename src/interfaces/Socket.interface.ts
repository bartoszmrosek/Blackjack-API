import { Socket } from 'socket.io';
import User from '../entity/user.entity';
import { ActivePlayer, Player, PlayerDecision } from './Player.interface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WithTimeoutAck<isSender extends boolean, args extends any[]> =
isSender extends true ? [Error, ...args] : args;

type SocketSafeActivePlayer = Omit<ActivePlayer, 'user' | 'reservedBalance'>;
type SocketSafePendingPlayer = Omit<Player, 'user' | 'reservedBalance'>;

type GameStatusObject = {
    isGameStarted: boolean,
    timer: number,
    activePlayers: SocketSafeActivePlayer[],
    pendingPlayers: SocketSafePendingPlayer[],
    presenterState: {cards: string[], score: number[]},
    currentlyAsking: {userId: number, seatId: number} | null,
}

export interface ServerToClienEvents<isSender extends boolean = false>{
    gameTimerStarting: (timerTime: number)=>void;
    userJoinedSeat: ({ username, userId, seatId }:
        {username: string, userId: number, seatId: number}
    )=>void;
    userLeftSeat: ({ userId, seatId }: {userId: number, seatId: number})=>void;
    userLeftGame: (userId: number)=>void;
    betPlaced: (bet: number, seatId: number)=>void;
    gameStatusUpdate: (
        {
          isGameStarted,
          timer,
          activePlayers,
          pendingPlayers,
          presenterState,
          currentlyAsking,
        }: GameStatusObject
    )=>void,
    askingStatusUpdate: (currentlyAsking: GameStatusObject['currentlyAsking'])=>void;
    userMadeDecision: (currentlyAsking: GameStatusObject['currentlyAsking'], decision: PlayerDecision, card?: string)=>void
    getPlayerDecision: (seatId: number,
         callback: (...args: WithTimeoutAck<isSender, [PlayerDecision]>)=>void
    )=>void;
    presenterTime: (
        {
          isGameStarted,
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
          isGameStarted,
          timer,
          activePlayers,
          pendingPlayers,
          presenterState,
          currentlyAsking,
        }: GameStatusObject
    )=>void
}

export interface ClientToServerEvents{
    joinTableSeat: (seatId: number, callback: (ack: number)=>void)=>void;
    leaveTableSeat: (seatId: number)=>void;
    placeBet: (bet: number, seatId: number, callback: (ack: number)=>void)=>void;
}

export type TypedSocket = Socket<ClientToServerEvents, ServerToClienEvents>;
export interface TypedSocketWithUser extends TypedSocket {
    user: User
}
