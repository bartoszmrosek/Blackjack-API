import { Router } from 'express';
import registerRouter from './Register/register.route.js';
import loginRouter from './Login/login.route.js';

const router = Router();
router.use('/register', registerRouter);
router.use('/login', loginRouter);

export default router;
