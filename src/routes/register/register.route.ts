import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mysqlDataSrc from '../../database/mysql.config.js';
import User from '../../entity/user.entity.js';

const registerRouter = Router();

registerRouter.post('/', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.sendStatus(400);
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const userRepo = mysqlDataSrc.getRepository(User);
    const user = userRepo.create({ username, password: passwordHash });
    const newUser = await userRepo.save(user);
    return jwt.sign({ username }, process.env.SECRET_KEY, { expiresIn: '24h' }, (error, token) => {
      if (error) return res.sendStatus(500);
      res.cookie('token', token, {
        sameSite: 'none', httpOnly: true, secure: true, expires: new Date(Date.now() + 3600000 * 24),
      });
      return res.status(200)
        .send({ username: newUser.username, id: newUser.id, balance: newUser.balance });
    });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

export default registerRouter;
