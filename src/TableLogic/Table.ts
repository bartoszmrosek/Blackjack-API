import { TypedSocketWithUser } from 'interfaces/Socket.interface';
import { removeEmptyTable } from '../app.js';
import mysqlDataSrc from '../database/mysql.config.js';
import User from '../entity/user.entity.js';
import { ActivePlayer, Player } from '../interfaces/Player.interface';

export default class Table {
  private users: TypedSocketWithUser[] = [];

  private pendingPlayers: Player[] = [];

  private activePlayers: ActivePlayer[] = [];

  private id: string;

  private isGameStarting = false;

  private isGameStarted = false;

  private timeoutTime = 0;

  private timerIntervalCb: ReturnType<typeof setInterval>;

  private startingTimeout: NodeJS.Timeout;

  private afterGameCallbacks: [(...args: unknown[])=>void, unknown[]][] = [];

  constructor(
    id: string,
  ) {
    this.id = id;
  }

  public getTableId() {
    return this.id;
  }

  public getNumOfPlayers() {
    return this.users.length;
  }

  private getSafePlayersArrays() {
    const activePlayers = this.activePlayers.map((activePlayer) => {
      const { user: socket, reservedBalance, ...rest } = activePlayer;
      return rest;
    });
    const pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      const { user: socket, reservedBalance, ...rest } = pendingPlayer;
      return rest;
    });
    return { activePlayers, pendingPlayers };
  }

  private startGame() {
    this.users.forEach((user) => {
      const { pendingPlayers, activePlayers } = this.getSafePlayersArrays();
      if (activePlayers.length > 0) {
        user.emit('gameStarting', activePlayers, pendingPlayers);
      } else {
        this.resetGame();
      }
    });
    console.log('started');
  }

  private timerStarting() {
    this.isGameStarting = true;
    this.timeoutTime = 10 * 1000;
    this.pendingPlayers.forEach((player) => {
      player.user.emit('gameTimerStarting', this.timeoutTime);
    });
    this.startingTimeout = setTimeout(() => {
      this.isGameStarting = false;
      this.isGameStarted = true;
      this.activePlayers = this.pendingPlayers
        .filter((pendingPlayer) => pendingPlayer.bet > 0)
        .map((filteredUser) => ({
          ...filteredUser,
          status: 'playing',
          hasMadeFinalDecision: false,
          cards: [''],
          cardsScore: [0],
        }));
      this.pendingPlayers = [];
      clearInterval(this.timerIntervalCb);
      this.startGame();
    }, this.timeoutTime);
    this.timerIntervalCb = setInterval(() => {
      this.timeoutTime -= 1000;
    }, 1000);
  }

  private resetGame() {
    clearInterval(this.timerIntervalCb);
    clearTimeout(this.startingTimeout);
    this.isGameStarted = false;
    this.isGameStarting = false;
    this.afterGameCallbacks.forEach((cb) => {
      cb[0](cb[1]);
    });
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
      user, seatId, bet: 0, reservedBalance: 0,
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
      if (pendingPlayer.user.user.id === user.user.id && seatId === pendingPlayer.seatId) {
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
    this.activePlayers = this.activePlayers.filter(
      (activePlayer) => {
        if (activePlayer.user.id !== user.id) {
          return true;
        }
        mysqlDataSrc
          .createQueryBuilder()
          .update(User)
          .set({ balance: user.user.balance - activePlayer.bet })
          .where('id = :id', { id: user.user.id })
          .execute();
        return false;
      },
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
    const { pendingPlayers, activePlayers } = this.getSafePlayersArrays();
    user.emit('gameStatusUpdate', this.timeoutTime, activePlayers, pendingPlayers);
    user.on('joinTableSeat', (seatId, callback) => this.handleJoinTableSeat(user, seatId, callback));
    user.on('leaveTableSeat', (seatId) => this.handleLeaveTableSeat(user, seatId));
    user.on('placeBet', (bet, seatId, callback) => this.handlePlacingBet(user, bet, seatId, callback));
    user.on('disconnect', () => this.handleDisconnect(user));
  }
}
