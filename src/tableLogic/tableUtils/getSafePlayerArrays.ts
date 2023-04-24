import { ActivePlayer, Player } from '../../interfaces/Player.interface';

function getSafePlayersArrays(activePlayers: ActivePlayer[], pendingPlayers: Player[]) {
  const withoutSocketActivePlayers = activePlayers.map((activePlayer) => {
    const {
      socket, ...rest
    } = activePlayer;
    return {
      ...rest,
    };
  });
  const withoutSocketPendingPlayers = pendingPlayers.map((pendingPlayer) => {
    const {
      seatId, bet, username, userId, previousBet,
    } = pendingPlayer;
    return {
      seatId, bet, username, userId, previousBet,
    };
  });

  return [withoutSocketActivePlayers, withoutSocketPendingPlayers] as const;
}

export default getSafePlayersArrays;
