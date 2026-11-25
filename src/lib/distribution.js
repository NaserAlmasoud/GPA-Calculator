// Parses and validates the grade-distribution text pasted into the syllabus box.
//
// Format (JSON):
// {
//   "course": "MATH 208",            optional, fills the course name
//   "credits": 3,                    optional, fills the credit hours
//   "total": 300,                    optional, defaults to the sum of component max
//   "components": [
//     { "id": "exam1", "name": {"en": "Exam I", "ar": "الاختبار الأول"}, "max": 75 },
//     { "id": "quizzes", "name": "Quizzes", "max": 15,
//       "items": { "count": 5, "addable": false, "combine": "points" | "average",
//                  "drop": 1, "best": 4, "defaultMax": 10 },
//       "adjust": { "type": "shift" | "scale", "inputs": {"m1": "...", ...},
//                   "target": "formula", "range": 1.5, "of": "avg" } }
//   ],
//   "letter": { "mode": "curve" }  or  { "mode": "fixed", "cutoffs": {"A+": 95, ...} }
// }

import { compile, variablesOf } from './expr.js';
import { LETTERS } from './grades.js';

const isNum = (x) => typeof x === 'number' && Number.isFinite(x);

function fail(msg) {
  return { ok: false, error: msg };
}

function normName(name, fallback) {
  if (typeof name === 'string' && name.trim()) return { en: name.trim(), ar: name.trim() };
  if (name && typeof name === 'object') {
    const en = (name.en || name.ar || '').trim();
    const ar = (name.ar || name.en || '').trim();
    if (en || ar) return { en: en || ar, ar: ar || en };
  }
  return { en: fallback, ar: fallback };
}

export function parseDistribution(text) {
  if (!text || !String(text).trim()) return fail('empty');
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return fail(`Not valid JSON: ${e.message}`);
  }
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.components) || raw.components.length === 0) {
    return fail('"components" must be a non-empty list');
  }

  const ids = new Set();
  const components = [];
  for (let i = 0; i < raw.components.length; i++) {
    const c = raw.components[i];
    const where = `Component ${i + 1}`;
    if (!c || typeof c !== 'object') return fail(`${where} is not an object`);
    const id = String(c.id || `c${i + 1}`);
    if (ids.has(id)) return fail(`Duplicate component id "${id}"`);
    ids.add(id);
    const max = isNum(c.max) ? c.max : c.weight;
    if (!isNum(max) || max <= 0) return fail(`${where} ("${id}") needs a positive "max"`);
    const comp = { id, name: normName(c.name, id), max };

    if (c.items) {
      const it = c.items === true ? {} : c.items;
      const count = isNum(it.count) && it.count > 0 ? Math.floor(it.count) : null;
      comp.items = {
        count,
        addable: it.addable ?? count === null,
        combine: it.combine === 'average' ? 'average' : 'points',
        drop: isNum(it.drop) && it.drop > 0 ? Math.floor(it.drop) : 0,
        best: isNum(it.best) && it.best > 0 ? Math.floor(it.best) : null,
        defaultMax: isNum(it.defaultMax) && it.defaultMax > 0 ? it.defaultMax : 10,
      };
    }

    if (c.adjust) {
      const a = c.adjust;
      const type = a.type === 'scale' ? 'scale' : 'shift';
      if (!a.inputs || typeof a.inputs !== 'object' || !Object.keys(a.inputs).length) {
        return fail(`${where}: "adjust.inputs" is required`);
      }
      const inputs = Object.entries(a.inputs).map(([key, label]) => ({ key, label: normName(label, key) }));
      const keys = new Set(inputs.map((x) => x.key));
      let ast;
      try {
        ast = compile(a.target);
      } catch (e) {
        return fail(`${where}: bad "adjust.target" formula (${e.message})`);
      }
      for (const v of variablesOf(ast)) {
        if (!keys.has(v)) return fail(`${where}: formula uses "${v}" which is not in "adjust.inputs"`);
      }
      if (!keys.has(a.of)) return fail(`${where}: "adjust.of" must name one of the inputs`);
      comp.adjust = { type, inputs, target: String(a.target), range: isNum(a.range) ? a.range : 0, of: a.of };
    }
    components.push(comp);
  }

  const sum = components.reduce((s, c) => s + c.max, 0);
  const total = isNum(raw.total) && raw.total > 0 ? raw.total : sum;

  let letter = { mode: 'curve', cutoffs: null };
  if (raw.letter && raw.letter.mode === 'fixed' && raw.letter.cutoffs) {
    const cutoffs = {};
    for (const l of LETTERS) if (isNum(raw.letter.cutoffs[l])) cutoffs[l] = raw.letter.cutoffs[l];
    letter = { mode: 'fixed', cutoffs };
  }

  return {
    ok: true,
    dist: {
      course: typeof raw.course === 'string' ? raw.course.trim() : '',
      credits: isNum(raw.credits) ? raw.credits : null,
      total,
      components,
      letter,
    },
    warning: Math.abs(sum - total) > 1e-9 ? `Components add up to ${sum}, but total is ${total}` : null,
  };
}
