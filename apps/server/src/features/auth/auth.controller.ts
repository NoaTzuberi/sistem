import { Request, Response } from 'express';
import {
  validateRegisterInput,
  validateLoginInput,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  parsePasswordResetApp,
} from './auth.validation';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  requestPasswordReset,
  isResetTokenLive,
  resetPassword as resetPasswordService,
  EmailAlreadyInUseError,
  InvalidCredentialsError,
  UserNotFoundError,
  InvalidResetTokenError,
  SetPasswordTokenError,
  setPasswordWithToken,
} from './auth.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requestLanguage, sendError, translate } from '../../i18n';

export async function register(req: Request, res: Response) {
  const validationError = validateRegisterInput(req.body);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  const { name, email, password, timezone, language, inviteCode } = req.body;

  try {
    const { inviteError, ...result } = await registerUser(name, email, password, timezone, language, inviteCode);
    // The account exists either way; an unusable code comes back as a sentence the app can show.
    res.status(201).json(inviteError ? { ...result, inviteError: { code: inviteError.code, message: translate(requestLanguage(req), inviteError) } } : result);
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      sendError(res, 409, error.serverMessage);
      return;
    }
    throw error;
  }
}

export async function login(req: Request, res: Response) {
  const validationError = validateLoginInput(req.body);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  const { email, password } = req.body;

  try {
    const result = await loginUser(email, password);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      sendError(res, 401, error.serverMessage);
      return;
    }
    throw error;
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const validationError = validateForgotPasswordInput(req.body);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  await requestPasswordReset(req.body.email, parsePasswordResetApp(req.body.app));
  sendError(res, 200, 'reset_link_sent');
}

/** { valid } — the dashboard reset screen asks before showing the password fields. */
export async function checkResetToken(req: Request, res: Response) {
  const token = req.body?.token;
  res.status(200).json({ valid: typeof token === 'string' && token.length > 0 && (await isResetTokenLive(token)) });
}

export async function resetPassword(req: Request, res: Response) {
  const validationError = validateResetPasswordInput(req.body);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }

  const { token, password } = req.body;

  try {
    await resetPasswordService(token, password);
    sendError(res, 200, 'password_reset_done');
  } catch (error) {
    if (error instanceof InvalidResetTokenError) {
      sendError(res, 400, error.serverMessage);
      return;
    }
    throw error;
  }
}

/** The admin's one-time link: sets the password and signs her in (AuthResponse). */
export async function setPassword(req: Request, res: Response) {
  const validationError = validateResetPasswordInput(req.body);
  if (validationError) {
    sendError(res, 400, validationError);
    return;
  }
  try {
    res.status(200).json(await setPasswordWithToken(req.body.token, req.body.password));
  } catch (error) {
    if (error instanceof SetPasswordTokenError) {
      sendError(res, 400, error.serverMessage);
      return;
    }
    throw error;
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    const user = await getCurrentUser(req.userId!);
    res.status(200).json({ user });
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      sendError(res, 401, error.serverMessage);
      return;
    }
    throw error;
  }
}
