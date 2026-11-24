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
  base: 'inline-flex items-center justify-center gap-2 font-bold whitespace-nowrap select-none transition-[background-color,box-shadow,color,transform] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100',
  size: {
    sm: 'h-[38px] px-3.5 text-sm rounded-[11px]',
    md: 'h-12 px-5 text-[15.5px] rounded-[var(--radius-control)]',
    lg: 'h-14 px-6 text-base rounded-2xl',
  },
  variant: {
    primary: 'bg-primary text-primary-ink hover:bg-primary-hover',
    soft: 'bg-field text-ink hover:bg-line',
    line: 'bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line-2)] hover:bg-field',
    ghost: 'text-ink-2 hover:bg-field hover:text-ink',
    danger: 'text-bad hover:bg-bad-soft',
    hero: 'bg-hero-chip text-hero-ink hover:bg-hero-chip-hover',
  },
};

export const Button = forwardRef(function Button({ variant = 'soft', size = 'md', icon: Icon, iconEnd: IconEnd, className, children, ...props }, ref) {
  return (
    <button ref={ref} type="button" className={cx(BUTTON.base, BUTTON.size[size], BUTTON.variant[variant], className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-[1.15em] shrink-0" />}
      {children}
      {IconEnd && <IconEnd aria-hidden="true" className="size-[1.1em] shrink-0" />}
    </button>
  );
});

export function LinkButton({ variant = 'soft', size = 'md', icon: Icon, className, children, ...props }) {
  return (
    <a className={cx(BUTTON.base, BUTTON.size[size], BUTTON.variant[variant], className)} {...props}>
      {Icon && <Icon aria-hidden="true" className="size-[1.15em] shrink-0" />}
      {children}
    </a>
  );
}

export function IconButton({ label, icon: Icon, className, size = 'md', variant = 'ghost', ...props }) {
  const dims = size === 'sm' ? 'size-9 rounded-[11px]' : 'size-10 rounded-xl';
  return (
    <button type="button" aria-label={label} title={label} className={cx('inline-flex shrink-0 items-center justify-center transition-colors', dims, BUTTON.variant[variant], className)} {...props}>
      <Icon aria-hidden="true" className="size-5" />
    </button>
  );
}

/**
 * Single choice from a few options, rendered as a segmented control. Built on
 * radio inputs: arrow keys, labels and screen readers work natively.
 */
export function Segmented({ legend, name, value, onChange, options, className, legendClassName }) {
  return (
    <fieldset className={className}>
      <legend className={cx('mb-2 text-[15px] font-bold', legendClassName)}>{legend}</legend>
      <div className="grid gap-1 rounded-2xl bg-field p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => {
          const Icon = o.icon;
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(
                'relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-center text-sm font-bold transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus-ring)]',
                checked ? 'bg-paper text-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)]' : 'text-ink-2 hover:text-ink',
                o.disabled && 'cursor-not-allowed opacity-40',
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

/** Pill choices. Same radio foundation as Segmented. */
export function ChoiceChips({ legend, name, value, onChange, options, hint }) {
  return (
    <fieldset>
      <legend className="mb-2 text-[15px] font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={String(o.value)}
              className={cx(
                'flex min-h-11 flex-col justify-center rounded-[var(--radius-control)] px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--focus-ring)]',
                checked ? 'bg-primary text-primary-ink' : 'bg-paper text-ink shadow-[inset_0_0_0_1.5px_var(--line)] hover:shadow-[inset_0_0_0_1.5px_var(--line-2)]',
                o.disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              <input type="radio" className="sr-only" name={name} value={String(o.value)} checked={checked} disabled={o.disabled} onChange={() => onChange(o.value)} />
              <span className="font-bold">{o.label}</span>
              {o.sub && <span className={cx('text-xs tabular-nums', checked ? 'opacity-80' : 'text-ink-2')}>{o.sub}</span>}
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
    <div className="flex items-start justify-between gap-4 py-2.5">
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
        className="relative mt-0.5 h-[26px] w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-[var(--switch-off)] transition-colors checked:bg-[var(--switch-on)] disabled:cursor-not-allowed before:absolute before:start-[3px] before:top-[3px] before:size-5 before:rounded-full before:bg-[var(--knob)] before:shadow before:transition-transform checked:before:translate-x-[18px]"
      />
    </div>
  );
}

export function Checkbox({ checked, onChange, children, className }) {
  return (
    <label className={cx('flex items-start gap-3 py-1.5', className)}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--perm)]" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

const FIELD = 'h-12 w-full rounded-xl bg-paper px-3.5 text-ink shadow-[inset_0_0_0_1.5px_var(--line)] outline-none focus:shadow-[inset_0_0_0_2px_var(--ink)]';

export function Select({ label, value, onChange, options, className }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <select id={id} value={String(value)} onChange={(e) => onChange(e.target.value)} className={FIELD}>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hint || error ? hintId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={cx(FIELD, 'placeholder:text-ink-3', error && 'shadow-[inset_0_0_0_2px_var(--bad)]', inputClassName)}
        {...props}
      />
      {(error || hint) && (
        <p id={hintId} className={cx('mt-1.5 text-sm', error ? 'font-semibold text-bad' : 'text-ink-2')}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div aria-hidden="true" className={cx('skeleton rounded-[var(--radius-control)]', className)} />;
}

/** Modal sheet on <dialog>: bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, closeLabel = 'Close', wide = false }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx('m-0 mt-auto w-full max-w-none rounded-t-[28px] bg-paper p-0 text-ink backdrop:bg-black/50 sm:m-auto sm:rounded-[var(--radius-card)]', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
    >
      <div className="safe-bottom max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
        <div className="mx-auto -mt-2 mb-3 h-[5px] w-10 rounded-full bg-line-2 sm:hidden" aria-hidden="true" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="heading text-xl">
            {title}
          </h2>
          <IconButton label={closeLabel} icon={X} size="sm" variant="soft" onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-[var(--radius-card)] bg-paper p-8 shadow-card sm:p-10">
      {Icon && (
        <span className="grid size-12 place-items-center rounded-2xl bg-sun text-sun-ink">
          <Icon aria-hidden="true" className="size-6" />
        </span>
      )}
      <h2 className="heading text-2xl">{title}</h2>
      {body && <p className="max-w-[46ch] text-ink-2">{body}</p>}
      {action}
    </div>
  );
}
