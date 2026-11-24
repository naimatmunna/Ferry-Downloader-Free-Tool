/**
 * UI primitives. Native elements first (radios, checkboxes, <dialog>,
 * <details>) so keyboard and screen-reader behaviour comes for free.
 */
import { forwardRef, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

const BUTTON = {
  base: 'inline-flex items-center justify-center gap-2 font-semibold select-none transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100',
  size: {
    sm: 'h-9 px-3 text-sm rounded-[var(--radius-control)]',
    md: 'h-11 px-4 text-[0.95rem] rounded-[var(--radius-control)]',
    lg: 'h-14 px-6 text-base rounded-[var(--radius-control)]',
  },
  variant: {
    primary: 'bg-signal text-signal-ink hover:bg-signal-hover',
    secondary: 'bg-surface text-ink border border-line hover:border-line-strong',
    ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
    danger: 'text-buoy hover:bg-buoy-soft',
    hull: 'bg-hull-2 text-hull-ink hover:bg-white/15 border border-white/20',
  },
};

export const Button = forwardRef(function Button({ variant = 'secondary', size = 'md', icon: Icon, iconEnd: IconEnd, className, children, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cx(BUTTON.base, BUTTON.size[size], BUTTON.variant[variant], className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-[1.15em] shrink-0" />}
      {children}
      {IconEnd && <IconEnd aria-hidden="true" className="size-[1.1em] shrink-0" />}
    </button>
  );
});

export function LinkButton({ variant = 'secondary', size = 'md', icon: Icon, className, children, ...props }) {
  return (
    <a className={cx(BUTTON.base, BUTTON.size[size], BUTTON.variant[variant], className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-[1.15em] shrink-0" />}
      {children}
    </a>
  );
}

export function IconButton({ label, icon: Icon, className, size = 'md', variant = 'ghost', ...props }) {
  const dims = size === 'sm' ? 'size-9' : 'size-11';
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex items-center justify-center rounded-[var(--radius-control)] transition-colors', dims, BUTTON.variant[variant], className)} {...props}>
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}

/**
 * Single choice from a few options, rendered as a segmented control. Built on
 * radio inputs: arrow keys, labels and screen readers work natively.
 */
export function Segmented({ legend, name, value, onChange, options, className }) {
  return (
    <fieldset className={className}>
      <legend className="mb-2 text-sm font-semibold text-ink-2">{legend}</legend>
      <div className="grid gap-1 rounded-[calc(var(--radius-control)+4px)] bg-surface-2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const Icon = o.icon;
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-control)] px-2 py-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus-ring)]',
                checked ? 'bg-surface text-ink shadow-[0_1px_0_var(--line),0_6px_16px_-12px_rgb(0_0_0/0.5)]' : 'text-ink-2 hover:text-ink',
                o.disabled && 'cursor-not-allowed opacity-45',
              )}
            >
              <input type="radio" className="sr-only" name={name} value={o.value} checked={checked} disabled={o.disabled} onChange={() => onChange(o.value)} />
              {Icon && <Icon aria-hidden="true" className="size-5" />}
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Pill choices (qualities, formats). Same radio foundation as Segmented. */
export function ChoiceChips({ legend, name, value, onChange, options, hint }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-ink-2">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={cx(
                'flex min-h-11 items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]',
                checked ? 'border-hull bg-hull text-hull-ink' : 'border-line bg-surface text-ink hover:border-line-strong',
                o.disabled && 'cursor-not-allowed opacity-45',
              )}
            >
              <input type="radio" className="sr-only" name={name} value={String(o.value)} checked={checked} disabled={o.disabled} onChange={() => onChange(o.value)} />
              <span className="font-semibold">{o.label}</span>
              {o.sub && <span className={cx('tabular-nums', checked ? 'text-hull-ink-2' : 'text-ink-2')}>{o.sub}</span>}
            </label>
          );
        })}
      </div>
      {hint && <p className="mt-2 text-sm text-ink-2">{hint}</p>}
    </fieldset>
  );
}

export function Switch({ checked, onChange, label, help, disabled }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <label htmlFor={id} className={cx('min-w-0', disabled && 'opacity-50')}>
        <span className="block font-medium">{label}</span>
        {help && <span className="mt-0.5 block text-sm text-ink-2">{help}</span>}
      </label>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer relative mt-0.5 h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-[var(--switch-off)] transition-colors checked:bg-[var(--switch-on)] disabled:cursor-not-allowed before:absolute before:start-1 before:top-1 before:size-5 before:rounded-full before:bg-white before:shadow before:transition-transform checked:before:translate-x-5 rtl:checked:before:-translate-x-5"
      />
    </div>
  );
}

export function Checkbox({ checked, onChange, children, className }) {
  return (
    <label className={cx('flex items-start gap-3 py-1.5', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-5 shrink-0 accent-[var(--hull)]" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

export function Select({ label, value, onChange, options, className }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-[var(--radius-control)] border border-line bg-surface px-3 text-ink"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({ label, hint, error, className, inputClassName, ...props }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink-2">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint || error ? hintId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cx('h-11 w-full rounded-[var(--radius-control)] border bg-surface px-3 text-ink placeholder:text-ink-2/70', error ? 'border-buoy' : 'border-line', inputClassName)}
        {...props}
      />
      {(error || hint) && (
        <p id={hintId} className={cx('mt-1.5 text-sm', error ? 'text-buoy' : 'text-ink-2')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

const POLICY_STYLE = {
  allowed: 'bg-kelp-soft text-kelp',
  attestation: 'bg-amber-soft text-amber',
  export_only: 'bg-sea-soft text-sea',
  blocked: 'bg-buoy-soft text-buoy',
  disabled: 'bg-surface-2 text-ink-2',
};
const POLICY_SHAPE = {
  allowed: <circle cx="5" cy="5" r="4" />,
  attestation: <path d="M5 1 9 9H1z" />,
  export_only: <rect x="1.5" y="1.5" width="7" height="7" rx="1" />,
  blocked: <path d="M2 2l6 6M8 2 2 8" strokeWidth="2" stroke="currentColor" />,
  disabled: <rect x="1" y="4" width="8" height="2" />,
};

/** Policy badge: colour + shape + words (never colour alone). */
export function PolicyBadge({ policy, label, className }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8125rem] font-semibold', POLICY_STYLE[policy] ?? POLICY_STYLE.disabled, className)}>
      <svg viewBox="0 0 10 10" className="size-2.5 fill-current" aria-hidden="true">
        {POLICY_SHAPE[policy] ?? POLICY_SHAPE.disabled}
      </svg>
      {label}
    </span>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx('skeleton rounded-[var(--radius-control)]', className)} />;
}

/** Modal sheet on <dialog>: bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, closeLabel = 'Close' }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className="m-0 mt-auto w-full max-w-none rounded-t-[var(--radius-panel)] bg-surface p-0 text-ink backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-[var(--radius-panel)]"
    >
      <div className="safe-bottom max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label={closeLabel} icon={X} size="sm" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-start gap-3 py-14">
      {Icon && <Icon aria-hidden="true" className="size-8 text-ink-2" />}
      <h2 className="text-xl font-bold">{title}</h2>
      {body && <p className="max-w-[46ch] text-ink-2">{body}</p>}
      {action}
    </div>
  );
}
