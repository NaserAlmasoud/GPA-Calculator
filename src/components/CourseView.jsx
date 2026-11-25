import { useState } from 'react';
import { useI18n, fmt } from '../i18n.js';
import { courseResult, courseLetter, neededFor, itemsFor, defaultCutoffs, toNum, SCALE, MANUAL_LETTERS } from '../lib/grades.js';
import { uid } from '../store.js';
import { Icon, IconButton, NumInput, Segmented } from './ui.jsx';

export default function CourseView({ term, course, unit, onUnit, updateCourse, onSyllabus, onDelete, onBack }) {
  const { t, lang } = useI18n();
  const result = courseResult(course);
  const letter = courseLetter(course, result);

  return (
    <section className="view">
      <button type="button" className="btn btn-ghost back" onClick={onBack}>
        <Icon name="back" />{t('back', { name: term.name })}
      </button>
      <header className="view-head">
        <div className="title-row">
          <h1 dir="auto">{course.name}</h1>
          <span className="tag tag-pill">{t('credits', { n: course.credits || 0 })}</span>
          <span className="spacer" />
          <button type="button" className="btn btn-secondary" onClick={onSyllabus}><Icon name="book" />{t('syllabus')}</button>
          <IconButton icon="trash" label={t('deleteCourse')} onClick={onDelete} />
        </div>
      </header>

      {!course.dist ? (
        <div className="card empty">
          <h3>{t('noDistribution')}</h3>
          <p>{t('noDistributionHint')}</p>
          <LetterBox course={course} letter={letter} updateCourse={updateCourse} />
        </div>
      ) : (
        <>
          <Summary result={result} unit={unit} onUnit={onUnit} />
          <div className="card summary-2">
            <LetterBox course={course} letter={letter} updateCourse={updateCourse} />
            <NeedBox course={course} result={result} updateCourse={updateCourse} />
          </div>
          <div className="components">
            {course.dist.components.map((comp, i) => (
              <ComponentRow key={comp.id} comp={comp} part={result.parts[i]} course={course} updateCourse={updateCourse} lang={lang} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function Summary({ result, unit, onUnit }) {
  const { t } = useI18n();
  const show = (pts) => (unit === 'percent' ? `${fmt((pts / result.total) * 100, 1)}%` : fmt(pts));
  const of = unit === 'percent' ? '100%' : fmt(result.total);
  return (
    <div className="card summary">
      <div className="stat">
        <span className="label-sm">{t('earned')}</span>
        <span className="stat-num" dir="ltr">{show(result.earned)}</span>
        <span className="faint">{t('ofTotal', { n: of })}</span>
      </div>
      <div className="stat">
        <span className="label-sm">{t('maxPossible')}</span>
        <span className="stat-num" dir="ltr">{show(result.maxPossible)}</span>
        <span className="faint">{t('ofTotal', { n: of })}</span>
      </div>
      <Segmented label={t('points')} value={unit} onChange={onUnit}
        options={[{ value: 'points', label: t('points') }, { value: 'percent', label: '%' }]} />
    </div>
  );
}

function LetterBox({ course, letter, updateCourse }) {
  const { t } = useI18n();
  const [showCut, setShowCut] = useState(false);
  const cut = course.cutoffs || defaultCutoffs();
  const mode = course.dist ? course.letterMode : 'manual';
  return (
    <div className="letter-box">
      <div className="row-between">
        <span className="label-sm">{t('letter')}</span>
        {course.dist && (
          <Segmented label={t('letter')} value={mode} onChange={(v) => updateCourse((c) => { c.letterMode = v; })}
            options={[{ value: 'cutoffs', label: t('fromCutoffs') }, { value: 'manual', label: t('pickLetter') }]} />
        )}
      </div>
      {mode === 'manual' ? (
        <select className="letter-select" value={course.manualLetter || ''} aria-label={t('letter')}
          onChange={(e) => updateCourse((c) => { c.manualLetter = e.target.value; if (!c.dist) c.letterMode = 'manual'; })}>
          <option value="">{t('chooseLetter')}</option>
          {MANUAL_LETTERS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      ) : (
        <>
          <div className="letter-line">
            <span className="letter-big" dir="ltr">{letter ? letter.letter : '—'}</span>
            {letter?.projected && <span className="faint">{t('projected')}</span>}
            <span className="spacer" />
            <button type="button" className="btn btn-ghost small" onClick={() => setShowCut(!showCut)}>
              {showCut ? t('hideCutoffs') : t('editCutoffs')}
            </button>
          </div>
          {showCut && (
            <div className="cutoffs">
              {SCALE.filter((s) => s.letter !== 'F').map((s) => (
                <label key={s.letter} className="cutoff">
                  <span dir="ltr">{s.letter} ≥</span>
                  <NumInput value={cut[s.letter] ?? ''} max={100}
                    onChange={(v) => updateCourse((c) => { c.cutoffs = { ...(c.cutoffs || defaultCutoffs()), [s.letter]: v }; })} />
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NeedBox({ course, result, updateCourse }) {
  const { t } = useI18n();
  const cut = course.cutoffs || defaultCutoffs();
  const target = course.target ?? '';
  const pct = toNum(target);
  const n = pct !== null ? neededFor(result, pct) : null;
  return (
    <div className="need-box">
      <span className="label-sm">{t('need')}</span>
      <div className="chips">
        {SCALE.filter((s) => s.letter !== 'F' && toNum(cut[s.letter]) !== null).slice(0, 6).map((s) => (
          <button key={s.letter} type="button" dir="ltr"
            className={`chip ${String(toNum(cut[s.letter])) === String(pct) ? 'on' : ''}`}
            onClick={() => updateCourse((c) => { c.target = String(toNum(cut[s.letter])); })}>{s.letter}</button>
        ))}
      </div>
      <label className="field-inline">
        <span>{t('targetPct')}</span>
        <NumInput value={target} max={100} onChange={(v) => updateCourse((c) => { c.target = v; })} />
      </label>
      {n && (
        <p className={`need-result ${n.status}`}>
          {n.status === 'secured' && t('needSecured')}
          {n.status === 'ok' && t('needOk', { need: iso(fmt(n.need)), of: iso(fmt(n.of)), pct: iso(`${fmt(n.pct, 1)}%`) })}
          {n.status === 'unreachable' && t('needUnreachable', { need: iso(fmt(n.need)), of: iso(fmt(n.of)) })}
        </p>
      )}
    </div>
  );
}

function ComponentRow({ comp, part, course, updateCourse, lang }) {
  const { t } = useI18n();
  const name = comp.name[lang] || comp.name.en;

  if (!comp.items) {
    return (
      <div className="comp card">
        <label className="comp-head" htmlFor={`s-${comp.id}`}>
          <span className="comp-name">{name}</span>
          <span className="score" dir="ltr">
            <NumInput id={`s-${comp.id}`} value={course.scores?.[comp.id] ?? ''} max={comp.max}
              onChange={(v) => updateCourse((c) => { c.scores = { ...c.scores, [comp.id]: v }; })} />
            <span className="faint">/ {fmt(comp.max)}</span>
          </span>
        </label>
        {comp.adjust && <AdjustBox comp={comp} part={part} course={course} updateCourse={updateCourse} lang={lang} />}
      </div>
    );
  }

  const items = itemsFor(comp, course);
  const setItems = (fn) => updateCourse((c) => {
    const list = structuredClone(itemsFor(comp, c));
    fn(list);
    c.items = { ...c.items, [comp.id]: list };
  });
  const lastMax = items.length ? items[items.length - 1].max : String(comp.items.defaultMax);
  const filtered = comp.items.drop || comp.items.best;

  return (
    <div className="comp card">
      <div className="comp-head">
        <span className="comp-name">{name}</span>
        <span className="comp-value" dir="ltr">
          <b>{part.graded ? fmt(part.value) : '—'}</b> <span className="faint">/ {fmt(comp.max)}</span>
        </span>
      </div>
      <div className="items">
        {items.map((it, idx) => (
          <div className="item" dir="ltr" key={it.id || idx}>
            <NumInput aria-label={`${name} ${idx + 1}`} value={it.score} max={toNum(it.max) ?? undefined}
              onChange={(v) => setItems((l) => { l[idx].score = v; })} />
            <span className="faint">/</span>
            <NumInput className="item-max" aria-label={`${name} ${idx + 1} max`} value={it.max} min={0}
              onChange={(v) => setItems((l) => { l[idx].max = v; })} />
            {comp.items.addable && (
              <button type="button" className="item-x" aria-label={t('removeItem')} title={t('removeItem')}
                onClick={() => setItems((l) => { l.splice(idx, 1); })}><Icon name="close" /></button>
            )}
          </div>
        ))}
        {comp.items.addable && (
          <button type="button" className="round-add round-add-sm" aria-label={t('addItem')} title={t('addItem')}
            onClick={() => setItems((l) => { l.push({ id: uid(), score: '', max: lastMax }); })}><Icon name="plus" /></button>
        )}
      </div>
      <div className="comp-foot">
        {comp.items.addable && (
          <label className="check">
            <input type="checkbox" checked={!!course.complete?.[comp.id]}
              onChange={(e) => updateCourse((c) => { c.complete = { ...c.complete, [comp.id]: e.target.checked }; })} />
            {t('allEntered')}
          </label>
        )}
        {filtered && part.itemInfo && <span className="faint">{t('itemsUsed', { used: part.itemInfo.used, entered: part.itemInfo.entered })}</span>}
      </div>
      {comp.adjust && <AdjustBox comp={comp} part={part} course={course} updateCourse={updateCourse} lang={lang} />}
    </div>
  );
}

// Keeps numbers left-to-right inside Arabic sentences.
const iso = (s) => `\u2066${s}\u2069`;

function AdjustBox({ comp, part, course, updateCourse, lang }) {
  const { t } = useI18n();
  const vals = course.adjust?.[comp.id] || {};
  const info = part.adjust;
  const ofVal = toNum(vals[comp.adjust.of]);
  let msg = t('adjustMissing');
  if (info?.status === 'ok') {
    msg = info.inRange && Math.abs(info.delta) < 1e-9 ? t('adjustInRange') : t('adjustInfo', {
      lo: iso(fmt(info.lo)), hi: iso(fmt(info.hi)), y: iso(`y = ${fmt(info.y)}`), delta: iso(`${info.delta >= 0 ? '+' : ''}${fmt(info.delta)}`),
    });
  } else if (info?.status === 'error') msg = t('adjustError');
  else if (!part.graded && comp.adjust.inputs.every(({ key }) => toNum(vals[key]) !== null)) msg = '';
  return (
    <div className="adjust">
      <span className="label-sm">{t('adjustment')}</span>
      <div className="adjust-fields">
        {comp.adjust.inputs.map(({ key, label }) => (
          <label key={key} className="field">
            <span>{label[lang] || label.en}</span>
            <NumInput value={vals[key] ?? ''}
              max={key === comp.adjust.of ? comp.max : 100}
              onChange={(v) => updateCourse((c) => { c.adjust = { ...c.adjust, [comp.id]: { ...(c.adjust?.[comp.id] || {}), [key]: v } }; })} />
          </label>
        ))}
      </div>
      {msg && <p className="faint adjust-msg" dir="auto">{msg}</p>}
      {info?.status === 'ok' && ofVal !== null && (
        <p className="adjust-result" dir="ltr"><span className="faint">{fmt(part.raw)} →</span> <b>{fmt(part.value)}</b> <span className="faint">/ {fmt(comp.max)}</span></p>
      )}
    </div>
  );
}
