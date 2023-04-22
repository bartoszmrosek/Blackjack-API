import { Player, ActivePlayer } from '../interfaces/Player.interface';
import { TypedSocketWithUser } from '../interfaces/Socket.interface';
import getAllPermutations from '../utils/getAllPermutations.js';
import getCardValues from '../utils/getCardValues.js';
import deck from '../cardDeck.json' assert {type: 'json'};
import checkCardRules from '../utils/checkGameRules.js';
import { removeEmptyTable } from '../tableStore.js';
import mysqlDataSrc from '../database/mysql.config.js';
import User from '../entity/user.entity.js';
import getSafePlayersArrays from './tableUtils/getSafePlayerArrays.js';
import getNewCardFromDeck from './tableUtils/getNewCardFromDeck.js';
import { initialGameState, initialPresenterState } from './initialTableStates.js';
import { GameState, PresenterState } from '../interfaces/Table.interfaces';

export default class TableLogic {
  protected sockets: TypedSocketWithUser[] = [];

  protected pendingPlayers: Player[] = [];

  protected activePlayers: ActivePlayer[] = [];

  protected gameState: GameState = { ...initialGameState };

  protected timeoutTime = 0;

  private timerIntervalCb: ReturnType<typeof setInterval>;

  private startingTimeout: NodeJS.Timeout;

  private presenterState: PresenterState = { ...initialPresenterState };

  private currentlyAsked: ({userId: number, seatId: number} | null) = null;

  private playingDeck = deck.deck;

  protected tableId: string;

  constructor(tableId: string) {
    this.tableId = tableId;
  }

  protected getGameStatusObject() {
    const [activePlayers, pendingPlayers] = getSafePlayersArrays(
      this.activePlayers,
      this.pendingPlayers,
    );
    return {
      gameState: this.gameState,
      timer: this.timeoutTime,
      activePlayers,
      pendingPlayers,
      presenterState: this.presenterState,
      currentlyAsking: this.currentlyAsked,
    };
  }

  private endGame() {
    this.timeoutTime = 10 * 1000;
    this.activePlayers = this.activePlayers.map((activePlayer) => {
      const {
        status, cardsScore, socket, bet,
      } = activePlayer;
      const userStatus = checkCardRules(
        { status, score: cardsScore },
        this.presenterState.didGetBlackjack ? 'blackjack' : Math.min(...this.presenterState.score),
      );
      if (userStatus === 'blackjack' || userStatus === 'won') {
        socket.user.balance += bet * 2;
      }
      if (userStatus === 'push') socket.user.balance += bet;
      return {
        ...activePlayer,
        status: userStatus,
      };
    });
    this.gameState.isGameFinished = true;
    this.sockets.forEach((socket) => {
      socket.emit('gameEnded', this.getGameStatusObject());
      if (
        this.sockets.some((notifiedSocket) => notifiedSocket.user.id === socket.user.id)
      ) {
        socket.emit('balanceUpdate', socket.user.balance);
      }
    });
    const sqlRepo = mysqlDataSrc.getRepository(User);
    this.activePlayers.forEach((activePlayer) => {
      sqlRepo.update(activePlayer.socket.user.id, { balance: activePlayer.socket.user.balance });
    });
    setTimeout(() => {
      this.resetGame();
    }, this.timeoutTime);
    this.timerIntervalCb = setInterval(() => {
      this.timeoutTime -= 1000;
    }, 1000);
  }

  private presenterTime() {
    this.sockets.forEach((user) => {
      user.emit('presenterTime', this.getGameStatusObject());
    });
    const drawNewCard = (iteration: number) => {
      if (Math.min(...this.presenterState.score) < 17 && !this.presenterState.didGetBlackjack) {
        const newPresenterCard = getNewCardFromDeck(this.playingDeck);
        const newPresenterScore = getAllPermutations(
          this.presenterState.score,
          getCardValues(newPresenterCard),
        );
        this.presenterState.cards.push(newPresenterCard);
        this.presenterState.score = newPresenterScore;
        if (iteration === 0) {
          this.presenterState.didGetBlackjack = Math.max(...newPresenterScore) === 21;
        }
        setTimeout(() => {
          this.sockets.forEach((user) => {
            user.emit('newPresenterCard', newPresenterCard);
          });
          drawNewCard(iteration + 1);
        }, 2000);
      } else {
        this.endGame();
      }
    };
    drawNewCard(0);
  }

  private askPlayer(playerToAskRef: ActivePlayer) {
    const {
      socket: playerSocket, seatId, bet, cardsScore,
    } = playerToAskRef;
    this.sockets.forEach((socket) => {
      if (socket.user.id !== playerSocket.user.id) {
        socket.emit('askingStatusUpdate', this.currentlyAsked);
      }
    });
    // If player is not connected anymore play as if he just made stand decision
    if (!this.sockets.some((socket) => socket.user.id === playerSocket.user.id)) {
      playerToAskRef.decision = 'stand';
      playerToAskRef.hasMadeFinalDecision = true;
      this.sockets.forEach((user) => {
        user.emit('userMadeDecision', this.currentlyAsked, 'stand');
      });
      return this.handleAskingProcedure();
    }
    return playerSocket.timeout(10000).emit('getPlayerDecision', seatId, (err, decision) => {
      if (err
            || decision === 'stand'
            || (decision === 'doubleDown' && playerSocket.user.balance - bet < 0)
      ) {
        playerToAskRef.decision = 'stand';
        playerToAskRef.hasMadeFinalDecision = true;
        this.sockets.forEach((user) => {
          user.emit('userMadeDecision', this.currentlyAsked, 'stand');
        });
      } else {
        const newCard = getNewCardFromDeck(this.playingDeck);
        const newScore = getAllPermutations(cardsScore, getCardValues(newCard));
        const didBust = Math.min(...newScore) > 21;
        playerToAskRef.cards.push(newCard);
        playerToAskRef.cardsScore = newScore;
        playerToAskRef.status = didBust ? 'bust' : 'playing';
        playerToAskRef.hasMadeFinalDecision = didBust || decision === 'doubleDown';
        if (decision === 'doubleDown') {
          playerToAskRef.bet *= 2;
        }
        this.sockets.forEach((user) => {
          user.emit('userMadeDecision', this.currentlyAsked, decision, newCard);
        });
      }
      this.handleAskingProcedure();
    });
  }

  private handleAskingProcedure() {
    let playerToAsk: ActivePlayer | null = null;
    // eslint-disable-next-line no-restricted-syntax
    for (const activePlayer of this.activePlayers) {
      if (playerToAsk !== null) break;
      if (!activePlayer.hasMadeFinalDecision) {
        playerToAsk = activePlayer;
      }
    }
    if (playerToAsk !== null) {
      this.currentlyAsked = {
        userId: playerToAsk.socket.user.id,
        seatId: playerToAsk.seatId,
      };
      this.askPlayer(playerToAsk);
    } else {
      this.currentlyAsked = null;
      this.presenterTime();
    }
  }

  private giveOutCards() {
    const newPresenterCard = getNewCardFromDeck(this.playingDeck);
    this.presenterState = {
      cards: [newPresenterCard],
      score: getCardValues(newPresenterCard),
      didGetBlackjack: false,
    };
    this.activePlayers = this.activePlayers.map((player) => {
      const firstNewCard = getNewCardFromDeck(this.playingDeck);
      const secondNewCard = getNewCardFromDeck(this.playingDeck);
      const userScore = getAllPermutations(
        getCardValues(firstNewCard),
        getCardValues(secondNewCard),
      );
      const hasGotBlackjack = Math.max(...userScore) === 21;
      return {
        ...player,
        cards: [firstNewCard, secondNewCard],
        cardsScore: userScore,
        status: hasGotBlackjack ? 'blackjack' : 'playing',
        hasMadeFinalDecision: hasGotBlackjack,
      };
    });
    this.sockets.forEach((user) => {
      user.emit('gameStarts', this.getGameStatusObject());
    });
    this.activePlayers.sort((firstPlayer, secondPlayer) => {
      if (firstPlayer.seatId > secondPlayer.seatId) {
        return -1;
      }
      return 1;
    });
    this.handleAskingProcedure();
  }

  protected startGame() {
    if (this.activePlayers.length > 0) {
      this.giveOutCards();
    } else {
      this.resetGame();
    }
  }

  protected timerStarting() {
    this.gameState.isGameStarting = true;
    this.timeoutTime = 10 * 1000;
    this.pendingPlayers.forEach((player) => {
      player.socket.emit('gameTimerStarting', this.timeoutTime);
    });
    this.timerIntervalCb = setInterval(() => {
      this.timeoutTime -= 1000;
    }, 1000);
    this.startingTimeout = setTimeout(() => {
      this.gameState.isGameStarting = false;
      this.gameState.isGameStarted = true;
      this.activePlayers = this.pendingPlayers
        .filter((pendingPlayer) => pendingPlayer.bet > 0)
        .map((filteredUser) => ({
          ...filteredUser,
          status: 'playing',
          hasMadeFinalDecision: false,
          cards: [''],
          cardsScore: [0],
          decision: null,
        }));
      this.pendingPlayers = [];
      clearInterval(this.timerIntervalCb);
      this.startGame();
    }, this.timeoutTime);
  }

  protected resetGame() {
    clearInterval(this.timerIntervalCb);
    clearTimeout(this.startingTimeout);
    this.gameState = { ...initialGameState };
    this.presenterState = {
      cards: [],
      score: [0],
      didGetBlackjack: false,
    };
    this.activePlayers = [];
    this.timeoutTime = 0;
    this.sockets.forEach((user) => {
      user.emit('gameStatusUpdate', this.getGameStatusObject());
    });
    setInterval(() => {
      if (this.sockets.length === 0) {
        removeEmptyTable(this.tableId);
      }
    }, 5000);
  }
}
