import { Socket } from 'socket.io';
import { removeEmptyTable } from '../app.js';

export default class Table {
  private users: Socket[] = [];

  private id: string;

  constructor(
    id: string,
  ) {
    this.id = id;
  }

  public getTableId() {
    return this.id;
  }

  public getNumOfPlayers() {
    return this.users.length;
  }

  public userJoin(user: Socket) {
    this.users.push(user);
    user.on('disconnect', () => {
      this.users = this.users.filter((connectedUser) => connectedUser.id !== user.id);
      if (this.users.length === 0) {
        removeEmptyTable(this.id);
      }
    });
  }
}
