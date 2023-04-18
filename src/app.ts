import express, {
  Express, json,
} from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { ClientToServerEvents, ServerToClienEvents } from 'interfaces/Socket.interface.js';
import { v4 as uuidv4 } from 'uuid';
import auth from './middlewares/auth.middleware.js';
import router from './routes/index.js';
import mysqlDataSrc from './database/mysql.config.js';
import Table from './TableLogic/Table.js';

await mysqlDataSrc.initialize().then(() => {
  console.log('database connection estabilished');
}).catch((error) => {
  console.error(error);
});

const app: Express = express();
app.use(helmet());
app.use(json());

app.use('/api', router);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClienEvents>(httpServer);
io.engine.use(cookieParser());
io.engine.use(helmet());
io.use(auth);

const allGameTables: Table[] = [];
export function removeEmptyTable(tableId: string) {
  const removedTableIndex = allGameTables.findIndex((table) => table.getTableId() === tableId);
  if (removedTableIndex > -1) {
    allGameTables.splice(removedTableIndex, 1);
  }
}

io.on('connection', (socket) => {
  const freeSeatIndex = allGameTables.findIndex((table) => table.getNumOfPlayers() < 5);
  if (freeSeatIndex !== -1) {
    allGameTables[freeSeatIndex].userJoin(socket);
  } else {
    const newTable = new Table(uuidv4());
    newTable.userJoin(socket);
    allGameTables.push(newTable);
  }
});

export default httpServer;
