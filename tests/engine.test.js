import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evalFormula } from '../src/lib/expr.js';
import { parseDistribution } from '../src/lib/distribution.js';
import { courseResult, courseLetter, neededFor, termSummary, cumulativeSummary, graduationNeeded, defaultCutoffs } from '../src/lib/grades.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);
const math208 = readFileSync(new URL('../syllabi/MATH208-261.json', import.meta.url), 'utf8');

test('formula evaluator', () => {
  near(evalFormula('9/40 * (m1 + m2)', { m1: 60, m2: 70 }), 29.25);
  near(evalFormula('-2^2 + max(1, 3) * clamp(5, 0, 2)', {}), 2);
  assert.throws(() => evalFormula('alert(1)', {}));
  assert.throws(() => evalFormula('m1 +', { m1: 1 }));
});

test('parses MATH 208', () => {
  const r = parseDistribution(math208);
  assert.equal(r.ok, true, r.error);
  assert.equal(r.dist.total, 300);
  assert.equal(r.dist.credits, 3);
  assert.equal(r.dist.components.length, 4);
  assert.equal(r.warning, null);
});

test('rejects bad distributions', () => {
  assert.equal(parseDistribution('{').ok, false);
  assert.equal(parseDistribution('{"components":[]}').ok, false);
  assert.equal(parseDistribution('{"components":[{"id":"a","max":10,"adjust":{"inputs":{"x":"x"},"target":"y*2","of":"x"}}]}').ok, false);
});

function mathCourse(extra = {}) {
  return { dist: parseDistribution(math208).dist, scores: {}, items: {}, complete: {}, adjust: {}, letterMode: 'cutoffs', cutoffs: defaultCutoffs(), credits: '3', ...extra };
}

test('MATH 208 totals and class-work shift', () => {
  const c = mathCourse({
    scores: { exam1: '60', exam2: '' },
    items: { classwork: [{ id: 'a', score: '8', max: '10' }, { id: 'b', score: '9', max: '10' }] },
    adjust: { classwork: { m1: '60', m2: '60', avg: '30' } },
  });
  const r = courseResult(c);
  const cw = r.parts.find((p) => p.id === 'classwork');
  near(cw.raw, 38.25); // 17/20 * 45
  // y = 9/40*120 = 27, range [25.5, 28.5], avg 30 -> shift -1.5
  near(cw.adjust.y, 27);
  near(cw.value, 36.75);
  near(r.earned, 60 + 36.75);
  // class work not marked complete -> open; open = exam2 + final + classwork
  near(r.secured, 60);
  near(r.openMax, 75 + 105 + 45);
  near(r.maxPossible, 285);
  // needed for 80% = 240 pts -> need 180 of 225
  const n = neededFor(r, 80);
  assert.equal(n.status, 'ok');
  near(n.need, 180);
});

test('shift is capped to component max and avg in range means no change', () => {
  const c = mathCourse({ items: { classwork: [{ id: 'a', score: '45', max: '45' }] }, adjust: { classwork: { m1: '90', m2: '90', avg: '20' } } });
  const cw = courseResult(c).parts.find((p) => p.id === 'classwork');
  near(cw.value, 45);
  const c2 = mathCourse({ items: { classwork: [{ id: 'a', score: '30', max: '45' }] }, adjust: { classwork: { m1: '60', m2: '60', avg: '27' } } });
  near(courseResult(c2).parts.find((p) => p.id === 'classwork').value, 30);
});

test('drop lowest / best of and averaging', () => {
  const dist = parseDistribution(JSON.stringify({ components: [
    { id: 'q', max: 20, items: { count: 4, drop: 1, combine: 'average' } },
    { id: 'h', max: 10, items: { best: 2 } },
  ] })).dist;
  const c = { dist, items: {
    q: [{ score: '10', max: '10' }, { score: '5', max: '10' }, { score: '8', max: '10' }, { score: '0', max: '5' }],
    h: [{ score: '1', max: '10' }, { score: '10', max: '10' }, { score: '6', max: '10' }],
  }, complete: { h: true } };
  const r = courseResult(c);
  near(r.parts[0].value, 20 * (1 + 0.5 + 0.8) / 3); // dropped the 0/5
  assert.equal(r.parts[0].complete, true);
  near(r.parts[1].value, 10 * 16 / 20);
});

test('letters, term and cumulative GPA', () => {
  const full = mathCourse({ scores: { exam1: '75', exam2: '75', final: '105' }, items: { classwork: [{ score: '45', max: '45' }] }, complete: { classwork: true } });
  const l = courseLetter(full);
  assert.deepEqual([l.letter, l.projected], ['A+', false]);
  const manual = { letterMode: 'manual', manualLetter: 'B+', credits: '4' };
  const t1 = { courses: [full, manual, { credits: '3' }] };
  const s = termSummary(t1);
  assert.equal(s.credits, 10);
  near(s.gpa, (4 * 3 + 3.5 * 4) / 7);
  const cum = cumulativeSummary([t1, { courses: [{ letterMode: 'manual', manualLetter: 'C', credits: '3' }] }]);
  near(cum.gpa, (12 + 14 + 6) / 10);
});

test('graduation calculator', () => {
  const r = graduationNeeded({ target: 3.5, totalCredits: 130, currentGpa: 3.2, currentCredits: 60 });
  near(r.needed, (3.5 * 130 - 3.2 * 60) / 70);
  assert.equal(graduationNeeded({ target: 3.9, totalCredits: 130, currentGpa: 2, currentCredits: 100 }).status, 'unreachable');
  assert.equal(graduationNeeded({ target: 2, totalCredits: 130, currentGpa: 3.9, currentCredits: 125 }).status, 'secured');
});
