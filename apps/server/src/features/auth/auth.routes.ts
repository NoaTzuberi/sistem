import { Router } from 'express';
import { register, login, me, forgotPassword, resetPassword, setPassword, checkResetToken } from './auth.controller';
import { requireAuth } from '../../middleware/auth.middleware';
import { authRateLimit, resetEmailRateLimit } from '../../middleware/rateLimit.middleware';

export const authRouter = Router();

// Everything that guesses or creates credentials is rate limited per IP.
authRouter.post('/register', authRateLimit, register);
authRouter.post('/login', authRateLimit, login);
authRouter.get('/me', requireAuth, me);
// Reset links: per IP, and the request also per email (one inbox can't be flooded from many IPs).
authRouter.post('/forgot-password', authRateLimit, resetEmailRateLimit, forgotPassword);
authRouter.post('/reset-password/check', authRateLimit, checkResetToken);
authRouter.post('/reset-password', authRateLimit, resetPassword);
authRouter.post('/set-password', authRateLimit, setPassword);
