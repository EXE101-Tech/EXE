import { useTranslation } from 'react-i18next';

// Halloween / default switch ("🎃 Halloween | Mặc định"); styles live in landing-story.css.
export function HalloweenModeSwitch({ halloween, onChoose, className = '' }) {
  const { t } = useTranslation();
  return <div className={`sg-story sg-story-mode ${className}`} role="group" aria-label={t('landing.story.mode.label')}>
    <button type="button" aria-pressed={halloween} className={halloween ? 'is-active' : ''} onClick={() => onChoose(true)}><span aria-hidden="true">🎃</span>{t('landing.story.mode.halloween')}</button>
    <button type="button" aria-pressed={!halloween} className={!halloween ? 'is-active' : ''} onClick={() => onChoose(false)}>{t('landing.story.mode.default')}</button>
  </div>;
}
