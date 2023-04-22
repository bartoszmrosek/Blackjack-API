import { ActivePlayer, Player } from '../../interfaces/Player.interface';

function getSafePlayersArrays(activePlayers: ActivePlayer[], pendingPlayers: Player[]) {
  const withoutSocketActivePlayers = activePlayers.map((activePlayer) => {
    const {
      seatId, bet, status, cards, cardsScore, decision, hasMadeFinalDecision, username, userId,
    } = activePlayer;
    return {
      seatId, bet, status, cards, cardsScore, decision, hasMadeFinalDecision, username, userId,
    };
  });
  const withoutSocketPendingPlayers = pendingPlayers.map((pendingPlayer) => {
    const {
      seatId, bet, username, userId,
    } = pendingPlayer;
    return {
      seatId, bet, username, userId,
    };
  });

  return [withoutSocketActivePlayers, withoutSocketPendingPlayers] as const;
}

export default getSafePlayersArrays;
