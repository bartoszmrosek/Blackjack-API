# All routes require cookie set in header
## cookie can be obtained from [REST](REST.md) routes

## Player object typing
```javascript
ActivePlayer: {
    userId: number,
    username: string,
    seatId: number,
    bet: number,
    previousBet: number,
    cards: string[],
    cardsScore: number[],
    decision: "playing" | "bust" | "won" | "lost" | "blackjack" | "push",
    hasMadeFinalDecision: boolean
}
PendingPlayer: {
    userId: number,
    username: string,
    seatId: number,
    bet: number,
    previousBet: number
}
```

## Client can emit those events:

#### Joining game table
```javascript
Event: "joinGameTable", params: (
    roomdId: number,
    cb: (
        statusCode: number,
        user?: {
            username: string,
            userId: number,
            balance: number
        }
        )=>void
)
```

### All of next events require that client joins game table first

#### Joining seat in game table
```javascript
Event: "joinTableSeat", params: (
    seatId: number,
    cb: (
        statusCode: number,
        updatedBalance?: number
    )=>void
)
```
#### Placing bet
```javascript
Event: "placeBet", params: (
    bet: number,
    seatId: number,
    cb: (
        statusCode: number
    )=>void
)
```
#### Leaving table seat
```javascript
Event: "leaveTableSeat", params: (
    seatId: number
)
```

## Server emits those events to clients that are already connected to game table

#### Game status updates
Payload stays the same only event name changes
```javascript
Event: "gameStarts" | "presenterTime" | "gameEnded" | "gameStatusUpdate", params:(
    {
        gameState: {
            isGameStarting: boolean,
            isGameStarted: boolean,
            isGameFinished: boolean
        },
        timeLeft: number,
        activePlayers: ActivePlayer[]
        pendingPlayer: PendingPlayer[]
        presenterState: {
            cards: string[],
            score: number[]
        },
        currentlyAsking: {
            userId: number,
            seatId: number
        } | null
    }
)
```
#### User joining seat
```javascript
Event: "userJoinedSeat", params: (
    {
        userId: number,
        username: string,
        seatId: number
    }
)
```
#### User placing bet
```javascript
Event: "betPlaced", params: (
    bet: number,
    seatId: number,
    timeLeft: number,
    updatedBalance: number
)
```
#### User leaving seat
```javascript
Event: "userLeftSeat", params: (
    {
        userId: number,
        username: string,
        seatId: number
    },
    updatedBalance: number
)
```
#### User leaving game
```javascript
Event: "userLeftGame", params: (
    userId: number
)
```
#### Game timer starting
```javascript
Event: "gameTimerStarting", params: (
    timeLeft: number
)
```
#### Asking next player
```javascript
Event: "askingStatusUpdate", params: (
    {
        userId: number,
        seatId: number
    } | null
)
```
#### Player made decision
```javascript
Event: "userMadeDecision", params: (
    {
        userId: number,
        seatId: number
    } | null,
    decision: "playing" | "bust" | "won" | "lost" | "blackjack" | "push",
    cards?: string
)
```
#### Presenter drawn another card
```javascript
Event: "newPresenterCard", params: (
    card: string
)
```
#### Update to client balance
```javascript
Event: "balanceUpdate", params: (
    updatedBalance: number
)
```