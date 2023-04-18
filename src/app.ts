import express, {
  Express, Request, Response, json,
} from 'express';
import 'dotenv/config';
import helmet from 'helmet';

const app: Express = express();
app.use(helmet());
app.use(json());

app.get('/', async (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

export default app;
