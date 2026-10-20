import { Schema, model } from 'mongoose';
import { isSunday } from '../plans/planWeek';
import { MAX_DAY_OF_WEEK, MIN_DAY_OF_WEEK } from '../plans/plan.constants';
import { CARDIO_METRIC_IDS, CARDIO_SESSION_STATUS_IDS, CARDIO_SPORT_IDS, MAX_CARDIO_LOG_NOTE_LENGTH, MAX_CARDIO_NOTE_LENGTH } from './cardio.constants';
import type { CardioLogDocument, CardioSessionDocument } from './cardio.types';

// Steps are checked in code (cardio.validation.ts) before every save; Mixed keeps the
// block / repeat-set union as sent.
const cardioSessionSchema = new Schema<CardioSessionDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    sport: { type: String, enum: CARDIO_SPORT_IDS, required: true },
    metric: { type: String, enum: CARDIO_METRIC_IDS, required: true },
    steps: { type: Schema.Types.Mixed, required: true },
    note: { type: String, trim: true, maxlength: MAX_CARDIO_NOTE_LENGTH, default: null },
    days: { type: [{ type: Number, min: MIN_DAY_OF_WEEK, max: MAX_DAY_OF_WEEK }], default: [] },
    repeatsWeekly: { type: Boolean, required: true, default: false },
    weekStartDate: {
      type: String,
      required: true,
      validate: { validator: isSunday, message: 'weekStartDate must be a Sunday (YYYY-MM-DD).' },
    },
    status: { type: String, enum: CARDIO_SESSION_STATUS_IDS, required: true, default: 'draft' },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

cardioSessionSchema.index({ traineeId: 1, archivedAt: 1, weekStartDate: 1 });

const cardioLogSchema = new Schema<CardioLogDocument>(
  {
    traineeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'CardioSession', required: true },
    sessionName: { type: String, required: true, trim: true },
    sport: { type: String, enum: CARDIO_SPORT_IDS, required: true },
    date: { type: String, required: true },
    completedSec: { type: Number, required: true, min: 0 },
    roundsDone: { type: Number, required: true, min: 0 },
    roundsTotal: { type: Number, required: true, min: 0 },
    highIntensitySec: { type: Number, required: true, min: 0 },
    distanceKm: { type: Number, min: 0, default: null },
    rpe: { type: Number, required: true, min: 1, max: 10 },
    note: { type: String, trim: true, maxlength: MAX_CARDIO_LOG_NOTE_LENGTH, default: null },
  },
  { timestamps: true },
);

// One log per session per day.
cardioLogSchema.index({ traineeId: 1, sessionId: 1, date: 1 }, { unique: true });
cardioLogSchema.index({ traineeId: 1, date: -1 });

export const CardioSession = model<CardioSessionDocument>('CardioSession', cardioSessionSchema);
export const CardioLog = model<CardioLogDocument>('CardioLog', cardioLogSchema);
