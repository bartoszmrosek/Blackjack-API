import { Request, Response, Router } from 'express';

const logoutRouter = Router();

logoutRouter.post('/', (req: Request, res: Response) => {
  res.cookie('token', 'rubbish', {
    sameSite: 'none', httpOnly: true, secure: true, maxAge: 0,
  });
  return res.sendStatus(200);
});

export default logoutRouter;
