import { Request, Response, Router } from 'express';
import bcrypt from 'bcrypt';
import mysqlDataSrc from '../../database/mysql.config.js';
import User from '../../entity/user.entity.js';

const registerRouter = Router();

registerRouter.post('/', async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) return res.sendStatus(400);
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = mysqlDataSrc.getRepository(User).create({ username, password: passwordHash });
    await mysqlDataSrc.getRepository(User).save(user);
    return res.sendStatus(200);
  } catch (error) {
    return res.sendStatus(500);
  }
});

export default registerRouter;
