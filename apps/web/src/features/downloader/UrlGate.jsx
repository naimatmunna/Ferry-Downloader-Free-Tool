import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Link2, X } from 'lucide-react';
import { extractUrls, hasPlaylistParam } from '@ferry/shared/url';
import { useI18n } from '../../lib/i18n/index.jsx';
import { canReadClipboard } from '../../lib/env.js';
import { detect, usePlatforms } from '../../lib/registry.js';
import { useAnalysis } from '../../state/analysis.js';
import { Button, PolicyBadge, cx } from '../../components/ui.jsx';

/** Debounced value (the error hint waits until typing pauses). */
function useSettled(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export function UrlGate() {
  const { t } = useI18n();
  const input = useAnalysis((s) => s.input);
  const setInput = useAnalysis((s) => s.setInput);
  const analyze = useAnalysis((s) => s.analyze);
  const reset = useAnalysis((s) => s.reset);
  const status = useAnalysis((s) => s.status);
  const registry = usePlatforms((s) => s.registry);
  const [notice, setNotice] = useState(null);
  const [wholePlaylist, setWholePlaylist] = useState(false);
  const ref = useRef(null);
  const settled = useSettled(input, 600);

  const links = useMemo(() => extractUrls(input, { max: 100 }), [input]);
  const multiple = links.length > 1;
  const detection = useMemo(() => {
    void registry; // re-run when the registry arrives
    const text = input.trim();
    return text && !multiple ? detect(text) : null;
  }, [input, multiple, registry]);
  const showReason = detection && !detection.ok && detection.reason !== 'empty' && settled === input;
  const playlistParam = detection?.ok && hasPlaylistParam(detection.url);

  // Auto-grow the field so several pasted links stay readable.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [input]);

  function submit(text = input) {
    setNotice(null);
    if (!text.trim()) {
      ref.current?.focus();
      return;
    }
    analyze(text, { playlist: wholePlaylist });
  }

  async function paste() {
    setNotice(null);
    if (!canReadClipboard()) {
      setNotice(t('gate.pasteBlocked'));
      ref.current?.focus();
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) {
        setInput(text.trim());
        submit(text.trim());
      } else ref.current?.focus();
    } catch {
      setNotice(t('gate.pasteBlocked'));
      ref.current?.focus();
    }
  }

  const policyLabel = detection?.ok ? (detection.platform.available === false ? t('policy.unavailable') : t(`policy.${detection.platform.policy}`)) : null;

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-col gap-2 rounded-[var(--radius-gate)] bg-surface p-2 text-ink shadow-lift sm:flex-row sm:items-start">
        {/* Links are always left-to-right, even in Arabic: keep the whole field group LTR. */}
        <div className="relative min-w-0 flex-1" dir="ltr">
          <Link2 aria-hidden="true" className="pointer-events-none absolute start-4 top-4 size-6 text-ink-2" />
          <label htmlFor="gate-input" className="sr-only">
            {t('gate.label')}
          </label>
          <textarea
            id="gate-input"
            ref={ref}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData?.getData('text');
              if (text?.trim() && !input.trim()) {
                e.preventDefault();
                setInput(text.trim());
                submit(text.trim());
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={t('gate.placeholder')}
            inputMode="url"
            dir="ltr"
            enterKeyHint="go"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            aria-describedby="gate-status"
            className="block min-h-14 w-full resize-none bg-transparent py-3.5 ps-13 pe-28 text-lg leading-7 placeholder:text-ink-2/60 focus:outline-none"
          />
          <div className="absolute end-2 top-2 flex items-center gap-1">
            {input && (
              <button
                type="button"
                aria-label={t('gate.clear')}
                title={t('gate.clear')}
                onClick={() => {
                  setInput('');
                  reset();
                  ref.current?.focus();
                }}
                className="flex size-10 items-center justify-center rounded-[var(--radius-control)] text-ink-2 hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            )}
            {!input && (
              <button type="button" onClick={paste} className="flex h-10 items-center gap-1.5 rounded-[var(--radius-control)] px-3 font-semibold text-hull hover:bg-surface-2 dark:text-signal">
                <ClipboardPaste className="size-5" aria-hidden="true" />
                {t('gate.paste')}
              </button>
            )}
          </div>
        </div>
        <Button type="submit" variant="primary" size="lg" className="sm:min-w-40" disabled={status === 'probing'}>
          {multiple ? t('gate.findAll') : t('gate.submit')}
        </Button>
      </div>

      <div id="gate-status" aria-live="polite" className="mt-3 min-h-8 text-sm">
        {multiple && <p className="font-semibold text-hull-ink">{t('gate.links', { count: links.length })}</p>}
        {detection?.ok && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-semibold text-hull-ink">{detection.platform.name}</span>
            <PolicyBadge policy={detection.platform.available === false ? 'disabled' : detection.platform.policy} label={policyLabel} />
          </p>
        )}
        {showReason && <p className="font-semibold text-signal">{t(`reasons.${detection.reason}`)}</p>}
        {notice && <p className="text-hull-ink-2">{notice}</p>}
        {playlistParam && (
          <label className={cx('mt-2 flex items-center gap-2 text-hull-ink-2')}>
            <input type="checkbox" className="size-4 accent-[var(--signal)]" checked={wholePlaylist} onChange={(e) => setWholePlaylist(e.target.checked)} />
            {t('gate.wholePlaylist')}
          </label>
        )}
      </div>
    </form>
  );
}
