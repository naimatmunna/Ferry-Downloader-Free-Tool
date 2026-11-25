/**
 * Common questions on the Download page, answered with this server's own
 * numbers (sites, size and length limits, how long files stay). The footer
 * links here as /#faq from any page.
 */
import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Plus } from 'lucide-react';
import { useI18n } from '../../lib/i18n/index.jsx';
import { bytes, timeSpan } from '../../lib/format.js';
import { REPO_URL } from '../../lib/project.js';
import { usePlatforms } from '../../lib/registry.js';
import { cx } from '../../components/ui.jsx';
import { shortName, useDownloadable } from './WherePanel.jsx';

const LINK = 'font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]';

// "TikTok, YouTube and X": no comma before "and", like the rest of Ferry's copy.
const names = new Intl.ListFormat('en-GB', { type: 'conjunction' });

export function Faq({ className }) {
  const { t, locale } = useI18n();
  const ref = useRef(null);
  const { hash, key } = useLocation();
  const limits = usePlatforms((s) => s.config?.limits);
  const { total, featured } = useDownloadable();

  // Runs on every visit to /#faq, also when the link is clicked again.
  useEffect(() => {
    if (hash === '#faq') ref.current?.scrollIntoView({ block: 'start' });
  }, [hash, key]);

  const span = (seconds) => {
    const s = timeSpan(seconds);
    return s ? t(`faq.units.${s.unit}`, { count: s.count }) : null;
  };
  const size = bytes(limits?.maxFileSizeBytes, { locale });
  const length = span(limits?.maxDurationSec);

  const items = [
    ['free', t('faq.free.a')],
    [
      'sites',
      <>
        {total ? t('faq.sites.a', { count: total, names: names.format(featured.slice(0, 5).map(shortName)) }) : t('faq.sites.unknown')}{' '}
        <Link to="/sites" className={LINK}>
          {t('faq.sites.link')}
        </Link>
      </>,
    ],
    ['audio', t('faq.audio.a')],
    ['quality', t('faq.quality.a')],
    ['phone', t('faq.phone.a')],
    ['limits', size && length ? t('faq.limits.a', { size, length }) : t('faq.limits.unknown')],
    ['files', t('faq.files.a', { time: span(limits?.jobTtlMinutes * 60) ?? t('faq.soon') })],
    ['protected', t('faq.protected.a')],
    ['legal', t('faq.legal.a')],
    [
      'support',
      <>
        {t('faq.support.a')}{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
          {t('github.star')}
        </a>
      </>,
    ],
  ];

  return (
    <section ref={ref} id="faq" aria-labelledby="faq-title" className={cx('grid scroll-mt-6 gap-5 lg:grid-cols-[330px_minmax(0,1fr)] lg:gap-9', className)}>
      <div>
        <h2 id="faq-title" className="heading text-[28px] leading-[1.05] sm:text-4xl">
          {t('faq.title')}
        </h2>
        <p className="mt-2 max-w-[30ch] text-ink-2 sm:mt-3">{t('faq.sub')}</p>
      </div>
      <div className="divide-y divide-line rounded-[var(--radius-card)] bg-paper px-4 shadow-card sm:px-6">
        {items.map(([id, answer]) => (
          <details key={id} className="group">
            <summary className="flex min-h-[60px] items-center justify-between gap-4 py-3 font-bold sm:text-[17px]">
              {t(`faq.${id}.q`)}
              <span aria-hidden="true" className="grid size-[30px] shrink-0 place-items-center rounded-full bg-field transition-[transform,background-color,color] duration-200 group-open:rotate-45 group-open:bg-primary group-open:text-primary-ink">
                <Plus className="size-4" strokeWidth={2.6} />
              </span>
            </summary>
            <p className="-mt-1 mb-5 max-w-[64ch] text-ink-2">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
