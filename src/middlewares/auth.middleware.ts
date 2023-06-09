import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { parse } from 'cookie';
import mysqlDataSrc from '../database/mysql.config.js';
import User from '../entity/user.entity.js';
import { TypedSocketWithUser } from '../interfaces/Socket.interface';
import { usersMap } from '../globalStore.js';

const socketAuth = async (
  socket: TypedSocketWithUser,
  next: NextFunction,
) => {
  if (!socket.handshake.headers.cookie) {
    const err = new Error('400');
    return next(err);
  }
  const { token } = parse(socket.handshake.headers.cookie);
  if (!token) {
    const err = new Error('401');
    return next(err);
  }
  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY) as {username: string};
    const userRepo = mysqlDataSrc.getRepository(User);
    const user = await userRepo.findOneByOrFail({ username: decodedToken.username });
    if (!usersMap.has(user.id)) {
      usersMap.set(user.id, { ...user, sourceFor: 0 });
    }
    // eslint-disable-next-line no-param-reassign
    socket.userRef = user.id;
    return next();
  } catch (error) {
    const err = new Error('401');
    return next(err);
  }
};

const apiAuth = (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.cookies;
  if (!token) return res.sendStatus(401);
  try {
    jwt.verify(token, process.env.SECRET_KEY);
    return next();
  } catch (error) {
    res.cookie('token', '', { maxAge: 0 });
    return res.sendStatus(400);
  }
};

export { apiAuth, socketAuth };
