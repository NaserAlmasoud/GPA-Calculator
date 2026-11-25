// Storage adapter. The app only talks to `storage.load()` and `storage.save(state)`,
// both async, so a server-backed adapter can replace this one later without touching the UI.

const KEY = 'gpa-calculator:v1';

export const localStorageAdapter = {
  async load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  async save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  },
};

// Example of the future server adapter:
// export const apiAdapter = {
//   async load() { const r = await fetch('/api/state'); return r.ok ? r.json() : null; },
//   async save(state) { await fetch('/api/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) }); },
// };

export const storage = localStorageAdapter;
