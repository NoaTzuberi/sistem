import dotenv from 'dotenv';
import { parseClientOrigins } from './clientOrigins';

dotenv.config();

const DEFAULT_PORT = 5002;
const DEFAULT_JWT_SECRET = 'JWT_SECRET';

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || DEFAULT_PORT,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  voyageApiKey: process.env.VOYAGE_API_KEY || '',
  // CORS allow-list (comma-separated in CLIENT_ORIGINS). Never '*'.
  clientOrigins: parseClientOrigins(process.env.CLIENT_ORIGINS, process.env.NODE_ENV || 'development'),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // The coach dashboard (the admin's "set password" links open there).
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:5174',
  // Accounts with this email get the admin role at server start (idempotent; empty = none).
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Sistem <onboarding@resend.dev>',
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
  // AI recommendations (Phase 12). Defaults and limits live in features/ai/ai.config.ts.
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    model: (process.env.AI_MODEL || '').trim(),
    fallbackModel: (process.env.AI_FALLBACK_MODEL || '').trim(),
    // The Gemini free tier may use what we send to improve Google's products, so the AI
    // never runs in production until a paid tier / provider that excludes training is set.
    paidTier: process.env.AI_PAID_TIER === 'true',
  },
};

if (config.nodeEnv === 'production' && config.clientOrigins.length === 0) {
  console.warn('[cors] CLIENT_ORIGINS is empty: no website can call this API. Set it to the front end origin(s).');
}

if (config.nodeEnv === 'production' && config.jwtSecret === DEFAULT_JWT_SECRET) {
  throw new Error(
    'JWT_SECRET must be set to a strong, unique value in production — refusing to start with the insecure default.',
  );
}
