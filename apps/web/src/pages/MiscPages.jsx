import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { extractUrls } from '@ferry/shared/url';
import { useI18n } from '../lib/i18n/index.jsx';
import { useAnalysis } from '../state/analysis.js';

const HOME_LINK = 'mt-6 inline-flex h-12 items-center rounded-[var(--radius-control)] bg-primary px-5 font-bold text-primary-ink hover:bg-primary-hover';

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
    <div className="mx-auto max-w-[960px] px-4 pt-10 sm:px-8">
      <p role="status" className="flex items-center gap-2.5 text-lg font-bold">
        {links.length > 0 && <Loader2 className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
        {links.length ? t('share.reading') : t('share.none')}
      </p>
      {!links.length && (
        <Link to="/" className={HOME_LINK}>
          {t('notFound.home')}
        </Link>
      )}
    </div>
  );
}

export function NotFoundPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-[960px] px-4 pt-10 sm:px-8">
      <h1 className="display text-[2.15rem] sm:text-[2.75rem]">{t('notFound.title')}</h1>
      <p className="mt-3 text-ink-2">{t('notFound.body')}</p>
      <Link to="/" className={HOME_LINK}>
        {t('notFound.home')}
      </Link>
    </div>
  );
}
