import { Router } from 'express';
import registerRouter from './register/register.route.js';
import loginRouter from './login/login.route.js';
import roomsRouter from './rooms/rooms.route.js';

const router = Router();
router.use('/register', registerRouter);
router.use('/login', loginRouter);
router.use('/rooms', roomsRouter);

export default router;
