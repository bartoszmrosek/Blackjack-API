import { Player, ActivePlayer } from '../interfaces/Player.interface';
import { TypedSocketWithUser } from '../interfaces/Socket.interface';
import getAllPermutations from '../utils/getAllPermutations.js';
import getCardValues from '../utils/getCardValues.js';
import getRandomInt from '../utils/getRandomInt.js';
import deck from '../cardDeck.json' assert {type: 'json'};
import checkCardRules from '../utils/checkGameRules.js';
import { removeEmptyTable } from '../app.js';

export default class TableLogic {
  protected sockets: TypedSocketWithUser[] = [];

  protected pendingPlayers: Player[] = [];

  protected activePlayers: ActivePlayer[] = [];

  protected isGameStarting = false;

  protected isGameStarted = false;

  private isGameFinished = false;

  private timeoutTime = 0;

  private timerIntervalCb: ReturnType<typeof setInterval>;

  private startingTimeout: NodeJS.Timeout;

  private presenterState: {cards: string[], score: number[], didGetBlackjack: boolean} = {
    cards: [],
    score: [0],
    didGetBlackjack: false,
  };

  private currentlyAsked: ({userId: number, seatId: number} | null) = null;

  private playingDeck = deck.deck;

  protected tableId: string;

  constructor(tableId: string) {
    this.tableId = tableId;
  }

  private getSafePlayersArrays() {
    const activePlayers = this.activePlayers.map((activePlayer) => {
      const { socket, ...rest } = activePlayer;
      return rest;
    });
    const pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      const { socket, ...rest } = pendingPlayer;
      return rest;
    });
    return { activePlayers, pendingPlayers };
  }

  protected getGameStatusObject() {
    const { activePlayers, pendingPlayers } = this.getSafePlayersArrays();
    return {
      isGameStarted: this.isGameStarted,
      isGameEnded: this.isGameFinished,
      timer: this.timeoutTime,
      activePlayers,
      pendingPlayers,
      presenterState: this.presenterState,
      currentlyAsking: this.currentlyAsked,
    };
  }

  private getNewCard() {
    const newCardIndex = getRandomInt(0, this.playingDeck.length - 1);
    const newCard = this.playingDeck[newCardIndex];
    this.playingDeck.splice(newCardIndex, 1);
    return newCard;
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
    this.isGameFinished = true;
    this.sockets.forEach((user) => {
      user.emit('gameEnded', this.getGameStatusObject());
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
      if (Math.min(...this.presenterState.score) < 17) {
        const newPresenterCard = this.getNewCard();
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

  private askActivePlayer() {
    let playerToAsk: ActivePlayer | null = null;
    // eslint-disable-next-line no-restricted-syntax
    for (const activePlayer of this.activePlayers) {
      if (playerToAsk !== null) break;
      if (!activePlayer.hasMadeFinalDecision) {
        playerToAsk = activePlayer;
      }
    }
    if (playerToAsk !== null) {
      const {
        socket: playerSocket, seatId, bet, cardsScore,
      } = playerToAsk;
      this.currentlyAsked = {
        userId: playerSocket.user.id,
        seatId,
      };
      this.sockets.forEach((socket) => {
        if (socket.user.id !== playerSocket.user.id) {
          socket.emit('askingStatusUpdate', this.currentlyAsked);
        }
      });
      // If player is not connected anymore play as if he just made stand decision
      if (this.sockets.some((socket) => socket.user.id === playerSocket.user.id)) {
        playerSocket.timeout(10000).emit('getPlayerDecision', seatId, (err, decision) => {
          if (err
            || decision === 'stand'
            || (decision === 'doubleDown' && playerSocket.user.balance - bet < 0)
          ) {
            playerToAsk.decision = 'stand';
            playerToAsk.hasMadeFinalDecision = true;
            this.sockets.forEach((user) => {
              user.emit('userMadeDecision', this.currentlyAsked, 'stand');
            });
          } else if (decision === 'hit') {
            const newCard = this.getNewCard();
            const newScore = getAllPermutations(cardsScore, getCardValues(newCard));
            const didBust = Math.min(...newScore) > 21;
            playerToAsk.cards.push(newCard);
            playerToAsk.cardsScore = newScore;
            playerToAsk.status = didBust ? 'bust' : 'playing';
            playerToAsk.hasMadeFinalDecision = didBust;
            this.sockets.forEach((user) => {
              user.emit('userMadeDecision', this.currentlyAsked, decision, newCard);
            });
          } else {
            playerSocket.user.balance -= bet;
            const newCard = this.getNewCard();
            const newScore = getAllPermutations(cardsScore, getCardValues(newCard));
            const didBust = Math.min(...newScore) > 21;
            playerToAsk.cards.push(newCard);
            playerToAsk.cardsScore = newScore;
            playerToAsk.status = didBust ? 'bust' : 'playing';
            playerToAsk.bet *= 2;
            playerToAsk.hasMadeFinalDecision = true;
            this.sockets.forEach((user) => {
              user.emit('userMadeDecision', this.currentlyAsked, decision, newCard);
            });
          }
          this.askActivePlayer();
        });
      } else {
        playerToAsk.decision = 'stand';
        playerToAsk.hasMadeFinalDecision = true;
        this.sockets.forEach((user) => {
          user.emit('userMadeDecision', this.currentlyAsked, 'stand');
        });
        this.askActivePlayer();
      }
    } else {
      this.currentlyAsked = null;
      this.presenterTime();
    }
  }

  private giveOutCards() {
    const newPresenterCard = this.getNewCard();
    this.presenterState = {
      cards: [newPresenterCard],
      score: getCardValues(newPresenterCard),
      didGetBlackjack: false,
    };
    this.activePlayers = this.activePlayers.map((player) => {
      const firstNewCard = this.getNewCard();
      const secondNewCard = this.getNewCard();
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
      user.emit('gameStatusUpdate', this.getGameStatusObject());
    });
    this.activePlayers.sort((firstPlayer, secondPlayer) => {
      if (firstPlayer.seatId > secondPlayer.seatId) {
        return -1;
      }
      return 1;
    });
    this.askActivePlayer();
  }

  protected startGame() {
    if (this.activePlayers.length > 0) {
      this.giveOutCards();
    } else {
      this.resetGame();
    }
  }

  protected timerStarting() {
    this.isGameStarting = true;
    this.timeoutTime = 10 * 1000;
    this.pendingPlayers.forEach((player) => {
      player.socket.emit('gameTimerStarting', this.timeoutTime);
    });
    this.timerIntervalCb = setInterval(() => {
      this.timeoutTime -= 1000;
    }, 1000);
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
    this.isGameStarted = false;
    this.isGameStarting = false;
    this.isGameFinished = false;
    this.presenterState = {
      cards: [],
      score: [0],
      didGetBlackjack: false,
    };
    this.activePlayers = [];
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
