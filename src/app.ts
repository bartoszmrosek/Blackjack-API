import express, { json } from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { ClientToServerEvents, ServerToClienEvents, TypedSocketWithUser } from 'interfaces/Socket.interface.js';
import cors from 'cors';
import { socketAuth } from './middlewares/auth.middleware.js';
import router from './routes/index.js';
import mysqlDataSrc from './database/mysql.config.js';
import allGameTables from './tableStore.js';

await mysqlDataSrc.initialize().then(() => {
  console.log('database connection estabilished');
}).catch((error) => {
  console.error(error);
});
const environment = process.env.NODE_ENV;
const origin = environment === 'production' ? 'https://bartoszmrosek.github.io/Blackjack-Game' : 'https://localhost:5173/Blackjack-Game';
const CORS_OPTIONS: cors.CorsOptions = {
  credentials: true,
  origin,
};
const app = express();
app.use(helmet());
app.use(json());
app.use(cookieParser());
app.use(cors(CORS_OPTIONS));

app.use('/api', router);

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClienEvents>(
  httpServer,
  { cors: CORS_OPTIONS },
);
io.engine.use(cookieParser());
io.engine.use(helmet());
io.use(socketAuth);

io.on('connection', (socket: TypedSocketWithUser) => {
  socket.on('joinGameTable', (roomId, callback) => {
    const foundGameTable = allGameTables.find((gameTable) => gameTable.getTableId() === roomId);
    if (!foundGameTable) {
      return callback(404);
    }
    if (foundGameTable.getNumOfPlayers() > 4) {
      return callback(409);
    }
    foundGameTable.userJoinRoom(socket);
    return callback(200);
  });
});

export default httpServer;
