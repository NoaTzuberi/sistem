import { Router } from 'express';
import { register, login, me, forgotPassword, resetPassword, setPassword } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authRateLimit } from '../../middleware/rateLimit.middleware';

export const authRouter = Router();

// Everything that guesses or creates credentials is rate limited per IP.
authRouter.post('/register', authRateLimit, register);
authRouter.post('/login', authRateLimit, login);
authRouter.get('/me', requireAuth, me);
authRouter.post('/forgot-password', authRateLimit, forgotPassword);
authRouter.post('/reset-password', authRateLimit, resetPassword);
authRouter.post('/set-password', authRateLimit, setPassword);
