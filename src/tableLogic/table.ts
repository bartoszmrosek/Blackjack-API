import { TypedSocketWithUser } from 'interfaces/Socket.interface';
import { removeEmptyTable, usersMap } from '../globalStore.js';
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
    const savedUser = usersMap.get(socket.userRef);
    this.pendingPlayers.push({
      socket,
      seatId,
      bet: 0,
      username: savedUser.username,
      userId: savedUser.id,
      previousBet: 0,
    });
    if (this.pendingPlayers.length === 1
      && !this.gameState.isGameStarting
      && !this.gameState.isGameStarted) {
      this.timerStarting();
    }
    this.sockets.forEach((currentUser) => {
      currentUser.emit('userJoinedSeat', {
        username: savedUser.username,
        userId: savedUser.id,
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
    const savedUser = usersMap.get(socket.userRef);
    const filteredPendingPlayer = this.pendingPlayers.filter(
      (pendingPlayer) => {
        const pendingPlayerUser = usersMap.get(pendingPlayer.socket.userRef);
        if (pendingPlayerUser.id === savedUser.id && pendingPlayer.seatId !== seatId) {
          return true;
        }
        usersMap.set(pendingPlayer.socket.userRef, {
          ...pendingPlayerUser,
          balance: pendingPlayerUser.balance + pendingPlayer.bet,
        });
        return false;
      },
    );
    if (filteredPendingPlayer.length !== this.pendingPlayers.length) {
      this.sockets.forEach((playerSocket) => {
        const user = usersMap.get(playerSocket.userRef);
        playerSocket.emit('userLeftSeat', { userId: savedUser.id, seatId, username: savedUser.username }, user.balance);
      });
    }
    this.pendingPlayers = filteredPendingPlayer;
  }

  private handlePlacingBet(
    socket: TypedSocketWithUser,
    bet: number,
    seatId:number,
    callback: (ack: number, newBalance?: number)=> void,
  ) {
    if (bet <= 0) return callback(400);
    const betPlacingUser = usersMap.get(socket.userRef);
    let isBetPlaced = false;
    this.pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      const pendingPlayerUser = usersMap.get(pendingPlayer.socket.userRef);
      if (
        pendingPlayerUser.id === betPlacingUser.id
         && seatId === pendingPlayer.seatId
         && pendingPlayerUser.balance - bet >= 0
      ) {
        usersMap.set(
          pendingPlayer.socket.userRef,
          { ...pendingPlayerUser, balance: pendingPlayerUser.balance - bet + pendingPlayer.bet },
        );
        this.sockets.forEach((remainingSocket) => {
          const remainingUser = usersMap.get(remainingSocket.userRef);
          remainingSocket.emit('betPlaced', bet, seatId, this.timeoutTime, remainingUser.balance);
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
    const remainingUsers = this.sockets.filter((connectedUser) => {
      if (connectedUser.id !== socket.id) {
        return true;
      }
      const userInformations = usersMap.get(connectedUser.userRef);
      if (userInformations.sourceFor - 1 === 0) {
        usersMap.delete(connectedUser.userRef);
      } else {
        usersMap.set(connectedUser.userRef, {
          ...userInformations,
          sourceFor: userInformations.sourceFor - 1,
        });
      }
      return false;
    });
    this.sockets = remainingUsers;
    this.pendingPlayers = this.pendingPlayers.filter(
      (pendingPlayer) => pendingPlayer.socket.id !== socket.id,
    );
    if (this.sockets.length === 0 && !this.gameState.isGameStarted) {
      setInterval(() => {
        if (this.sockets.length === 0 && !this.gameState.isGameStarted) {
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
