type WithTimeoutAck<isSender extends boolean, args extends any[]> =
isSender extends true ? [Error, ...args] : args;

export interface ServerToClienEvents{

}

export interface ClientToServerEvents{

}
