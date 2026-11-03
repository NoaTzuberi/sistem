import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { accountDeleteRateLimit } from '../../middleware/rateLimit.middleware';
import { deleteAccount } from './account.controller';

export const accountRouter = Router();

// Her own account only; the password check is rate limited per user.
accountRouter.delete('/', requireAuth, accountDeleteRateLimit, deleteAccount);
