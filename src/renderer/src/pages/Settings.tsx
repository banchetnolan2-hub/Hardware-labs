import type { DisplayMode, Language, ReducedMotionPreference } from '@shared/settings'
import { Backdrop } from '../components/Backdrop'
import { SettingRow, Segmented, Toggle } from '../components/controls'
import { PageHeader } from '../components/PageHeader'
import { useT } from '../i18n'
import { useAppStore } from '../store/app-store'
import './pages.css'

export function Settings() {
  const t = useT()
  const settings = useAppStore((state) => state.settings)
  const appInfo = useAppStore((state) => state.appInfo)
  const saveStatus = useAppStore((state) => state.saveStatus)
  const update = useAppStore((state) => state.updateSettings)

  const status =
    saveStatus === 'saved' ? (
      <span className="save-status save-status--ok">{t.common.saved}</span>
    ) : saveStatus === 'error' ? (
      <span className="save-status save-status--error">{t.common.saveError}</span>
    ) : null

  return (
    <div className="page subpage">
      <Backdrop />
      <PageHeader title={t.settings.title} aside={status} />

      <div className="subpage__body">
        <section className="panel subpage__section">
          <h2 className="panel-title">{t.settings.display.title}</h2>
          <SettingRow label={t.settings.display.mode}>
            <Segmented<DisplayMode>
              label={t.settings.display.mode}
              value={settings.display.mode}
              options={[
                { value: 'windowed', label: t.settings.display.windowed },
                { value: 'fullscreen', label: t.settings.display.fullscreen }
              ]}
              onChange={(mode) => update((s) => ({ ...s, display: { ...s.display, mode } }))}
            />
          </SettingRow>
          <SettingRow label={t.settings.display.remember} hint={t.settings.display.rememberHint}>
            <Toggle
              label={t.settings.display.remember}
              checked={settings.display.rememberWindowBounds}
              onLabel={t.settings.on}
              offLabel={t.settings.off}
              onChange={(rememberWindowBounds) =>
                update((s) => ({ ...s, display: { ...s.display, rememberWindowBounds } }))
              }
            />
          </SettingRow>
        </section>

        <section className="panel subpage__section">
          <h2 className="panel-title">{t.settings.motion.title}</h2>
          <SettingRow label={t.settings.motion.intro} hint={t.settings.motion.introHint}>
            <Toggle
              label={t.settings.motion.intro}
              checked={settings.intro.enabled}
              onLabel={t.settings.on}
              offLabel={t.settings.off}
              onChange={(enabled) => update((s) => ({ ...s, intro: { enabled } }))}
            />
          </SettingRow>
          <SettingRow label={t.settings.motion.reduced} hint={t.settings.motion.reducedHint}>
            <Segmented<ReducedMotionPreference>
              label={t.settings.motion.reduced}
              value={settings.accessibility.reducedMotion}
              options={[
                { value: 'system', label: t.settings.motion.system },
                { value: 'reduce', label: t.settings.motion.reduce },
                { value: 'full', label: t.settings.motion.full }
              ]}
              onChange={(reducedMotion) => update((s) => ({ ...s, accessibility: { reducedMotion } }))}
            />
          </SettingRow>
        </section>

        <section className="panel subpage__section">
          <h2 className="panel-title">{t.settings.language.title}</h2>
          <SettingRow label={t.settings.language.label}>
            <Segmented<Language>
              label={t.settings.language.label}
              value={settings.language}
              options={[
                { value: 'fr', label: 'Français' },
                { value: 'en', label: 'English' }
              ]}
              onChange={(language) => update((s) => ({ ...s, language }))}
            />
          </SettingRow>
        </section>

        <section className="panel subpage__section">
          <h2 className="panel-title">{t.settings.about.title}</h2>
          <SettingRow label={t.settings.about.version}>
            <span className="mono">v{appInfo?.version}</span>
          </SettingRow>
          <SettingRow label={t.settings.about.dataFolder} hint={appInfo?.dataPath}>
            <button type="button" className="btn" onClick={() => void window.hardwareLab.openDataFolder()}>
              {t.settings.about.openFolder}
            </button>
          </SettingRow>
        </section>
      </div>
    </div>
  )
}
