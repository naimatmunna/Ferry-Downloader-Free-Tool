/** The bottom of every page: where to go next, a way to support Ferry, and who made it. */
import { Link } from 'react-router';
import { useI18n } from '../lib/i18n/index.jsx';
import { AUTHOR, REPO_URL } from '../lib/project.js';
import { GitHubMark } from './icons.jsx';
import { LogoMark } from './Logo.jsx';
import { LinkButton } from './ui.jsx';

const LINKS = [
  { to: '/', key: 'nav.download' },
  { to: '/sites', key: 'nav.sites' },
  { to: '/#faq', key: 'footer.faq' },
  { to: '/settings', key: 'nav.settings' },
];

export function SiteFooter() {
  const { t } = useI18n();
  return (
    // .site-foot keeps the last lines clear of the phone's fixed bars (index.css).
    <footer className="site-foot border-t border-line bg-paper">
      <div className="mx-auto grid max-w-[1280px] gap-7 px-4 pt-9 pb-7 sm:px-8 md:grid-cols-[1.25fr_0.8fr_1.15fr] md:gap-9">
        <div>
          <p className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="text-[1.3rem] font-[820] tracking-[-0.015em] [font-stretch:125%]">Ferry</span>
          </p>
          <p className="mt-3 font-bold">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.label')}>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
            {LINKS.map(({ to, key }) => (
              <li key={key}>
                <Link to={to} className="font-semibold text-ink underline-offset-[3px] hover:underline">
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="rounded-[20px] bg-canvas p-[18px]">
          <p className="mb-3.5 text-[14.5px] text-ink-2">
            <b className="font-bold text-ink">{t('footer.likeIt')}</b> {t('footer.starHelps')}
          </p>
          <LinkButton href={REPO_URL} target="_blank" rel="noopener noreferrer" variant="primary" icon={GitHubMark}>
            {t('github.star')}
          </LinkButton>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-1.5 px-4 py-4 text-[13.5px] text-ink-2 sm:flex-row sm:items-baseline sm:justify-between sm:px-8">
          <p className="text-[14.5px] text-ink">
            {t('footer.by')}{' '}
            <a href={AUTHOR.url} target="_blank" rel="noopener noreferrer" className="font-bold underline decoration-[1.5px] underline-offset-[3px]">
              {AUTHOR.name}
            </a>
          </p>
          <p>© {new Date().getFullYear()} Ferry</p>
        </div>
      </div>
    </footer>
  );
}
