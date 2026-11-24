import { useState } from 'react';
import { Link } from 'react-router';
import { AUDIO_BITRATES, AUDIO_FORMATS, VIDEO_CONTAINERS, qualityLabel } from '@ferry/shared/formats';
import { BRAND } from '@ferry/shared/brand';
import { TEMPLATE_TOKENS, buildDownloadName, validateTemplate } from '@ferry/shared/filename';
import { useI18n } from '../lib/i18n/index.jsx';
import { bytes } from '../lib/format.js';
import { storage } from '../lib/storage.js';
import { usePlatforms } from '../lib/registry.js';
import { useSettings } from '../state/settings.js';
import { LogoMark } from '../components/Logo.jsx';
import { Button, Segmented, Select, Sheet, Switch, TextField } from '../components/ui.jsx';

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 rounded-[var(--radius-card)] bg-paper p-5 shadow-card sm:p-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <h2 id={id} className="heading text-lg">
        {title}
      </h2>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { t, locale } = useI18n();
  const s = useSettings();
  const config = usePlatforms((x) => x.config);
  const [confirm, setConfirm] = useState(false);
  const tpl = validateTemplate(s.filenameTemplate || '');
  const sample = buildDownloadName({
    template: tpl.ok ? s.filenameTemplate : '{title}',
    vars: { title: 'Night of the Living Dead', uploader: 'George A. Romero', platform: 'Internet Archive', id: 'night_of_the_living_dead', quality: '480p', date: '1968-10-01' },
    ext: 'mp4',
  });

  return (
    <div className="mx-auto max-w-[960px] px-4 pt-6 sm:px-8 sm:pt-9">
      <h1 className="display mb-6 text-[2.15rem] sm:text-[2.75rem]">{t('settings.title')}</h1>

      <div className="flex flex-col gap-4">
        <Section id="s-appearance" title={t('settings.sections.appearance')}>
          <Segmented
            legend={t('settings.theme.label')}
            name="theme"
            value={s.theme}
            onChange={(v) => s.update({ theme: v })}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') },
            ]}
          />
        </Section>

        <Section id="s-defaults" title={t('settings.sections.defaults')}>
          <Segmented
            legend={t('picker.mode.label')}
            name="default-mode"
            value={s.defaults.mode}
            onChange={(v) => s.setDefaults({ mode: v })}
            options={[
              { value: 'av', label: t('picker.mode.av') },
              { value: 'video', label: t('picker.mode.video') },
              { value: 'audio', label: t('picker.mode.audio') },
            ]}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label={t('picker.container.label')} value={s.defaults.videoContainer} onChange={(v) => s.setDefaults({ videoContainer: v })} options={Object.values(VIDEO_CONTAINERS).map((c) => ({ value: c.id, label: `${c.label} (${t(`picker.container.${c.id}`)})` }))} />
            <Select
              label={t('picker.quality.label')}
              value={s.defaults.quality}
              onChange={(v) => s.setDefaults({ quality: v === 'best' ? 'best' : Number(v) })}
              options={[{ value: 'best', label: t('picker.quality.original') }, ...[2160, 1440, 1080, 720, 480, 360].map((r) => ({ value: r, label: qualityLabel(r).full }))]}
            />
            <Select label={t('picker.audio.label')} value={s.defaults.audioFormat} onChange={(v) => s.setDefaults({ audioFormat: v })} options={Object.values(AUDIO_FORMATS).map((a) => ({ value: a.id, label: `${a.label} (${t(`picker.audio.formats.${a.id}`)})` }))} />
            <Select
              label={t('picker.audio.bitrate')}
              value={s.defaults.audioBitrate}
              onChange={(v) => s.setDefaults({ audioBitrate: v === 'source' ? 'source' : Number(v) })}
              options={[{ value: 'source', label: t('picker.audio.source') }, ...AUDIO_BITRATES.map((n) => ({ value: n, label: t('picker.audio.kbps', { n }) }))]}
            />
          </div>
          <Switch checked={s.defaults.metadata} onChange={(v) => s.setDefaults({ metadata: v })} label={t('picker.metadata')} />
        </Section>

        <Section id="s-files" title={t('settings.sections.files')}>
          <TextField
            label={t('picker.filename.label')}
            value={s.filenameTemplate}
            maxLength={120}
            onChange={(e) => s.update({ filenameTemplate: e.target.value })}
            hint={`${t('picker.filename.preview', { name: sample })}  ${t('picker.filename.tokens', { tokens: TEMPLATE_TOKENS.map((x) => `{${x}}`).join(' ') })}`}
            error={tpl.ok ? null : t('picker.filename.tokens', { tokens: TEMPLATE_TOKENS.map((x) => `{${x}}`).join(' ') })}
          />
          <div>
            <Button size="sm" variant="line" onClick={() => s.update({ filenameTemplate: '{title}' })}>
              {t('picker.filename.reset')}
            </Button>
          </div>
        </Section>

        <Section id="s-downloads" title={t('settings.sections.downloads')}>
          <Select label={t('settings.concurrency.label')} value={s.concurrency} onChange={(v) => s.update({ concurrency: Number(v) })} options={[1, 2, 3].map((n) => ({ value: n, label: String(n) }))} className="max-w-xs" />
          <p className="-mt-2 text-sm text-ink-2">{t('settings.concurrency.help')}</p>
          <Switch checked={s.autoSave} onChange={(v) => s.update({ autoSave: v })} label={t('settings.autoSave.label')} help={t('settings.autoSave.help')} />
        </Section>

        <Section id="s-privacy" title={t('settings.sections.privacy')}>
          <div className="divide-y divide-line">
            <Switch checked={s.privacy.saveHistory} onChange={(v) => s.setPrivacy({ saveHistory: v })} label={t('settings.saveHistory.label')} help={t('settings.saveHistory.help')} />
            <Switch checked={s.privacy.saveSourceLinks} disabled={!s.privacy.saveHistory} onChange={(v) => s.setPrivacy({ saveSourceLinks: v })} label={t('settings.saveLinks.label')} help={t('settings.saveLinks.help')} />
            <Switch checked={s.privacy.deleteAfterSave} onChange={(v) => s.setPrivacy({ deleteAfterSave: v })} label={t('settings.deleteAfter.label')} help={t('settings.deleteAfter.help')} />
          </div>
        </Section>

        <Section id="s-storage" title={t('settings.sections.storage')}>
          {config?.limits && <p>{t('settings.retention', { minutes: config.limits.jobTtlMinutes })}</p>}
          <p className="text-ink-2">{t('settings.localData', { size: bytes(storage.usage(), { locale }) ?? '0 B' })}</p>
          <div>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              {t('settings.clearLocal')}
            </Button>
          </div>
        </Section>

        <Section id="s-about" title={t('settings.sections.about')}>
          <p className="flex items-center gap-3">
            <LogoMark className="size-9" />
            <span>
              <span className="font-bold">{BRAND.name}</span> <span className="text-ink-2">{t('settings.version', { version: BRAND.version })}</span>
            </span>
          </p>
          <p className="text-sm text-ink-2">{t('settings.licenses')}</p>
          <p className="text-sm text-ink-2">{t('settings.logos')}</p>
          <Link to="/sites" className="font-semibold text-ink underline decoration-[1.5px] underline-offset-[3px]">
            {t('settings.policyLink')}
          </Link>
        </Section>
      </div>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t('settings.clearLocal')} closeLabel={t('actions.close')}>
        <p className="text-ink-2">{t('settings.clearLocalConfirm')}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="line" onClick={() => setConfirm(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              storage.clearAll();
              window.location.assign('/');
            }}
          >
            {t('actions.confirm')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
