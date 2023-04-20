import { PlayerStatus } from '../interfaces/Player.interface';

export default function checkCardRules(
  player: { status: PlayerStatus; score: number[]; },
  presenterScore: number | 'blackjack',
): PlayerStatus {
  if (player.status === 'bust' || player.status === 'lost') {
    return player.status;
  }
  const acceptableScores = player.score.filter((score) => score < 22);
  if (acceptableScores.length === 0) {
    return 'lost';
  }
  if (presenterScore === 'blackjack') {
    if (player.status === 'blackjack') { return 'push'; }
    return 'lost';
  }
  if (player.status === 'blackjack') {
    return player.status;
  }
  if (presenterScore > 21) {
    return 'won';
  }
  const heighestUserScore = Math.max(...acceptableScores);
  if (heighestUserScore === presenterScore) {
    return 'push';
  }
  if (heighestUserScore < presenterScore) {
    return 'lost';
  }
  return 'won';
}
