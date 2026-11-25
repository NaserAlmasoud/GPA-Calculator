import { useI18n, fmtGpa } from '../i18n.js';
import { termSummary } from '../lib/grades.js';
import { Icon } from './ui.jsx';

export default function HomeView({ terms, cumulative, onOpenTerm, onAddTerm, onOpenGrad }) {
  const { t } = useI18n();
  return (
    <section className="view">
      <header className="view-head">
        <p className="eyebrow">{t('cumulative')}</p>
        <div className="home-cgpa">
          <span className="home-cgpa-value" dir="ltr">{fmtGpa(cumulative.gpa)}</span>
          <span className="muted">{t('credits', { n: cumulative.gpaCredits })}</span>
          <span className="spacer" />
          <button type="button" className="btn btn-secondary" onClick={onOpenGrad}><Icon name="cap" />{t('graduation')}</button>
        </div>
      </header>

      <h2 className="home-terms-title">{t('allTerms')}</h2>
      {terms.length === 0 && (
        <div className="card empty">
          <h3>{t('noTerms')}</h3>
          <p>{t('noTermsHint')}</p>
        </div>
      )}
      <div className="term-grid">
        {terms.map((term) => {
          const s = termSummary(term);
          return (
            <button key={term.id} type="button" className="term-card" onClick={() => onOpenTerm(term.id)}>
              <span className="term-card-name" dir="auto">{term.name}</span>
              <span className="term-card-gpa" dir="ltr">{fmtGpa(s.gpa)}</span>
              <span className="faint term-card-meta">{t('credits', { n: s.credits })} · {t('coursesCount', { n: term.courses.length })}</span>
            </button>
          );
        })}
      </div>
      <button type="button" className="round-add" aria-label={t('addTerm')} title={t('addTerm')} onClick={onAddTerm}>
        <Icon name="plus" />
      </button>
    </section>
  );
}
