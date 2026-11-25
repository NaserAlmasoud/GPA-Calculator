import { useI18n, fmtGpa } from '../i18n.js';
import { courseLetter, termSummary, MANUAL_LETTERS } from '../lib/grades.js';
import { Icon, IconButton } from './ui.jsx';

export default function TermView({ term, onBack, onOpenCourse, onSetLetter, onAddCourse, onRename, onDelete }) {
  const { t } = useI18n();
  const s = termSummary(term);
  return (
    <section className="view">
      <button type="button" className="btn btn-ghost back" onClick={onBack}>
        <Icon name="back" />{t('home')}
      </button>
      <header className="view-head">
        <div className="title-row">
          <h1 dir="auto">{term.name}</h1>
          <IconButton icon="edit" label={t('renameTerm')} onClick={onRename} />
          <IconButton icon="trash" label={t('deleteTerm')} onClick={onDelete} />
        </div>
        <div className="term-stats">
          <span className="stat-big">{t('gpa')}: <b dir="ltr">{fmtGpa(s.gpa)}</b></span>
          <span className="muted">{t('credits', { n: s.credits })}</span>
        </div>
      </header>

      {term.courses.length === 0 && <p className="muted">{t('noCourses')}</p>}
      <div className="course-list">
        {term.courses.map((c) => {
          const manual = c.letterMode === 'manual';
          const auto = !manual || !c.manualLetter ? courseLetter({ ...c, letterMode: 'cutoffs' }) : null;
          const autoLabel = c.dist
            ? `${t('autoLetter')}${auto ? `: ${auto.projected ? '~' : ''}${auto.letter}` : ''}`
            : '—';
          return (
            <div key={c.id} className="course-bar">
              <button type="button" className="course-bar-open" onClick={() => onOpenCourse(c.id)}>
                <span className="course-bar-name" dir="auto">{c.name}</span>
              </button>
              <select className={`course-letter ${manual && c.manualLetter ? 'set' : ''}`} dir="ltr"
                aria-label={t('courseGrade', { name: c.name })}
                value={manual ? c.manualLetter || '' : ''}
                onChange={(e) => onSetLetter(c.id, e.target.value)}>
                <option value="">{autoLabel}</option>
                {MANUAL_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
              <span className="course-bar-credits">{c.credits}</span>
            </div>
          );
        })}
      </div>
      <button type="button" className="round-add" aria-label={t('addCourse')} title={t('addCourse')} onClick={onAddCourse}>
        <Icon name="plus" />
      </button>
    </section>
  );
}
