export default function getCardValues(card: string): number[] {
  const value = card.split('-')[1];
  switch (value) {
    case 'A':
      return [1, 11];
    case 'K':
      return [10];
    case 'J':
      return [10];
    case 'Q':
      return [10];
    default:
      return [parseInt(value, 10)];
  }
}
