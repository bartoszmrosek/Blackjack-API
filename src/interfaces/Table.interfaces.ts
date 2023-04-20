export type GameState = {
    isGameStarting: boolean;
    isGameStarted: boolean;
    isGameFinished: boolean;
}

export type PresenterState = {
    cards: string[],
    score: number[],
    didGetBlackjack: boolean
}
