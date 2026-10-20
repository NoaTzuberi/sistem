import type { CSSProperties } from 'react';
import { IconPlayerPauseFilled, IconPlayerPlayFilled, IconPlayerSkipBackFilled, IconPlayerSkipForwardFilled, IconX } from '@tabler/icons-react';
import type { CardioMetric } from '@sistem/types';
import { type CardioFrame, cardioKindLabel, cardioTip, describeCardioTarget, fill, formatClock, intensityZone, useCopy, useLanguage } from '@sistem/shared';
import { cardioCopy } from '../../copy';
import { LONG_BLOCK_NAME, liveEyebrow } from '../../data/cardioText';
import { CardioCountdown } from '../CardioCountdown/CardioCountdown';
import './CardioPlayer.css';

interface CardioPlayerProps {
  frames: CardioFrame[];
  frame: CardioFrame;
  frameLeft: number;
  position: number;
  totalSec: number;
  metric: CardioMetric;
  countdown: number;
  isPaused: boolean;
  onEnd: () => void;
  onPrevious: () => void;
  onTogglePause: () => void;
  onNext: () => void;
}

/** The live run, full screen on the block's zone color: name, target, the big clock, what's next, the whole session. */
export function CardioPlayer(props: CardioPlayerProps) {
  const { frames, frame, frameLeft, position, totalSec, metric, countdown, isPaused, onEnd, onPrevious, onTogglePause, onNext } = props;
  const copy = useCopy(cardioCopy);
  const language = useLanguage();
  const name = cardioKindLabel(frame.block.kind, language);
  const target = describeCardioTarget(frame.block.intensity, metric, language);
  const tip = cardioTip(frame.block.kind, language);
  const next = frames[frame.index + 1];
  const secondsLeft = Math.ceil(frameLeft);
  const blockProgress = frame.block.durationSec > 0 ? 1 - frameLeft / frame.block.durationSec : 1;
  const eyebrow = liveEyebrow(frame.block.kind, frame.round, frame.rounds);
  const beat = countdown === 0 && !isPaused && secondsLeft <= 3 && secondsLeft > 0;

  return (
    <div className="cp-live cp-zone" data-zone={intensityZone(frame.block.intensity)}>
      <div className="cp-live-top">
        <button className="cp-live-icon" type="button" aria-label={copy.endEarly} onClick={onEnd}>
          <IconX size={22} aria-hidden="true" />
        </button>
        {eyebrow && (
          <code className="cp-live-eyebrow" aria-hidden="true">
            {eyebrow}
          </code>
        )}
      </div>

      <p className={'cp-live-kind' + (name.length > LONG_BLOCK_NAME ? ' cp-live-kind-long' : '')}>{name}</p>
      <p className="cp-live-target">
        {target.label} <bdi className="cp-live-target-value" dir="ltr">{target.value}</bdi>
        {tip && ` · ${tip}`}
      </p>
      <p className="cp-live-clock" role="timer" aria-live="off">
        <span key={beat ? secondsLeft : 'still'} className={beat ? 'cp-live-clock-beat' : undefined}>
          {formatClock(secondsLeft)}
        </span>
      </p>
      <div className="cp-live-bar" aria-hidden="true">
        <i style={{ '--cp-p': Math.min(1, Math.max(0, blockProgress)) } as CSSProperties} />
      </div>

      <div className="cp-live-next">
        {next ? (
          <>
            <i className="cp-live-next-dot cp-zone" data-zone={intensityZone(next.block.intensity)} aria-hidden="true" />
            <div className="cp-live-next-text">
              <span>{copy.upNext}</span>
              <b>{cardioKindLabel(next.block.kind, language)}</b>
            </div>
            <bdi className="cp-live-next-time" dir="ltr">
              {formatClock(next.block.durationSec)}
            </bdi>
          </>
        ) : (
          <div className="cp-live-next-text">
            <span>{copy.lastBlock}</span>
            <b>{copy.almostThere}</b>
          </div>
        )}
      </div>

      <div className="cp-live-strip" aria-hidden="true">
        {frames.map((item) => (
          <i
            key={item.index}
            data-state={item.index < frame.index ? 'done' : item.index === frame.index ? 'now' : undefined}
            style={{ '--cp-w': item.block.durationSec, '--cp-h': `${18 + item.block.intensity * 8}%` } as CSSProperties}
          />
        ))}
      </div>
      <div className="cp-live-totals">
        <span>
          {copy.elapsed} <bdi dir="ltr">{formatClock(position)}</bdi>
        </span>
        <span>
          {copy.remaining} <bdi dir="ltr">{formatClock(totalSec - position)}</bdi>
        </span>
      </div>

      {/* Media-player order: previous · pause · next, left to right in both languages. */}
      <div className="cp-live-controls">
        <button className="cp-live-control" type="button" aria-label={copy.previous} onClick={onPrevious}>
          <IconPlayerSkipBackFilled size={22} aria-hidden="true" />
        </button>
        <button className="cp-live-control cp-live-control-main" type="button" aria-label={isPaused ? copy.resume : copy.pause} onClick={onTogglePause}>
          {isPaused ? <IconPlayerPlayFilled size={32} aria-hidden="true" /> : <IconPlayerPauseFilled size={32} aria-hidden="true" />}
        </button>
        <button className="cp-live-control" type="button" aria-label={copy.next} onClick={onNext}>
          <IconPlayerSkipForwardFilled size={22} aria-hidden="true" />
        </button>
      </div>

      {/* One polite line per block, not every second. */}
      <p className="cp-live-announce" aria-live="polite">
        {countdown === 0 ? fill(copy.blockAnnounce, { name, time: formatClock(frame.block.durationSec) }) : ''}
      </p>

      {countdown > 0 && <CardioCountdown value={countdown} />}
    </div>
  );
}
