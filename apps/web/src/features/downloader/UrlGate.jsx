import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardPaste, Link2, X } from 'lucide-react';
import { extractUrls, hasPlaylistParam } from '@ferry/shared/url';
import { useI18n } from '../../lib/i18n/index.jsx';
import { canReadClipboard } from '../../lib/env.js';
import { detect, usePlatforms } from '../../lib/registry.js';
import { shelfOf, siteStatus } from '../../lib/siteStatus.js';
import { useAnalysis } from '../../state/analysis.js';
import { useLiveDot } from '../../state/liveStatus.js';
import { SiteIcon } from '../../components/SiteIcon.jsx';
import { LivePill, StatusPill } from '../../components/StatusPill.jsx';
import { Button, cx } from '../../components/ui.jsx';

/** Debounced value (the error hint waits until typing pauses). */
function useSettled(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** What the current input is: several links, one detected site, or an invalid link. */
export function useDetection() {
  const input = useAnalysis((s) => s.input);
  const registry = usePlatforms((s) => s.registry);
  return useMemo(() => {
    void registry; // re-run when the registry arrives
    const links = extractUrls(input, { max: 100 });
    const text = input.trim();
    const detection = text && links.length <= 1 ? detect(text) : null;
    return { links, multiple: links.length > 1, detection };
  }, [input, registry]);
}

function Detected({ platform }) {
  const { t } = useI18n();
  const status = siteStatus(platform);
  // Live status only for sites Ferry downloads from: a green "Working" next to "Turned off here" would mislead.
  const live = useLiveDot(shelfOf(status) === 'direct' ? platform.id : null);
  return (
    <p className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      {status !== 'any' && <span className="text-[15.5px] font-bold text-hero-ink">{platform.name}</span>}
      <StatusPill status={status} onHero />
      <LivePill live={live} />
      <span className="text-hero-ink-2">{t(`status.say.${status}`, { name: platform.name })}</span>
    </p>
  );
}

export function UrlGate() {
  const { t } = useI18n();
  const input = useAnalysis((s) => s.input);
  const setInput = useAnalysis((s) => s.setInput);
  const analyze = useAnalysis((s) => s.analyze);
  const reset = useAnalysis((s) => s.reset);
  const status = useAnalysis((s) => s.status);
  const { links, multiple, detection } = useDetection();
  const [notice, setNotice] = useState(null);
  const [wholePlaylist, setWholePlaylist] = useState(false);
  const ref = useRef(null);
  const settled = useSettled(input, 600);

  const showReason = detection && !detection.ok && detection.reason !== 'empty' && settled === input;
  const playlistParam = detection?.ok && hasPlaylistParam(detection.url);
  const site = detection?.ok ? detection.platform : null;

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

  const main = input ? (
    <Button type="submit" variant="primary" size="lg" disabled={status === 'probing'}>
      {multiple ? t('gate.findAll') : t('gate.submit')}
    </Button>
  ) : (
    <Button variant="primary" size="lg" icon={ClipboardPaste} onClick={paste}>
      {t('gate.paste')}
    </Button>
  );

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="dock flex items-start gap-2.5 rounded-[22px] p-1.5 text-ink sm:p-2">
        <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-field text-ink-2 sm:size-14">
          {site ? <SiteIcon key={site.id} id={site.id} name={site.name} size={56} pop className="max-sm:size-12!" /> : <Link2 aria-hidden="true" className="size-6" />}
        </span>
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
          enterKeyHint="go"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-describedby="gate-status"
          className="block min-h-12 min-w-0 flex-1 resize-none bg-transparent py-3 text-base leading-6 placeholder:text-ink-3 focus:outline-none sm:min-h-14 sm:py-4 sm:text-[17px]"
        />
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
            className="mt-1 grid size-10 shrink-0 place-items-center rounded-xl text-ink-2 hover:bg-field hover:text-ink sm:mt-2"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        )}
        <div className="hidden shrink-0 sm:block">{main}</div>
      </div>
      {/* Phone: the main action is a full-width button under the thumb. */}
      <div className="mt-3 sm:hidden [&>button]:w-full">{input ? main : <Button variant="primary" size="lg" icon={ClipboardPaste} onClick={paste}>{t('gate.pasteLink')}</Button>}</div>

      <div id="gate-status" aria-live="polite" className="mt-4 min-h-8 text-[14.5px]">
        {multiple && <p className="font-bold text-hero-ink">{t('gate.links', { count: links.length })}</p>}
        {site && <Detected platform={site} />}
        {!input && <p className="text-hero-ink-2">{t('gate.hint')}</p>}
        {showReason && <p className="font-bold text-hero-ink">{t(`reasons.${detection.reason}`)}</p>}
        {notice && <p className={cx('text-hero-ink-2', site && 'mt-2')}>{notice}</p>}
        {playlistParam && (
          <label className="mt-2 flex items-center gap-2 text-hero-ink">
            <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={wholePlaylist} onChange={(e) => setWholePlaylist(e.target.checked)} />
            {t('gate.wholePlaylist')}
          </label>
        )}
      </div>
    </form>
  );
}
