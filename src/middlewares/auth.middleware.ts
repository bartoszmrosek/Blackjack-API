import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import { User } from '../interfaces/User.interface';

export interface withUserRequest extends Request {
  user: User;
}

const auth = (
  req: withUserRequest,
  res: Response,
  next: NextFunction,
) => {
  const { token } = req.cookies;
  if (!token || token === null) return res.sendStatus(401);
  return jwt.verify(
    token,
    process.env.SECRET_KEY as string,
    (err: Error, user: User) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      return next();
    },
  );
};

export default auth;
