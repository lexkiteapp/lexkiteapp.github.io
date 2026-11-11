/* Minimal in-memory IndexedDB (only what web/js/core.js Store and native/shared/gen/migration-export.js use):
 * indexedDB.open/databases/deleteDatabase, onupgradeneeded/createObjectStore, objectStoreNames.contains,
 * transaction(store, mode).objectStore(store).get/put/delete/openCursor, tx.oncomplete. Async like the real thing
 * (every request resolves in a later macrotask; a transaction completes once no request is pending).
 * Dependency-free so scripts/native/gen.mjs can run in the native CI jobs without npm ci. Test/generator use only. */
export function fakeIndexedDB(seed = {}) {
  // seed: { dbName: { storeName: { key: value } } }
  const dbs = new Map();
  for (const [name, stores] of Object.entries(seed)) {
    const m = new Map();
    for (const [s, kv] of Object.entries(stores)) m.set(s, new Map(Object.entries(kv).map(([k, v]) => [k, structuredClone(v)])));
    dbs.set(name, { version: 1, stores: m });
  }
  const later = fn => setImmediate(fn);
  function handle(name, d) {
    return {
      name, get version() { return d.version; },
      objectStoreNames: { contains: n => d.stores.has(n), get length() { return d.stores.size; }, item: i => [...d.stores.keys()][i] },
      createObjectStore(n) { if (!d.stores.has(n)) d.stores.set(n, new Map()); return {}; },
      close() {},
      transaction(names, mode = 'readonly') {
        const list = [].concat(names);
        for (const n of list) if (!d.stores.has(n)) throw Object.assign(new Error(`NotFoundError: ${n}`), { name: 'NotFoundError' });
        const tx = { mode, done: false, q: 0, oncomplete: null, onerror: null, onabort: null, error: null };
        const check = () => later(() => { if (!tx.q && !tx.done) { tx.done = true; if (tx.oncomplete) tx.oncomplete(); } });
        const req = fn => {
          const r = { result: undefined, error: null, onsuccess: null, onerror: null };
          tx.q++;
          later(() => {
            try { r.result = fn(r); } catch (e) { r.error = e; tx.q--; if (r.onerror) r.onerror(); tx.error = e; if (tx.onerror) tx.onerror(); return; }
            tx.q--; if (r.onsuccess) r.onsuccess({ target: r }); check();
          });
          return r;
        };
        const ro = () => { if (mode !== 'readwrite') throw Object.assign(new Error('ReadOnlyError'), { name: 'ReadOnlyError' }); };
        tx.objectStore = n => {
          const st = d.stores.get(n);
          if (!st || !list.includes(n)) throw Object.assign(new Error(`NotFoundError: ${n}`), { name: 'NotFoundError' });
          return {
            get: k => req(() => (st.has(k) ? structuredClone(st.get(k)) : undefined)),
            put: (v, k) => req(() => { ro(); st.set(k, structuredClone(v)); return k; }),
            delete: k => req(() => { ro(); st.delete(k); }),
            openCursor() {
              const keys = [...st.keys()].sort(); let i = 0;
              const at = r => (i < keys.length ? { key: keys[i], value: structuredClone(st.get(keys[i])), continue() { i++; tx.q++; later(() => { r.result = at(r); tx.q--; if (r.onsuccess) r.onsuccess({ target: r }); check(); }); } } : null);
              return req(r => at(r));
            },
          };
        };
        check();
        return tx;
      },
    };
  }
  const idb = {
    open(name, version) {
      const r = { result: null, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
      later(() => {
        let d = dbs.get(name); const fresh = !d;
        if (fresh) { d = { version: version || 1, stores: new Map() }; dbs.set(name, d); }
        const up = fresh || (version && version > d.version);
        if (version && version > d.version) d.version = version;
        r.result = handle(name, d);
        if (up && r.onupgradeneeded) r.onupgradeneeded({ target: r });
        if (r.onsuccess) r.onsuccess({ target: r });
      });
      return r;
    },
    databases: async () => [...dbs.entries()].map(([name, d]) => ({ name, version: d.version })),
    deleteDatabase(name) { const r = { onsuccess: null }; later(() => { dbs.delete(name); if (r.onsuccess) r.onsuccess(); }); return r; },
    // test helper: plain dump { db: { store: { key: value } } }
    _dump: () => Object.fromEntries([...dbs.entries()].map(([n, d]) => [n, Object.fromEntries([...d.stores.entries()].map(([s, m]) => [s, Object.fromEntries(m)]))])),
  };
  return idb;
}

/** In-memory Web Storage (localStorage) with the real API surface. */
export function memStorage(init = {}) {
  const m = new Map(Object.entries(init).map(([k, v]) => [k, String(v)]));
  return {
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
    _dump: () => Object.fromEntries(m),
  };
}
