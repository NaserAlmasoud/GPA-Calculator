import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18n, makeT } from './i18n.js';
import { useAppStore, useRoute, go, uid, newCourse, applyDistribution } from './store.js';
import { cumulativeSummary } from './lib/grades.js';
import Drawer from './components/Drawer.jsx';
import TermView from './components/TermView.jsx';
import HomeView from './components/HomeView.jsx';
import CourseView from './components/CourseView.jsx';
import { TermNameModal, AddCourseModal, SyllabusModal, GraduationModal } from './components/Modals.jsx';
import { Confirm, IconButton, Icon } from './components/ui.jsx';

function useWide() {
  const q = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}

export default function App() {
  const [state, update] = useAppStore();
  const route = useRoute();
  const wide = useWide();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const closeModal = useCallback(() => setModal(null), []);

  const lang = state?.settings.lang || 'en';
  const theme = state?.settings.theme || 'system';
  const i18n = useMemo(() => ({ lang, t: makeT(lang) }), [lang]);
  const { t } = i18n;

  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t('appName');
  }, [lang, t]);
  useEffect(() => {
    const el = document.documentElement;
    if (theme === 'system') delete el.dataset.theme;
    else el.dataset.theme = theme;
  }, [theme]);

  if (!state) return null;

  const terms = state.terms;
  const activeTerm = terms.find((x) => x.id === route.termId) || null;
  const course = activeTerm && route.courseId ? activeTerm.courses.find((c) => c.id === route.courseId) : null;
  const cumulative = cumulativeSummary(terms);
  const drawerVisible = wide ? state.settings.drawerOpen : mobileOpen;

  const toggleDrawer = () => {
    if (wide) update((s) => { s.settings.drawerOpen = !s.settings.drawerOpen; });
    else setMobileOpen((o) => !o);
  };
  const selectTerm = (id) => { go(id); if (!wide) setMobileOpen(false); };
  const goHome = () => { go(null); if (!wide) setMobileOpen(false); };
  const setCourseLetter = (courseId, letter) => updateTerm((tm) => {
    const c = tm.courses.find((x) => x.id === courseId);
    if (letter) { c.letterMode = 'manual'; c.manualLetter = letter; }
    else { c.manualLetter = ''; c.letterMode = c.dist ? 'cutoffs' : 'manual'; }
  });

  const updateTerm = (fn) => update((s) => { fn(s.terms.find((x) => x.id === activeTerm.id)); });
  const updateCourse = (fn) => update((s) => {
    const tm = s.terms.find((x) => x.id === activeTerm.id);
    fn(tm.courses.find((c) => c.id === course.id));
  });

  const addTerm = (name) => {
    const id = uid();
    update((s) => { s.terms.push({ id, name, courses: [] }); });
    go(id);
    if (!wide) setMobileOpen(false);
  };

  const drawer = (
    <Drawer terms={terms} activeId={activeTerm?.id} cumulative={cumulative} settings={state.settings}
      onHome={goHome}
      onSelect={selectTerm}
      onAddTerm={() => setModal({ type: 'addTerm' })}
      onToggleLang={() => update((s) => { s.settings.lang = s.settings.lang === 'ar' ? 'en' : 'ar'; })}
      onCycleTheme={() => update((s) => { s.settings.theme = { system: 'light', light: 'dark', dark: 'system' }[s.settings.theme] || 'system'; })}
      onOpenGrad={() => { setModal({ type: 'grad' }); if (!wide) setMobileOpen(false); }} />
  );

  let main;
  if (!activeTerm) {
    main = (
      <HomeView terms={terms} cumulative={cumulative}
        onOpenTerm={selectTerm}
        onAddTerm={() => setModal({ type: 'addTerm' })}
        onOpenGrad={() => setModal({ type: 'grad' })} />
    );
  } else if (course) {
    main = (
      <CourseView term={activeTerm} course={course} unit={state.settings.unit}
        onUnit={(u) => update((s) => { s.settings.unit = u; })}
        updateCourse={updateCourse}
        onBack={() => go(activeTerm.id)}
        onSyllabus={() => setModal({ type: 'syllabus' })}
        onDelete={() => setModal({ type: 'deleteCourse' })} />
    );
  } else {
    main = (
      <TermView term={activeTerm}
        onBack={goHome}
        onSetLetter={setCourseLetter}
        onOpenCourse={(cid) => go(activeTerm.id, cid)}
        onAddCourse={() => setModal({ type: 'addCourse' })}
        onRename={() => setModal({ type: 'renameTerm' })}
        onDelete={() => setModal({ type: 'deleteTerm' })} />
    );
  }

  return (
    <I18n.Provider value={i18n}>
      <div className="app">
        <header className="topbar">
          <button type="button" className="brand" onClick={goHome}>{t('appName')}</button>
          {activeTerm && !wide && <span className="topbar-term faint" dir="auto">· {activeTerm.name}</span>}
          {/* menu button sits on the same side the terms drawer opens from */}
          <IconButton icon="menu" label={t('menu')} onClick={toggleDrawer} aria-expanded={drawerVisible} className="menu-btn" />
        </header>
        <div className={`shell ${wide && drawerVisible ? 'with-drawer' : ''}`}>
          <main className="main">{main}</main>
          {wide && drawerVisible && <aside className="drawer side">{drawer}</aside>}
        </div>
        {!wide && (
          <>
            <div className={`drawer-backdrop ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <aside className={`drawer sheet ${mobileOpen ? 'open' : ''}`} aria-hidden={!mobileOpen} inert={mobileOpen ? undefined : ''}>
              {drawer}
            </aside>
          </>
        )}

        {modal?.type === 'addTerm' && <TermNameModal title={t('addTerm')} onSave={addTerm} onClose={closeModal} />}
        {modal?.type === 'renameTerm' && (
          <TermNameModal title={t('renameTerm')} initial={activeTerm.name} onClose={closeModal}
            onSave={(name) => updateTerm((tm) => { tm.name = name; })} />
        )}
        {modal?.type === 'deleteTerm' && (
          <Confirm text={t('deleteTermConfirm', { name: activeTerm.name })} onClose={closeModal}
            onYes={() => { update((s) => { s.terms = s.terms.filter((x) => x.id !== activeTerm.id); }); go(null); }} />
        )}
        {modal?.type === 'addCourse' && (
          <AddCourseModal onClose={closeModal}
            onAdd={(data) => updateTerm((tm) => { tm.courses.push(newCourse(data)); })} />
        )}
        {modal?.type === 'syllabus' && course && (
          <SyllabusModal course={course} onClose={closeModal}
            onApply={(text) => updateCourse((c) => { applyDistribution(c, text); })} />
        )}
        {modal?.type === 'deleteCourse' && course && (
          <Confirm text={t('deleteCourseConfirm', { name: course.name })} onClose={closeModal}
            onYes={() => { updateTerm((tm) => { tm.courses = tm.courses.filter((c) => c.id !== course.id); }); go(activeTerm.id); }} />
        )}
        {modal?.type === 'grad' && (
          <GraduationModal grad={state.settings.grad} cumulative={cumulative} onClose={closeModal}
            onChange={(g) => update((s) => { s.settings.grad = g; })} />
        )}
      </div>
    </I18n.Provider>
  );
}
