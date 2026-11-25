import { useCallback, useEffect, useRef, useState } from 'react';
import { storage } from './lib/storage.js';
import { defaultCutoffs } from './lib/grades.js';
import { parseDistribution } from './lib/distribution.js';

export const uid = () => Math.random().toString(36).slice(2, 10);

function initialState() {
  const ar = typeof navigator !== 'undefined' && /^ar\b/i.test(navigator.language || '');
  return {
    version: 1,
    settings: {
      lang: ar ? 'ar' : 'en',
      theme: 'system',
      unit: 'points',
      drawerOpen: true,
      grad: { target: '', totalCredits: '', useCurrent: true, gpa: '', credits: '' },
    },
    terms: [],
  };
}

export function newCourse({ name, credits, distText }) {
  const course = {
    id: uid(),
    name: name.trim(),
    credits: String(credits ?? ''),
    distText: '',
    dist: null,
    scores: {},
    items: {},
    complete: {},
    adjust: {},
    letterMode: 'cutoffs',
    cutoffs: defaultCutoffs(),
    manualLetter: '',
  };
  if (distText && distText.trim()) applyDistribution(course, distText);
  return course;
}

// Sets a course's distribution; keeps scores whose component ids still exist.
export function applyDistribution(course, text) {
  const r = parseDistribution(text);
  if (!r.ok) return r;
  course.distText = text;
  course.dist = r.dist;
  if (!course.name && r.dist.course) course.name = r.dist.course;
  if ((course.credits === '' || course.credits == null) && r.dist.credits != null) course.credits = String(r.dist.credits);
  if (r.dist.letter.mode === 'fixed' && Object.keys(r.dist.letter.cutoffs).length) {
    course.cutoffs = { ...defaultCutoffs(), ...r.dist.letter.cutoffs };
  }
  return r;
}

export function useAppStore() {
  const [state, setState] = useState(null);
  const loaded = useRef(false);

  useEffect(() => {
    storage.load().then((saved) => {
      const base = initialState();
      if (saved && saved.version === 1) {
        setState({ ...base, ...saved, settings: { ...base.settings, ...saved.settings, grad: { ...base.settings.grad, ...saved.settings?.grad } } });
      } else {
        setState(base);
      }
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current || !state) return;
    storage.save(state);
  }, [state]);

  // update(draft => { ...mutate... })
  const update = useCallback((fn) => {
    setState((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  }, []);

  return [state, update];
}

export function findCourse(state, termId, courseId) {
  const term = state.terms.find((t) => t.id === termId);
  return term ? term.courses.find((c) => c.id === courseId) : null;
}

// ---- hash routing: #t-<termId> and #t-<termId>-c-<courseId> (plain #name so it works on any host) ----
function parseHash() {
  const m = window.location.hash.match(/^#t-([a-z0-9]+)(?:-c-([a-z0-9]+))?$/i);
  return { termId: m ? m[1] : null, courseId: m ? m[2] || null : null };
}

export function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function go(termId, courseId) {
  window.location.hash = termId ? `t-${termId}${courseId ? `-c-${courseId}` : ''}` : '';
}
