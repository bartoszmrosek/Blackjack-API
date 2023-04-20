import getRandomInt from '../../utils/getRandomInt.js';

export default function getNewCardFromDeck(deck: string[]) {
  const newCardIndex = getRandomInt(0, deck.length - 1);
  const newCard = deck[newCardIndex];
  deck.splice(newCardIndex, 1);
  return newCard;
}
