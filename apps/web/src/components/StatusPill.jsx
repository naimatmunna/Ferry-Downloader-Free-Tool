/** Site status and live status, always as colour + icon + words. */
import { ArrowUpRight, Ban, Check, Globe, Lock, PlugZap, UserCheck } from 'lucide-react';
import { useI18n } from '../lib/i18n/index.jsx';
import { cx } from './ui.jsx';

const ICON = { free: Check, perm: UserCheck, off: ArrowUpRight, lock: Lock, any: Globe, 'off-server': Ban, unavailable: PlugZap };
const TONE = {
  free: 'bg-ok-soft text-ok',
  perm: 'bg-perm-soft text-perm',
  off: 'bg-off-soft text-off',
  lock: 'bg-lock-soft text-lock',
  any: 'bg-field text-ink-2',
  'off-server': 'bg-field text-ink-2',
  unavailable: 'bg-field text-ink-2',
};
// On the yellow top band the soft tints turn muddy, so pills sit on white there.
const ON_HERO = {
  free: 'bg-hero-pill text-ok',
  perm: 'bg-hero-pill text-perm',
  off: 'bg-hero-pill text-off',
  lock: 'bg-hero-pill text-lock',
  any: 'bg-hero-pill text-ink-2',
  'off-server': 'bg-hero-pill text-ink-2',
  unavailable: 'bg-hero-pill text-ink-2',
};

export function StatusPill({ status, mini = false, onHero = false, className }) {
  const { t } = useI18n();
  if (!status) return null;
  const Icon = ICON[status] ?? Globe;
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full font-[650]',
        mini ? 'h-[22px] gap-1 ps-1.5 pe-2 text-[11.5px]' : 'h-7 gap-1.5 ps-2 pe-2.5 text-[13px]',
        (onHero ? ON_HERO : TONE)[status],
        className,
      )}
    >
      <Icon aria-hidden="true" className={mini ? 'size-3' : 'size-[15px]'} strokeWidth={2.6} />
      {mini ? t(`status.short.${status}`) : t(`status.${status}`)}
    </span>
  );
}

const DOT = { ok: 'bg-ok-dot', warn: 'bg-warn-dot', bad: 'bg-bad-dot' };

export function LiveDot({ tone, pulse = false, className }) {
  return <span aria-hidden="true" className={cx('inline-block size-2 shrink-0 rounded-full', DOT[tone], pulse && tone === 'ok' && 'animate-pulse-dot', className)} />;
}

/** "Working, last hour": what the dot means and over which window, from a liveDot() result. */
export function liveLabel(live, t) {
  return `${t(`live.${live.tone}`)}, ${t(`live.windowShort.${live.window}`)}`;
}

/** Live status as a pill. `surface`: 'hero' on the yellow top band, 'field' on cards. */
export function LivePill({ live, surface = 'hero', className }) {
  const { t } = useI18n();
  if (!live) return null;
  return (
    <span
      className={cx('inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] font-[650] text-ink', surface === 'field' ? 'bg-field' : 'bg-hero-pill', className)}
      title={t('live.detail', { window: t(`live.window.${live.window}`), rate: Math.round(live.successRate), count: live.attempts })}
    >
      <LiveDot tone={live.tone} />
      {liveLabel(live, t)}
    </span>
  );
}
