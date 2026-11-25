// Grade math: course totals, adjustments, letters, GPA and the "what do I need" calculators.
import { evalFormula } from './expr.js';

// 4.0 scale (KFUPM). Edit here to change the scale.
export const SCALE = [
  { letter: 'A+', points: 4.0, defaultMin: 95 },
  { letter: 'A', points: 3.75, defaultMin: 90 },
  { letter: 'B+', points: 3.5, defaultMin: 85 },
  { letter: 'B', points: 3.0, defaultMin: 80 },
  { letter: 'C+', points: 2.5, defaultMin: 75 },
  { letter: 'C', points: 2.0, defaultMin: 70 },
  { letter: 'D+', points: 1.5, defaultMin: 65 },
  { letter: 'D', points: 1.0, defaultMin: 60 },
  { letter: 'F', points: 0, defaultMin: 0 },
];
export const LETTERS = SCALE.map((s) => s.letter);
export const MANUAL_LETTERS = [...LETTERS, 'DN'];
export const MAX_GPA = 4;

export function defaultCutoffs() {
  const c = {};
  for (const s of SCALE) if (s.letter !== 'F') c[s.letter] = s.defaultMin;
  return c;
}

export function gradePoints(letter) {
  if (letter === 'DN') return 0;
  const s = SCALE.find((x) => x.letter === letter);
  return s ? s.points : null;
}

export function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

const clamp = (x, lo, hi) => Math.min(Math.max(x, lo), hi);

// ---------- components ----------

export function itemsFor(comp, course) {
  const list = course.items?.[comp.id];
  if (list) return list;
  if (comp.items?.count) {
    return Array.from({ length: comp.items.count }, (_, i) => ({ id: `i${i + 1}`, score: '', max: String(comp.items.defaultMax) }));
  }
  return [];
}

function combineItems(comp, items) {
  let valid = items
    .map((it) => ({ s: toNum(it.score), m: toNum(it.max) }))
    .filter((x) => x.s !== null && x.m !== null && x.m > 0)
    .map((x) => ({ ...x, pct: x.s / x.m }));
  if (!valid.length) return null;
  const cfg = comp.items;
  valid.sort((a, b) => b.pct - a.pct);
  if (cfg.best && valid.length > cfg.best) valid = valid.slice(0, cfg.best);
  if (cfg.drop && valid.length > cfg.drop) valid = valid.slice(0, valid.length - cfg.drop);
  const ratio = cfg.combine === 'average'
    ? valid.reduce((a, x) => a + x.pct, 0) / valid.length
    : valid.reduce((a, x) => a + x.s, 0) / valid.reduce((a, x) => a + x.m, 0);
  return { raw: ratio * comp.max, used: valid.length, entered: items.filter((it) => toNum(it.score) !== null).length };
}

function applyAdjust(comp, raw, course) {
  const a = comp.adjust;
  const vals = course.adjust?.[comp.id] || {};
  const vars = {};
  for (const { key } of a.inputs) {
    const n = toNum(vals[key]);
    if (n === null) return { value: raw, info: { status: 'missing' } };
    vars[key] = n;
  }
  let y;
  try {
    y = evalFormula(a.target, vars);
  } catch {
    return { value: raw, info: { status: 'error' } };
  }
  const lo = y - a.range;
  const hi = y + a.range;
  const of = vars[a.of];
  const target = clamp(of, lo, hi);
  let value;
  let delta;
  if (a.type === 'scale') {
    const factor = of > 0 ? target / of : 1;
    value = clamp(raw * factor, 0, comp.max);
    delta = value - raw;
  } else {
    value = clamp(raw + (target - of), 0, comp.max);
    delta = value - raw;
  }
  return { value, info: { status: 'ok', y, lo, hi, inRange: of >= lo && of <= hi, delta } };
}

export function componentResult(comp, course) {
  let raw = null;
  let complete = false;
  let itemInfo = null;
  if (comp.items) {
    const items = itemsFor(comp, course);
    const c = combineItems(comp, items);
    if (c) raw = c.raw;
    itemInfo = c;
    const filledAll = items.length > 0 && items.every((it) => toNum(it.score) !== null);
    complete = raw !== null && (comp.items.addable ? !!course.complete?.[comp.id] : filledAll);
  } else {
    const n = toNum(course.scores?.[comp.id]);
    if (n !== null) raw = clamp(n, 0, comp.max);
    complete = raw !== null;
  }
  let value = raw;
  let adjust = null;
  if (raw !== null && comp.adjust) {
    const r = applyAdjust(comp, raw, course);
    value = r.value;
    adjust = r.info;
  }
  return { id: comp.id, max: comp.max, raw, value, graded: raw !== null, complete, adjust, itemInfo };
}

// ---------- course ----------

export function courseResult(course) {
  const dist = course.dist;
  if (!dist) return null;
  const parts = dist.components.map((c) => componentResult(c, course));
  let earned = 0;
  let gradedMax = 0;
  let secured = 0;
  let openMax = 0;
  for (const p of parts) {
    if (p.graded) { earned += p.value; gradedMax += p.max; }
    if (p.complete) secured += p.value;
    else openMax += p.max;
  }
  const total = dist.total;
  const allDone = parts.every((p) => p.complete);
  return {
    parts,
    total,
    earned,
    gradedMax,
    secured,
    openMax,
    maxPossible: Math.min(secured + openMax, total),
    allDone,
    // performance on what has been graded so far, in %
    pctSoFar: gradedMax > 0 ? (earned / gradedMax) * 100 : null,
    finalPct: allDone ? (secured / total) * 100 : null,
  };
}

export function letterFromPct(pct, cutoffs) {
  if (pct === null || pct === undefined) return null;
  for (const s of SCALE) {
    if (s.letter === 'F') return 'F';
    const min = toNum(cutoffs?.[s.letter]);
    if (min !== null && pct >= min - 1e-9) return s.letter;
  }
  return 'F';
}

// Letter for a course: picked by hand, or from cutoffs (projected until everything is graded).
export function courseLetter(course, result = courseResult(course)) {
  if (course.letterMode === 'manual') {
    return course.manualLetter ? { letter: course.manualLetter, projected: false, manual: true } : null;
  }
  if (!result) return null;
  const pct = result.allDone ? result.finalPct : result.pctSoFar;
  if (pct === null) return null;
  return { letter: letterFromPct(pct, course.cutoffs || defaultCutoffs()), projected: !result.allDone, manual: false };
}

// Points needed on everything still open to reach targetPct of the course total.
export function neededFor(result, targetPct) {
  if (!result) return null;
  const targetPts = (targetPct / 100) * result.total;
  const need = targetPts - result.secured;
  if (need <= 1e-9) return { status: 'secured', need: 0, of: result.openMax, pct: 0, targetPts };
  if (result.openMax <= 0 || need > result.openMax + 1e-9) {
    return { status: 'unreachable', need, of: result.openMax, pct: result.openMax > 0 ? (need / result.openMax) * 100 : null, targetPts };
  }
  return { status: 'ok', need, of: result.openMax, pct: (need / result.openMax) * 100, targetPts };
}

// ---------- GPA ----------

export function termSummary(term) {
  let credits = 0;
  let gpaCredits = 0;
  let quality = 0;
  for (const c of term.courses) {
    const cr = toNum(c.credits) ?? 0;
    credits += cr;
    const l = courseLetter(c);
    const gp = l ? gradePoints(l.letter) : null;
    if (gp !== null && cr > 0) { gpaCredits += cr; quality += gp * cr; }
  }
  return { credits, gpaCredits, quality, gpa: gpaCredits > 0 ? quality / gpaCredits : null };
}

export function cumulativeSummary(terms) {
  let gpaCredits = 0;
  let quality = 0;
  let credits = 0;
  for (const t of terms) {
    const s = termSummary(t);
    gpaCredits += s.gpaCredits;
    quality += s.quality;
    credits += s.credits;
  }
  return { credits, gpaCredits, quality, gpa: gpaCredits > 0 ? quality / gpaCredits : null };
}

// GPA needed on the remaining credits to graduate with targetCgpa.
export function graduationNeeded({ target, totalCredits, currentGpa, currentCredits }) {
  const t = toNum(target);
  const total = toNum(totalCredits);
  const g = toNum(currentGpa) ?? 0;
  const done = toNum(currentCredits) ?? 0;
  if (t === null || total === null || total <= 0) return null;
  const remaining = total - done;
  if (remaining <= 0) return { status: 'done', remaining: 0, needed: null, finalCgpa: g };
  const needed = (t * total - g * done) / remaining;
  let status = 'ok';
  if (needed > MAX_GPA + 1e-9) status = 'unreachable';
  else if (needed <= 0) status = 'secured';
  return { status, remaining, needed, maxCgpa: (g * done + MAX_GPA * remaining) / total };
}
