import express, {
  Express, json,
} from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import { ClientToServerEvents, ServerToClienEvents } from 'interfaces/Socket.interface.js';
import auth from './middlewares/auth.middleware.js';
import router from './routes/index.js';
import mysqlDataSrc from './database/mysql.config.js';

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

export default httpServer;
