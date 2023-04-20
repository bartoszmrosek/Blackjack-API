import { Request, Response, Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import allGameTables from '../../tableStore.js';
import { apiAuth } from '../../middlewares/auth.middleware.js';
import Table from '../../tableLogic/table.js';

const roomsRouter = Router();

roomsRouter.get('/', (req: Request, res: Response) => {
  const gameTables = allGameTables.map((table) => (
    { id: table.getTableId(), playersNum: table.getNumOfPlayers() }
  ));
  res.send(gameTables);
});

roomsRouter.post('/create', apiAuth, (req: Request, res: Response) => {
  const gameTableId = uuidv4();
  const GameTable = new Table(gameTableId);
  GameTable.initialize();
  allGameTables.push(GameTable);
  res.send(GameTable.getTableId());
});

export default roomsRouter;
