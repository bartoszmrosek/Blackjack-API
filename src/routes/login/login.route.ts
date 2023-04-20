import jwt from 'jsonwebtoken';
import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import mysqlDataSrc from '../../database/mysql.config.js';
import User from '../../entity/user.entity.js';

const loginRouter = Router();

loginRouter.post('/', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.sendStatus(400);
  try {
    const userRepo = mysqlDataSrc.getRepository(User);
    const user = await userRepo.findOneBy({ username });
    if (!user) return res.sendStatus(404);
    const doPasswordMatch = await bcrypt.compare(password, user.password);
    if (!doPasswordMatch) return res.sendStatus(401);
    return jwt.sign({ username }, process.env.SECRET_KEY, { expiresIn: '24h' }, (error, token) => {
      if (error) return res.sendStatus(500);
      res.cookie('token', token, {
        sameSite: 'none', httpOnly: true, secure: true, expires: new Date(Date.now() + 3600000 * 24),
      });
      return res.send({ username: user.username, id: user.id, balance: user.balance });
    });
  } catch (error) {
    return res.sendStatus(400);
  }
});

export default loginRouter;
