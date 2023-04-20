import { TypedSocketWithUser } from 'interfaces/Socket.interface';
import { removeEmptyTable } from '../app.js';
import TableLogic from './TableLogic.js';

export default class Table extends TableLogic {
  public getTableId() {
    return this.tableId;
  }

  public getNumOfPlayers() {
    return this.sockets.length;
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
      socket, seatId, bet: 0,
    });
    if (this.pendingPlayers.length === 1 && !this.isGameStarting && !this.isGameStarted) {
      this.timerStarting();
    }
    this.sockets.forEach((currentUser) => {
      if (currentUser.id !== socket.id) {
        currentUser.emit('userJoinedSeat', {
          username: socket.user.username,
          userId: socket.user.id,
          seatId,
        });
      }
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
      anotherUser.emit('userLeftSeat', { userId: socket.user.id, seatId });
    });
  }

  private handlePlacingBet(
    socket: TypedSocketWithUser,
    bet: number,
    seatId:number,
    callback: (ack: number)=> void,
  ) {
    let isBetPlaced = false;
    this.pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      if (
        pendingPlayer.socket.user.id === socket.user.id
         && seatId === pendingPlayer.seatId
         && pendingPlayer.socket.user.balance - bet >= 0
      ) {
        // eslint-disable-next-line no-param-reassign
        socket.user.balance -= bet;
        this.sockets.forEach((remainingUser) => {
          if (remainingUser.user.id !== socket.user.id) {
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

  private handleDisconnect(socket: TypedSocketWithUser) {
    const remainingUsers = this.sockets.filter((connectedUser) => connectedUser.id !== socket.id);
    remainingUsers.forEach((remainingUser) => {
      remainingUser.emit('userLeftGame', socket.user.id);
    });
    this.sockets = remainingUsers;
    this.pendingPlayers = this.pendingPlayers.filter(
      (pendingPlayer) => pendingPlayer.socket.id !== socket.id,
    );
    if (this.sockets.length === 0 && !this.isGameStarted) {
      setInterval(() => {
        if (this.sockets.length === 0) {
          removeEmptyTable(this.tableId);
        }
      }, 5000);
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
