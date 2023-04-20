import { TypedSocketWithUser } from 'interfaces/Socket.interface';
import { removeEmptyTable } from '../app.js';
import TableLogic from './TableLogic.js';

export default class Table extends TableLogic {
  constructor(private id: string) {
    super();
  }

  public getTableId() {
    return this.id;
  }

  public getNumOfPlayers() {
    return this.users.length;
  }

  private handleJoinTableSeat(
    user: TypedSocketWithUser,
    seatId: number,
    callback: (ack: number)=>void,
  ) {
    if (seatId < 0 || seatId > 4) {
      return callback(400);
    }
    if (this.pendingPlayers.some((player) => player.seatId === seatId)
       || this.activePlayers.some((activePlayer) => activePlayer.seatId === seatId)) {
      return callback(406);
    }
    this.pendingPlayers.push({
      user, seatId, bet: 0,
    });
    if (this.pendingPlayers.length === 1 && !this.isGameStarting && !this.isGameStarted) {
      this.timerStarting();
    }
    this.users.forEach((currentUser) => {
      if (currentUser.id !== user.id) {
        currentUser.emit('userJoinedSeat', {
          username: user.user.username,
          userId: user.user.id,
          seatId,
        });
      }
    });
    return callback(200);
  }

  private handleLeaveTableSeat(
    user: TypedSocketWithUser,
    seatId: number,
  ) {
    this.pendingPlayers = this.pendingPlayers.filter(
      (pendingPlayer) => pendingPlayer.user.id !== user.id && pendingPlayer.seatId !== seatId,
    );
    this.users.forEach((anotherUser) => {
      anotherUser.emit('userLeftSeat', { userId: user.user.id, seatId });
    });
  }

  private handlePlacingBet(
    user: TypedSocketWithUser,
    bet: number,
    seatId:number,
    callback: (ack: number)=> void,
  ) {
    let isBetPlaced = false;
    this.pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      if (
        pendingPlayer.user.user.id === user.user.id
         && seatId === pendingPlayer.seatId
         && pendingPlayer.user.user.balance - bet >= 0
      ) {
        // eslint-disable-next-line no-param-reassign
        pendingPlayer.user.user.balance -= pendingPlayer.bet;
        this.users.forEach((remainingUser) => {
          if (remainingUser.user.id !== user.user.id) {
            remainingUser.emit('betPlaced', bet, seatId);
          }
        });
        isBetPlaced = true;
        return { ...pendingPlayer, bet };
      }
      return pendingPlayer;
    });
    if (isBetPlaced) {
      callback(200);
    } else {
      callback(406);
    }
  }

  private handleDisconnect(user: TypedSocketWithUser) {
    const remainingUsers = this.users.filter((connectedUser) => connectedUser.id !== user.id);
    remainingUsers.forEach((remainingUser) => {
      remainingUser.emit('userLeftGame', user.user.id);
    });
    this.users = remainingUsers;
    this.pendingPlayers = this.pendingPlayers.filter(
      (pendingPlayer) => pendingPlayer.user.id !== user.id,
    );
    if (this.users.length === 0 && !this.isGameStarted) {
      removeEmptyTable(this.id);
    } else if (this.users.length === 0) {
      this.resetGame();
    }
  }

  // Registers all listeners and events on socket
  public userJoinRoom(user: TypedSocketWithUser) {
    this.users.push(user);
    user.emit('gameStatusUpdate', this.getGameStatusObject());
    user.on('joinTableSeat', (seatId, callback) => this.handleJoinTableSeat(user, seatId, callback));
    user.on('leaveTableSeat', (seatId) => this.handleLeaveTableSeat(user, seatId));
    user.on('placeBet', (bet, seatId, callback) => this.handlePlacingBet(user, bet, seatId, callback));
    user.on('disconnect', () => this.handleDisconnect(user));
  }
}
