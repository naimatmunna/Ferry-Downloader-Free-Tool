import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { extractUrls } from '@ferry/shared/url';
import { useI18n } from '../lib/i18n/index.jsx';
import { useAnalysis } from '../state/analysis.js';

/** PWA share target (Android): /share?title=&text=&url= */
export function SharePage() {
  const { t } = useI18n();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setInput = useAnalysis((s) => s.setInput);
  const analyze = useAnalysis((s) => s.analyze);
  const text = [params.get('url'), params.get('text'), params.get('title')].filter(Boolean).join(' ');
  const links = extractUrls(text, { max: 20 });

  useEffect(() => {
    if (!links.length) return;
    const joined = links.join('\n');
    setInput(joined);
    analyze(joined);
    navigate('/', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <p role="status" className="text-lg font-semibold">
        {links.length ? t('share.reading') : t('share.none')}
      </p>
      {!links.length && (
        <Link to="/" className="mt-4 inline-block font-semibold text-hull underline underline-offset-4 dark:text-signal">
          {t('notFound.home')}
        </Link>
      )}
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight">{t('notFound.title')}</h1>
      <p className="mt-2 text-ink-2">{t('notFound.body')}</p>
      <Link to="/" className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-signal px-4 font-semibold text-signal-ink hover:bg-signal-hover">
        {t('notFound.home')}
      </Link>
    </div>
  );
}
