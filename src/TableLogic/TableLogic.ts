import { Player, ActivePlayer } from '../interfaces/Player.interface';
import { TypedSocketWithUser } from '../interfaces/Socket.interface';
import getAllPermutations from '../utils/getAllPermutations.js';
import getCardValues from '../utils/getCardValues.js';
import getRandomInt from '../utils/getRandomInt.js';
import deck from '../cardDeck.json' assert {type: 'json'};

export default class TableLogic {
  protected users: TypedSocketWithUser[] = [];

  protected pendingPlayers: Player[] = [];

  protected activePlayers: ActivePlayer[] = [];

  protected isGameStarting = false;

  protected isGameStarted = false;

  private timeoutTime = 0;

  private timerIntervalCb: ReturnType<typeof setInterval>;

  private startingTimeout: NodeJS.Timeout;

  private afterGameCallbacks: [(...args: unknown[])=>void, unknown[]][] = [];

  private presenterState: {cards: string[], score: number[]} = {
    cards: [],
    score: [0],
  };

  private currentlyAsked: ({userId: number, seatId: number} | null) = null;

  private playingDeck = deck.deck;

  private getSafePlayersArrays() {
    const activePlayers = this.activePlayers.map((activePlayer) => {
      const { user: socket, ...rest } = activePlayer;
      return rest;
    });
    const pendingPlayers = this.pendingPlayers.map((pendingPlayer) => {
      const { user: socket, ...rest } = pendingPlayer;
      return rest;
    });
    return { activePlayers, pendingPlayers };
  }

  protected getGameStatusObject() {
    const { activePlayers, pendingPlayers } = this.getSafePlayersArrays();
    return {
      isGameStarted: this.isGameStarted,
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
    this.users.forEach((user) => {
      user.emit('gameStatusUpdate', this.getGameStatusObject());
    });
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
      this.currentlyAsked = {
        userId: playerToAsk.user.user.id,
        seatId: playerToAsk.seatId,
      };
      this.users.forEach((user) => {
        if (user.user.id !== playerToAsk.user.user.id) {
          user.emit('askingStatusUpdate', this.currentlyAsked);
        }
      });
      // If player is not connected anymore play as if he just made stand decision
      if (this.users.some((user) => user.user.id === playerToAsk.user.user.id)) {
        playerToAsk.user.timeout(10000).emit('getPlayerDecision', playerToAsk.seatId, (err, decision) => {
          if (err
            || decision === 'stand'
            || (decision === 'doubleDown' && playerToAsk.user.user.balance - playerToAsk.bet < 0)
          ) {
            playerToAsk.decision = 'stand';
            playerToAsk.hasMadeFinalDecision = true;
            this.users.forEach((user) => {
              user.emit('userMadeDecision', this.currentlyAsked, 'stand');
            });
          } else if (decision === 'hit') {
            const newCard = this.getNewCard();
            const newScore = getAllPermutations(playerToAsk.cardsScore, getCardValues(newCard));
            const didBust = Math.min(...newScore) > 21;
            playerToAsk.cards.push(newCard);
            playerToAsk.cardsScore = newScore;
            playerToAsk.status = didBust ? 'bust' : 'playing';
            playerToAsk.hasMadeFinalDecision = didBust;
            this.users.forEach((user) => {
              user.emit('userMadeDecision', this.currentlyAsked, decision, newCard);
            });
          } else {
            playerToAsk.user.user.balance -= playerToAsk.bet;
            const newCard = this.getNewCard();
            const newScore = getAllPermutations(playerToAsk.cardsScore, getCardValues(newCard));
            const didBust = Math.min(...newScore) > 21;
            playerToAsk.cards.push(newCard);
            playerToAsk.cardsScore = newScore;
            playerToAsk.status = didBust ? 'bust' : 'playing';
            playerToAsk.hasMadeFinalDecision = true;
            this.users.forEach((user) => {
              user.emit('userMadeDecision', this.currentlyAsked, decision, newCard);
            });
          }
          this.askActivePlayer();
        });
      } else {
        playerToAsk.decision = 'stand';
        playerToAsk.hasMadeFinalDecision = true;
        this.users.forEach((user) => {
          user.emit('userMadeDecision', this.currentlyAsked, 'stand');
        });
        this.askActivePlayer();
      }
    } else {
      this.endGame();
    }
  }

  private giveOutCards() {
    const newPresenterCard = this.getNewCard();
    this.presenterState = {
      cards: [newPresenterCard],
      score: getCardValues(newPresenterCard),
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
    this.users.forEach((user) => {
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
      player.user.emit('gameTimerStarting', this.timeoutTime);
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
    this.presenterState = {
      cards: [],
      score: [0],
    };
    this.users.forEach((user) => {
      user.emit('gameStatusUpdate', this.getGameStatusObject());
    });
    this.afterGameCallbacks.forEach((cb) => {
      cb[0](cb[1]);
    });
  }
}
