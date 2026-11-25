import { useMemo, useState } from 'react';
import { useI18n, fmtGpa } from '../i18n.js';
import { parseDistribution } from '../lib/distribution.js';
import { graduationNeeded, toNum } from '../lib/grades.js';
import { Modal, NumInput } from './ui.jsx';

function DistStatus({ text }) {
  const { t } = useI18n();
  const r = useMemo(() => (text.trim() ? parseDistribution(text) : null), [text]);
  if (!r) return null;
  if (!r.ok) return <p className="status-line danger">{t('invalidJson', { msg: r.error })}</p>;
  return (
    <p className="status-line success" dir="auto">
      ✓ {r.dist.course && `${r.dist.course} · `}{r.dist.components.map((c) => c.name.en).join(' · ')} · {r.dist.total}
      {r.warning && <span className="warning-text"> — {t('warning', { msg: r.warning })}</span>}
    </p>
  );
}

export function TermNameModal({ title, initial = '', onSave, onClose }) {
  const { t } = useI18n();
  const [name, setName] = useState(initial);
  const submit = (e) => { e.preventDefault(); if (name.trim()) { onSave(name.trim()); onClose(); } };
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label className="field">
          <span>{t('termName')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('termNameHint')} dir="auto" />
        </label>
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>{t('save')}</button>
        </div>
      </form>
    </Modal>
  );
}

export function AddCourseModal({ onAdd, onClose }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [credits, setCredits] = useState('');
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);

  const onText = (v) => {
    setText(v);
    const r = parseDistribution(v);
    if (r.ok) {
      if (!name.trim() && r.dist.course) setName(r.dist.course);
      if (!credits && r.dist.credits != null) setCredits(String(r.dist.credits));
    }
  };
  const creditsOk = toNum(credits) !== null && toNum(credits) >= 0;
  const distOk = !text.trim() || parseDistribution(text).ok;
  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (!name.trim() || !creditsOk || !distOk) return;
    onAdd({ name, credits, distText: text });
    onClose();
  };
  return (
    <Modal title={t('addCourse')} onClose={onClose} wide>
      <form onSubmit={submit} className="form">
        <div className="form-row">
          <label className="field grow">
            <span>{t('courseName')}</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('courseNameHint')} dir="auto"
              aria-invalid={(tried && !name.trim()) || undefined} />
          </label>
          <label className="field narrow">
            <span>{t('creditsLabel')}</span>
            <NumInput value={credits} onChange={setCredits} max={30} aria-invalid={(tried && !creditsOk) || undefined} />
          </label>
        </div>
        <label className="field">
          <span>{t('syllabusOptional')}</span>
          <textarea className="code-area" rows={9} dir="ltr" spellCheck={false} value={text} onChange={(e) => onText(e.target.value)}
            placeholder='{ "components": [ ... ] }' />
        </label>
        <DistStatus text={text} />
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
          <button type="submit" className="btn btn-primary">{t('add')}</button>
        </div>
      </form>
    </Modal>
  );
}

export function SyllabusModal({ course, onApply, onClose }) {
  const { t } = useI18n();
  const [text, setText] = useState(course.distText || '');
  const r = text.trim() ? parseDistribution(text) : null;
  return (
    <Modal title={`${t('syllabus')} · ${course.name}`} onClose={onClose} wide
      footer={<>
        <button type="button" className="btn btn-secondary" onClick={onClose}>{t('cancel')}</button>
        <button type="button" className="btn btn-primary" disabled={!r?.ok} onClick={() => { onApply(text); onClose(); }}>
          {t('applyDistribution')}
        </button>
      </>}>
      <p className="muted">{t('syllabusHint')}</p>
      <textarea className="code-area" rows={14} dir="ltr" spellCheck={false} value={text} onChange={(e) => setText(e.target.value)}
        aria-label={t('syllabusTitle')} placeholder='{ "components": [ ... ] }' />
      <DistStatus text={text} />
    </Modal>
  );
}

export function GraduationModal({ grad, cumulative, onChange, onClose }) {
  const { t } = useI18n();
  const set = (k) => (v) => onChange({ ...grad, [k]: v });
  const gpa = grad.useCurrent ? cumulative.gpa ?? 0 : grad.gpa;
  const credits = grad.useCurrent ? cumulative.gpaCredits : grad.credits;
  const r = graduationNeeded({ target: grad.target, totalCredits: grad.totalCredits, currentGpa: gpa, currentCredits: credits });
  return (
    <Modal title={t('graduation')} onClose={onClose}>
      <div className="form">
        <div className="form-row">
          <label className="field">
            <span>{t('gradTarget')}</span>
            <NumInput value={grad.target} onChange={set('target')} max={4} />
          </label>
          <label className="field">
            <span>{t('gradTotal')}</span>
            <NumInput value={grad.totalCredits} onChange={set('totalCredits')} max={400} />
          </label>
        </div>
        <label className="check">
          <input type="checkbox" checked={grad.useCurrent} onChange={(e) => onChange({ ...grad, useCurrent: e.target.checked })} />
          {t('gradUseCurrent')}
        </label>
        <div className="form-row">
          <label className="field">
            <span>{t('gradCurrentGpa')}</span>
            {grad.useCurrent
              ? <input value={fmtGpa(cumulative.gpa)} readOnly dir="ltr" className="num" />
              : <NumInput value={grad.gpa} onChange={set('gpa')} max={4} />}
          </label>
          <label className="field">
            <span>{t('gradCurrentCredits')}</span>
            {grad.useCurrent
              ? <input value={cumulative.gpaCredits} readOnly dir="ltr" className="num" />
              : <NumInput value={grad.credits} onChange={set('credits')} max={400} />}
          </label>
        </div>
        <div className={`card result ${r?.status || ''}`}>
          {!r && <p className="muted">{t('gradFill')}</p>}
          {r?.status === 'ok' && <p>{t('gradNeeded', { g: fmtGpa(r.needed), r: r.remaining })}</p>}
          {r?.status === 'secured' && <p>{t('gradSecured')}</p>}
          {r?.status === 'unreachable' && <p>{t('gradUnreachable', { max: fmtGpa(r.maxCgpa) })}</p>}
          {r?.status === 'done' && <p>{t('gradDone')}</p>}
        </div>
      </div>
    </Modal>
  );
}
