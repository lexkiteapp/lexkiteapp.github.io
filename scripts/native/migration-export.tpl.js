/* __GENERATED__
 * One-shot export of the Capacitor app's learner data (C03, docs/specs/native-apps.md §4) – READ ONLY, never writes or deletes.
 * Native app: on first launch after the update, load a blank page in a hidden WebView on the OLD origin
 *   iOS     WKWebView, custom scheme handler for capacitor://localhost  → callAsyncJavaScript("return await " + <this file>)
 *   Android WebView with https://localhost (WebViewAssetLoader)         → evaluateJavascript; result via window.LexkiteExport.done(json)
 * and store the returned JSON string. Convert it exactly like native/shared/gen/vectors/migration.json "expect" (cards from IndexedDB
 * "__DB__" store "kv" key "__PREFIX__cards", merged with a newer "__PREFIX__cards" left in localStorage, legacy "__OLD_DB__" DB; other
 * learner keys from localStorage "__PREFIX__*"). Dictionary caches (dc:*, dc2:*, dcIndex) and the test sandbox (sbx.*) are skipped. */
(async () => {
  const PREFIX = '__PREFIX__', DBS = ['__DB__', '__OLD_DB__'];
  const out = { kind: 'lexkite-capacitor-export', v: 1, origin: String(location.origin), at: Date.now(), prefix: PREFIX, idb: {}, ls: {}, skipped: 0, errors: [] };
  const skip = k => /^sbx\./.test(k) || /^(ielts|sbx)\.(dc2?:|dcIndex$)/.test(k);
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k == null) continue;
      if (skip(k)) { out.skipped++; continue; }
      out.ls[k] = localStorage.getItem(k);
    }
  } catch (e) { out.errors.push('localStorage: ' + (e && e.message)); }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  let names = null;
  try { if (typeof indexedDB !== 'undefined' && indexedDB.databases) names = (await indexedDB.databases()).map(d => d.name); } catch (e) { out.errors.push('databases: ' + (e && e.message)); }
  for (const name of DBS) {
    if (typeof indexedDB === 'undefined') break;
    if (names && !names.includes(name)) continue; // never create an empty DB by opening it
    try {
      const db = await new Promise((res, rej) => { const r = indexedDB.open(name); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); r.onupgradeneeded = () => { /* did not exist (no databases() support) */ }; });
      if (!db.objectStoreNames.contains('kv')) { db.close(); continue; }
      const rows = {};
      await new Promise((res, rej) => {
        const tx = db.transaction('kv', 'readonly'), cur = tx.objectStore('kv').openCursor();
        cur.onsuccess = () => { const c = cur.result; if (!c) return; const k = String(c.key); if (skip(k)) out.skipped++; else rows[k] = c.value; c.continue(); };
        tx.oncomplete = res; tx.onerror = () => rej(tx.error);
      });
      db.close();
      if (Object.keys(rows).length) out.idb[name] = rows;
    } catch (e) { out.errors.push(name + ': ' + (e && e.message)); }
  }
  const json = JSON.stringify(out);
  try { if (window.LexkiteExport && window.LexkiteExport.done) window.LexkiteExport.done(json); } catch (e) { /* Android bridge absent */ }
  return json;
})()
