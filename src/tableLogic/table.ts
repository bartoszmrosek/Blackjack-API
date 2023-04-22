import { TypedSocketWithUser } from 'interfaces/Socket.interface';
import { removeEmptyTable } from '../tableStore.js';
import TableLogic from './tableLogic.js';

export default class Table extends TableLogic {
  public getTableId() {
    return this.tableId;
  }

  public getNumOfPlayers() {
    return this.sockets.length;
  }

  public initialize() {
    setTimeout(() => {
      if (this.sockets.length === 0) {
        removeEmptyTable(this.tableId);
      }
    }, 5000);
  }

  public getSocketIds() {
    return this.sockets.map((socket) => socket.id);
  }

  private handleJoinTableSeat(
    socket: TypedSocketWithUser,
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
      socket, seatId, bet: 0, username: socket.user.username, userId: socket.user.id,
    });
    if (this.pendingPlayers.length === 1
      && !this.gameState.isGameStarting
      && !this.gameState.isGameStarted) {
      this.timerStarting();
    }
    this.sockets.forEach((currentUser) => {
      currentUser.emit('userJoinedSeat', {
        username: socket.user.username,
        userId: socket.user.id,
        seatId,
        timer: this.timeoutTime,
      });
    });
    return callback(200);
  }

  private handleLeaveTableSeat(
    socket: TypedSocketWithUser,
    seatId: number,
  ) {
    this.pendingPlayers = this.pendingPlayers.filter(
      (pendingPlayer) => pendingPlayer.socket.user.id !== socket.user.id
       && pendingPlayer.seatId !== seatId,
    );
    this.sockets.forEach((anotherUser) => {
      anotherUser.emit('userLeftSeat', { userId: socket.user.id, seatId, username: socket.user.username });
    });
  }

  private handlePlacingBet(
    socket: TypedSocketWithUser,
    bet: number,
    seatId:number,
    callback: (ack: number)=> void,
  ) {
    if (bet <= 0) return callback(400);
    let isBetPlaced = false;
    this.pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      if (
        pendingPlayer.socket.user.id === socket.user.id
         && seatId === pendingPlayer.seatId
         && pendingPlayer.socket.user.balance - bet >= 0
      ) {
        const previousBet = pendingPlayer.bet;
        // eslint-disable-next-line no-param-reassign
        socket.user.balance -= bet + previousBet;
        this.sockets.forEach((remainingSocket) => {
          remainingSocket.emit('betPlaced', bet, seatId);
        });
        isBetPlaced = true;
        return { ...pendingPlayer, bet };
      }
      return pendingPlayer;
    });
    if (isBetPlaced) {
      return callback(200);
    }
    return callback(406);
  }

  private handleDisconnect(socket: TypedSocketWithUser) {
    const remainingUsers = this.sockets.filter((connectedUser) => connectedUser.id !== socket.id);
    remainingUsers.forEach((remainingUser) => {
      remainingUser.emit('userLeftGame', socket.user.id);
    });
    this.sockets = remainingUsers;
    this.pendingPlayers = this.pendingPlayers.filter(
      (pendingPlayer) => pendingPlayer.socket.id !== socket.id,
    );
    if (this.sockets.length === 0 && !this.gameState.isGameStarted) {
      setInterval(() => {
        if (this.sockets.length === 0) {
          removeEmptyTable(this.tableId);
        }
      }, 10000);
    }
  }

  // Registers all listeners and events on socket
  public userJoinRoom(user: TypedSocketWithUser) {
    this.sockets.push(user);
    user.emit('gameStatusUpdate', this.getGameStatusObject());
    user.on('joinTableSeat', (seatId, callback) => this.handleJoinTableSeat(user, seatId, callback));
    user.on('leaveTableSeat', (seatId) => this.handleLeaveTableSeat(user, seatId));
    user.on('placeBet', (bet, seatId, callback) => this.handlePlacingBet(user, bet, seatId, callback));
    user.on('disconnect', () => this.handleDisconnect(user));
  }
}
