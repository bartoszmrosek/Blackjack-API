import { ActivePlayer, Player } from '../../interfaces/Player.interface';

function getSafePlayersArrays(activePlayers: ActivePlayer[], pendingPlayers: Player[]) {
  const withoutSocketActivePlayers = activePlayers.map((activePlayer) => {
    const {
      seatId, bet, status, cards, cardsScore, decision, hasMadeFinalDecision,
    } = activePlayer;
    return {
      seatId, bet, status, cards, cardsScore, decision, hasMadeFinalDecision,
    };
  });
  const withoutSocketPendingPlayers = pendingPlayers.map((pendingPlayer) => {
    const { seatId, bet } = pendingPlayer;
    return {
      seatId, bet,
    };
  });

  return [withoutSocketActivePlayers, withoutSocketPendingPlayers] as const;
}

export default getSafePlayersArrays;
