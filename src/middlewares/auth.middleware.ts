import { NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { parse } from 'cookie';
import mysqlDataSrc from '../database/mysql.config.js';
import User from '../entity/user.entity.js';
import { TypedSocketWithUser } from '../interfaces/Socket.interface';

const auth = async (
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
    // eslint-disable-next-line no-param-reassign
    socket.user = user;
    return next();
  } catch (error) {
    const err = new Error('401');
    return next(err);
  }
};

export default auth;
