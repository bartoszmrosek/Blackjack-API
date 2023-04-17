import express, { Express, Request, Response } from 'express';
import "dotenv/config"
import jwtCheck from './middlewares/oauth2.middleware.js';
import helmet from 'helmet';

const app: Express = express();
app.use(helmet())


app.get('/',jwtCheck, (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

export {app};