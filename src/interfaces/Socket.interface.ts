import { Socket } from 'socket.io';
import User from '../entity/user.entity';
import { ActivePlayer, Player } from './Player.interface';

type WithTimeoutAck<isSender extends boolean, args extends any[]> =
isSender extends true ? [Error, ...args] : args;

type SocketSafeActivePlayer = Omit<ActivePlayer, 'user' | 'reservedBalance'>;
type SocketSafePendingPlayer = Omit<Player, 'user' | 'reservedBalance'>;

export interface ServerToClienEvents{
    gameTimerStarting: (timerTime: number)=>void;
    userJoinedSeat: ({ username, userId, seatId }:
        {username: string, userId: number, seatId: number}
    )=>void;
    userLeftSeat: ({ userId, seatId }: {userId: number, seatId: number})=>void;
    userLeftGame: (userId: number)=>void;
    betPlaced: (bet: number, seatId: number)=>void;
    gameStarting: (
        activePlayers: SocketSafeActivePlayer[],
        pendingPlayers: SocketSafePendingPlayer[]
        )=>void;
    gameStatusUpdate: (
        timer: number,
        activePlayers: SocketSafeActivePlayer[],
        pendingPlayers: SocketSafePendingPlayer[])=>void
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
