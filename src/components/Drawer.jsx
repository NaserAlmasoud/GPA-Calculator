import { useI18n, fmtGpa } from '../i18n.js';
import { termSummary } from '../lib/grades.js';
import { Icon } from './ui.jsx';

export default function Drawer({ terms, activeId, cumulative, onHome, onSelect, onAddTerm, settings, onToggleLang, onCycleTheme, onOpenGrad }) {
  const { t } = useI18n();
  const themeLabel = { system: t('themeSystem'), light: t('themeLight'), dark: t('themeDark') }[settings.theme];
  return (
    <div className="drawer-inner">
      <button type="button" className="term-chip home-chip" aria-current={!activeId ? 'page' : undefined} onClick={onHome}>
        <span className="term-chip-name"><Icon name="home" />{t('home')}</span>
        <span className="term-chip-gpa" dir="ltr">{fmtGpa(cumulative.gpa)}</span>
      </button>
      <p className="eyebrow">{t('terms')}</p>
      <nav className="term-list" aria-label={t('terms')}>
        {terms.map((term) => {
          const s = termSummary(term);
          return (
            <button key={term.id} type="button" className="term-chip" aria-current={term.id === activeId ? 'page' : undefined}
              onClick={() => onSelect(term.id)}>
              <span className="term-chip-name">{term.name}</span>
              <span className="term-chip-gpa" dir="ltr">{fmtGpa(s.gpa)}</span>
            </button>
          );
        })}
      </nav>
      <button type="button" className="round-add round-add-sm" aria-label={t('addTerm')} title={t('addTerm')} onClick={onAddTerm}>
        <Icon name="plus" />
      </button>

      <div className="cum">
        <span className="cum-label">{t('cumulative')}</span>
        <span className="cum-value" dir="ltr">{fmtGpa(cumulative.gpa)}</span>
        <span className="faint cum-credits">{t('credits', { n: cumulative.gpaCredits })}</span>
      </div>

      <div className="drawer-tools">
        <button type="button" className="btn btn-ghost tool" onClick={onOpenGrad}><Icon name="cap" />{t('graduation')}</button>
        <button type="button" className="btn btn-ghost tool" onClick={onToggleLang}>
          <Icon name="globe" /><span lang={settings.lang === 'ar' ? 'en' : 'ar'}>{t('language')}</span>
        </button>
        <button type="button" className="btn btn-ghost tool" onClick={onCycleTheme}><Icon name="sun" />{t('theme')}: {themeLabel}</button>
      </div>
    </div>
  );
}
