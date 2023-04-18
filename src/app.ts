import express, {
  Express, json,
} from 'express';
import 'dotenv/config';
import helmet from 'helmet';
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

export default app;
