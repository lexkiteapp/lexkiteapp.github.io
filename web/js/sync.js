/* Tài khoản & đồng bộ đám mây: đăng nhập Google bằng Firebase Auth, dữ liệu lưu ở Cloudflare D1 qua /api/sync
 * (functions/api/sync.js – hạn mức miễn phí lớn hơn Firestore nhiều lần). Tài liệu: meta + cards_0..n; gộp 2 chiều theo hoạt động gần nhất.
 */
(function () {
  const { Store, Cards } = Core;
  const { $, esc, toast } = UI;
  const App = window.App;
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  const NB = 32; // số nhóm thẻ cố định (mỗi nhóm < 1 MiB với tới ~90.000 thẻ)
  const bucketOf = k => { let x = 2166136261; for (let i = 0; i < k.length; i++) { x ^= k.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) % NB; };

  const Sync = { user: null, status: 'idle', lastSync: 0 };
  window.Sync = Sync;
  let fb = null, db = null, timer = null, box = null;
  // Cùng tên miền → gọi thẳng; app/add-on/bản xem trước → gọi về lexkite.com
  const API = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '/api/sync' : 'https://lexkite.com/api/sync';
  async function api(body, tries = 0) {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await Sync.user.getIdToken() }, body: JSON.stringify(body) });
    if (r.status === 429) {
      const j = await r.json().catch(() => ({}));
      // Chống spam phía máy chủ: gửi quá nhanh → chờ đúng số giây rồi gửi lại (không tạm dừng đồng bộ, không mất dữ liệu)
      if (j.error === 'too-fast' && tries < 2) { await new Promise(res => setTimeout(res, Math.min(30, (+j.wait || 5) + 1) * 1000)); return api(body, tries + 1); }
      throw Object.assign(new Error('quota'), { code: 'resource-exhausted' });
    }
    if (!r.ok) throw new Error('sync ' + r.status);
    return r.json();
  }

  const supported = !Store.isExtension && !Store.sandbox && window.FIREBASE_CONFIG && location.protocol.startsWith('http');

  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function init() {
    if (!supported || fb) return;
    await loadScript(SDK + 'firebase-app-compat.js');
    await loadScript(SDK + 'firebase-auth-compat.js'); // chỉ cần đăng nhập – không tải Firestore SDK (nhẹ hơn ~100 KB)
    fb = firebase.initializeApp(FIREBASE_CONFIG);
    db = true;
    firebase.auth().onAuthStateChanged(async u => {
      Sync.user = u; Sync.ready = true; App.state.user = u ? { uid: u.uid, displayName: u.displayName, email: u.email, photoURL: u.photoURL } : null;
      App.updateChrome(); render();
      if (u) { await pullMerge(); if (extReady) extCall('linked', { email: u.email, name: u.displayName || '' }); }
      else nudgeLogin();
    });
  }

  // ---------- Gộp dữ liệu ----------
  const activity = c => Math.max(c.srs && c.srs.last || 0, c.added || 0, c.mod || 0);
  function mergeCards(a, b, deleted = {}) {
    const out = Object.assign(Object.create(null), a); // không kế thừa prototype (thẻ "constructor"…)
    for (const [k, c] of Object.entries(b)) {
      const mine = out[k];
      if (!mine) { out[k] = c; continue; }
      const remoteWins = activity(c) > activity(mine);
      const win = { ...(remoteWins ? c : mine) };
      const lose = remoteWins ? mine : c;
      win.contexts = [...(win.contexts || []), ...(lose.contexts || []).filter(x => !(win.contexts || []).some(y => y.text === x.text))].slice(0, 5);
      out[k] = win;
    }
    // Thẻ đã xóa (ở bất kỳ thiết bị nào) sau lần hoạt động cuối → bỏ
    for (const [k, t] of Object.entries(deleted)) if (out[k] && activity(out[k]) < t) delete out[k];
    return out;
  }
  function mergeStats(a, b) {
    const days = { ...a.days };
    for (const [k, v] of Object.entries(b.days || {})) days[k] = Math.max(days[k] || 0, v);
    const nt = (a.newToday && b.newToday && a.newToday.day === b.newToday.day) ? { day: a.newToday.day, n: Math.max(a.newToday.n, b.newToday.n) } : (a.newToday && a.newToday.day > (b.newToday || {}).day ? a.newToday : b.newToday || a.newToday);
    return { days, newToday: nt };
  }
  // Gộp bảng điểm 2 thiết bị: giữ điểm cao nhất của mỗi bài
  const maxMerge = (x = {}, y = {}) => { const o = { ...(x || {}) }; for (const [k, v] of Object.entries(y || {})) o[k] = typeof v === 'number' && typeof o[k] === 'number' ? Math.max(o[k], v) : (o[k] != null ? o[k] : v); return o; };
  function mergeGame(a, b) {
    if (!b) return a; if (!a) return b;
    const days = { ...a.days };
    for (const [k, v] of Object.entries(b.days || {})) { days[k] = { ...(days[k] || {}) }; for (const [m, n] of Object.entries(v)) days[k][m] = Math.max(days[k][m] || 0, n); }
    const total = { ...a.total }; for (const [m, n] of Object.entries(b.total || {})) total[m] = Math.max(total[m] || 0, n);
    const best = { ...a.best }; if (b.best && b.best.match) best.match = Math.min(best.match || 1e9, b.best.match);
    const unitDone = { ...(b.unitDone || {}) };
    for (const [k, v] of Object.entries(a.unitDone || {})) unitDone[k] = Math.max(unitDone[k] || 0, v);
    // Lượt đóng băng: lấy theo bản nhiều XP hơn (tiến độ mới hơn); ngày đã đóng băng: hợp 2 bên
    const lead = (b.xp || 0) > (a.xp || 0) ? b : a;
    return { ...a, xp: Math.max(a.xp || 0, b.xp || 0), days, total, best, unitDone, freezes: lead.freezes || 0, freezeAt: Math.max(a.freezeAt || 0, b.freezeAt || 0), frozen: { ...(b.frozen || {}), ...(a.frozen || {}) },
      listenDone: maxMerge(a.listenDone, b.listenDone), grammarDone: maxMerge(a.grammarDone, b.grammarDone), pronDone: maxMerge(a.pronDone, b.pronDone), listenBest: maxMerge(a.listenBest, b.listenBest), rtype: (() => { const o = { ...(b.rtype || {}) }; for (const [k, v] of Object.entries(a.rtype || {})) if (!o[k] || v.t > o[k].t) o[k] = v; return o; })(), toeicBest: (a.toeicBest || {}).total >= ((b.toeicBest || {}).total || 0) ? a.toeicBest : b.toeicBest, badges: { ...b.badges, ...a.badges }, readDone: { ...(b.readDone || {}), ...(a.readDone || {}) }, questsDone: { ...(b.questsDone || {}), ...(a.questsDone || {}) } };
  }

  // Dấu “đã xóa” chỉ cần giữ đủ lâu để mọi thiết bị kịp đồng bộ → bỏ mục quá 90 ngày, tránh phình dữ liệu
  const pruneDel = d => { const cut = Date.now() - 90 * 864e5; for (const k of Object.keys(d)) if (d[k] < cut) delete d[k]; return d; };

  // ---------- Cầu nối với add-on Chrome (cùng máy) ----------
  let extReady = false;
  window.addEventListener('message', e => { if (e.source === window && e.data && e.data.lkBridge === 'hello') { extReady = true; extCall('lang', { lang: I18N.lang() }); } }); // add-on dùng cùng ngôn ngữ giao diện với web
  const extCall = (op, data) => new Promise(res => {
    if (!extReady) return res(null);
    const id = Math.random().toString(36).slice(2);
    const on = e => { if (e.source === window && e.data && e.data.lkBridge === 'res' && e.data.id === id) { window.removeEventListener('message', on); res(e.data); } };
    window.addEventListener('message', on);
    window.postMessage({ lkBridge: 'req', op, id, data }, location.origin);
    setTimeout(() => { window.removeEventListener('message', on); res(null); }, 3000);
  });
  // Gộp từ đã lưu bằng add-on vào tài khoản, rồi trả lại bản gộp cho add-on
  // Cho module khác dùng cầu nối add-on (vd. dùng chung khóa AI trên cùng máy – không qua cloud)
  window.VBBridge = { ready: () => extReady, call: (op, data) => extCall(op, data) };
  async function syncExtension() {
    if (!Sync.user) return false;
    const r = await extCall('get');
    if (!r || !r.data) return false;
    const ext = r.data;
    const deleted = Object.assign(Object.create(null), await Store.get('deleted', {}));
    for (const [k, t] of Object.entries(ext.deleted || {})) deleted[k] = Math.max(deleted[k] || 0, t);
    const merged = mergeCards(await Cards.all(), ext.cards || {}, deleted);
    await Store.set('deleted', deleted);
    await Cards.save(merged);
    // Gộp cả lịch sử ôn (chuỗi ngày 🔥, mục tiêu hôm nay) để add-on và web hiển thị cùng con số
    const stats = mergeStats(await Core.Stats.get(), ext.stats || { days: {} });
    await Store.set('stats', stats);
    await extCall('set', { cards: await Cards.all(), deleted, stats });
    return Object.keys(ext.cards || {}).length;
  }
  Sync.syncExtension = syncExtension;

  // Thẻ thuộc thư viện có sẵn: chỉ lưu phần riêng của người học (lịch ôn, ngữ cảnh, ghi chú…)
  const LIB_FIELDS = ['ipa', 'pos', 'vi', 'def', 'ex', 'col', 'syn', 'level', 'emoji', 'topic'];
  function slim(c) {
    const lib = IELTS_DATA.INDEX[c.word.toLowerCase()];
    const o = { ...c };
    delete o.sentences; delete o.ipaUS; // tra lại được khi cần
    if (lib) {
      for (const k of LIB_FIELDS) if (JSON.stringify(o[k]) === JSON.stringify(lib[k])) delete o[k];
      o.L = 1;
    }
    if (!o.contexts || !o.contexts.length) delete o.contexts;
    if (!o.note) delete o.note;
    if (!o.image) delete o.image;
    if (!o.audio) delete o.audio;
    return o;
  }
  function fat(o) {
    const lib = o.L ? IELTS_DATA.INDEX[o.word.toLowerCase()] : null;
    const c = { ...Cards.make(lib || o), ...o };
    delete c.L;
    c.contexts = c.contexts || [];
    return c;
  }
  const hash = str => { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return h + ':' + str.length; };
  let sentHashes = {};

  // ---------- Nén dữ liệu đồng bộ (gzip trong trình duyệt) → giảm 3–5 lần dung lượng lưu trên cloud ----------
  const canGz = typeof CompressionStream !== 'undefined';
  async function gz(str) {
    if (!canGz) return null;
    const buf = await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  async function gunz(b64) {
    const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  }
  const docText = async d => !d ? '' : d.z ? gunz(d.z) : (d.json || '');
  const docBody = async json => { const z = await gz(json); return z && z.length < json.length ? { z } : { json }; };

  async function pullMerge() {
    setStatus('syncing');
    try {
      if (App.need) await App.need('words', 'tsl').catch(() => {});
      // 1 lượt gọi: máy chủ chỉ trả meta + các gói thẻ đã thay đổi kể từ lần đồng bộ trước
      if (Date.now() < await Store.get('syncPausedUntil', 0)) return setStatus('ok', t('Đồng bộ tạm nghỉ – dữ liệu vẫn trên máy.'));
      const pulled = (await Store.get('pulledHashes', {}))[Sync.user.uid] || {};
      const docs = (await api({ op: 'pull', have: pulled })).docs || {};
      const hs = (docs.meta && docs.meta.hs) || {};
      // Đăng nhập tài khoản khác với lần trước → hỏi trước khi gộp dữ liệu trên máy vào
      const lastUid = await Store.get('lastUid', '');
      if (lastUid && lastUid !== Sync.user.uid && Object.keys(await Cards.all()).length) {
        const keep = confirm(t('Máy này đang có dữ liệu học của tài khoản khác.\n\nOK = gộp dữ liệu trên máy vào tài khoản này\nHủy = chỉ dùng dữ liệu của tài khoản này'));
        if (!keep) { await Store.set('cards', {}); await Store.set('stats', { days: {}, newToday: { day: '', n: 0 } }); await Store.set('game', null); await Store.set('deleted', {}); }
      }
      await Store.set('lastUid', Sync.user.uid);
      const local = { cards: await Cards.all(), stats: await Core.Stats.get(), game: await Game.get(), settings: await Store.get('settings', {}), deleted: await Store.get('deleted', {}) };
      if (docs.meta) {
        let remoteCards = {};
        for (let i = 0; i < (docs.meta.chunks || 0); i++) {
          const k = 'cards_' + i;
          if (!docs[k]) { if (hs[k]) sentHashes[k] = hs[k]; continue; } // gói không đổi: máy này đã có
          const txt = await docText(docs[k]);
          const part = JSON.parse(txt || '{}');
          for (const [w, v] of Object.entries(part)) remoteCards[w] = fat(v);
          sentHashes[k] = hash(txt);
        }
        const remote = JSON.parse((await docText(docs.meta)) || '{}');
        const deleted = Object.assign(Object.create(null), remote.deleted || {});
        for (const [k, t] of Object.entries(local.deleted)) deleted[k] = Math.max(deleted[k] || 0, t);
        pruneDel(deleted);
        await Store.set('deleted', deleted);
        await Cards.save(mergeCards(local.cards, remoteCards, deleted));
        await Store.set('stats', mergeStats(local.stats, remote.stats || { days: {} }));
        await Store.set('game', mergeGame(local.game, remote.game));
        // Cài đặt: ưu tiên bản mới sửa gần nhất
        if (remote.settings && (remote.settingsAt || 0) > (await Store.get('settingsAt', 0))) { await Store.set('settings', remote.settings); await Store.set('settingsAt', remote.settingsAt); }
        await syncExtension();
        await App.load();
        // Chỉ vẽ lại các trang tổng quan – không làm gián đoạn bài ôn/luyện đang làm
        if (/^#\/(home|deck|library|stats|settings|path)?(\?|$)/.test(location.hash || '#/')) App.route();
      }
      if (!docs.meta) { await syncExtension(); await App.load(); }
      if (docs.meta && docs.meta.hs) { const all = await Store.get('pulledHashes', {}); all[Sync.user.uid] = docs.meta.hs; await Store.set('pulledHashes', all); }
      await push();
      toast(docs.meta ? '☁️ ' + (extReady ? t('Đã đồng bộ dữ liệu học (kể cả add-on)') : t('Đã đồng bộ dữ liệu học')) : '☁️ ' + t('Đã sao lưu dữ liệu lên tài khoản'));
    } catch (e) {
      if (e && (e.code === 'resource-exhausted' || /quota/i.test(e.message || ''))) { await Store.set('syncPausedUntil', Date.now() + 6 * 3600e3); setStatus('ok', t('Đồng bộ tạm nghỉ – dữ liệu vẫn trên máy.')); return; }
      console.warn('sync', e); setStatus('error', e.message);
    }
  }

  async function push() {
    if (!Sync.user || !db) return;
    if (Date.now() < await Store.get('syncPausedUntil', 0)) return;
    setStatus('syncing');
    try {
      const cards = await Cards.all();
      const keys = Object.keys(cards).sort();
      // 32 nhóm CỐ ĐỊNH theo mã băm của từ (không cắt theo thứ tự chữ cái): thêm/sửa 1 từ chỉ đổi đúng 1 nhóm → chỉ 1 lượt ghi D1
      const chunks = NB, parts = Array.from({ length: NB }, () => ({}));
      keys.forEach(k => { parts[bucketOf(k)][k] = slim(cards[k]); });
      const out = {};
      const pending = {};
      let writes = 0;
      for (let i = 0; i < chunks; i++) {
        const part = parts[i];
        const json = JSON.stringify(part), h = hash(json);
        if (sentHashes['cards_' + i] === h) continue;
        if (json.length > 900000) console.warn('chunk lớn', i, json.length);
        out['cards_' + i] = { h, body: JSON.stringify(await docBody(json)) }; pending['cards_' + i] = h; writes++;
      }
      const hs = {}; for (let i = 0; i < chunks; i++) hs['cards_' + i] = pending['cards_' + i] || sentHashes['cards_' + i] || '';
      const game = await Game.get();
      const meta = JSON.stringify({ stats: await Core.Stats.get(), game: { ...game, questsDone: {} }, settings: await Store.get('settings', {}), settingsAt: await Store.get('settingsAt', 0), deleted: pruneDel(await Store.get('deleted', {})) });
      const mh = hash(meta + chunks);
      if (sentHashes.meta !== mh || writes) { out.meta = { h: mh, body: JSON.stringify({ chunks, updated: Date.now(), hs, ...(await docBody(meta)) }) }; pending.meta = mh; writes++; }
      if (writes) await api({ op: 'push', docs: out });
      // Ghi nhớ trạng thái đã khớp với cloud → lần sau chỉ tải gói thay đổi
      if (writes) { const all = await Store.get('pulledHashes', {}); all[Sync.user.uid] = hs; await Store.set('pulledHashes', all); }
      if (extReady) { extCall('set', { cards: await Cards.all(), deleted: await Store.get('deleted', {}), stats: await Core.Stats.get() }); extCall('linked', { email: Sync.user.email, name: Sync.user.displayName || '' }); }
      Object.assign(sentHashes, pending); // chỉ ghi nhận "đã gửi" khi commit thành công
      dirty = false;
      Sync.lastSync = Date.now();
      setStatus('ok');
    } catch (e) {
      // Hết hạn mức miễn phí trong ngày → tạm dừng đồng bộ đến hôm sau; dữ liệu vẫn an toàn trên máy
      if (e && (e.code === 'resource-exhausted' || /quota/i.test(e.message || ''))) { await Store.set('syncPausedUntil', Date.now() + 6 * 3600e3); setStatus('ok', t('Đồng bộ tạm nghỉ vài giờ (máy chủ miễn phí đã đủ lượt hôm nay) – dữ liệu vẫn lưu trên máy và sẽ tự đồng bộ sau.')); return; }
      console.warn('push', e); setStatus('error', e.message);
    }
  }

  let dirty = false;
  Sync.schedule = () => {
    if (!Sync.user) return;
    dirty = true;
    if (timer) return;
    timer = setTimeout(() => { timer = null; if (dirty) push(); }, 180000); // tối đa 1 lần/3 phút + đẩy ngay khi rời trang
  };
  const flush = () => { if (Sync.user && dirty) { clearTimeout(timer); timer = null; push(); } };
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
  window.addEventListener('pagehide', flush);
  Sync.signIn = async () => {
    // Trong app gốc, Google chặn đăng nhập trong WebView → dùng đăng nhập gốc khi đã cấu hình (VBNative.signIn), chưa có thì giải thích rõ
    if (window.VBNative && VBNative.is) {
      if (VBNative.signIn) return VBNative.signIn();
      return UI.modal(`<h2>☁️ ${t('Đồng bộ tài khoản')}</h2><p>${t('Đăng nhập Google trong app sẽ có ở bản phát hành chính thức. Hiện tại dữ liệu học được lưu an toàn trên máy này; để đồng bộ giữa các thiết bị, hãy đăng nhập trên lexkite.com.')}</p>`);
    }
    try {
      await init();
      const p = new firebase.auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: 'select_account' });
      await firebase.auth().signInWithPopup(p);
    } catch (e) {
      if (e && e.code === 'auth/popup-blocked') return firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
      if (e && e.code !== 'auth/popup-closed-by-user') toast(t('Không đăng nhập được: {msg}', { msg: e.message || e }));
    }
  };
  // Mời đăng nhập khi đã có dữ liệu đáng giữ (≥ 10 thẻ) – tối đa 3 ngày nhắc 1 lần, không chặn việc học
  async function nudgeLogin() {
    const n = Object.keys(App.state.cards || {}).length, last = await Store.get('loginNudgeAt', 0);
    if (n < 10 || Date.now() - last < 3 * 864e5 || /welcome|mock|toeic-test|listen-test/.test(location.hash)) return;
    await Store.set('loginNudgeAt', Date.now());
    setTimeout(() => {
      if (Sync.user) return;
      UI.modal(`<div style="text-align:center"><div style="font-size:2.6rem">☁️</div><h2 style="margin:.3rem 0">${t('Bảo vệ {n} thẻ bạn đã học', { n })}</h2>
        <p class="muted">${t('Dữ liệu đang chỉ nằm trên trình duyệt này. Đăng nhập Google để <b>sao lưu tự động</b> và <b>học tiếp trên máy khác, điện thoại, tiện ích Chrome</b> – cùng một tài khoản, không trùng lặp.')}</p>
        <div class="row center" style="margin-top:1rem"><button class="btn primary lg" id="nudgeIn">${t('Đăng nhập với Google')}</button><button class="btn ghost" data-close>${t('Để sau')}</button></div>
        <p class="tiny muted" style="margin-top:.6rem">${t('Miễn phí · chỉ lưu dữ liệu học của bạn · có thể đăng xuất bất cứ lúc nào')}</p></div>`);
      const b = document.getElementById('nudgeIn'); if (b) b.onclick = () => { UI.closeModal(); Sync.signIn(); };
    }, 4000);
  }
  Sync.signOut = async () => { await push(); sentHashes = {}; await firebase.auth().signOut(); toast(t('Đã đăng xuất – dữ liệu vẫn còn trên máy này')); };
  Sync.now = () => pullMerge();

  function setStatus(s, msg) { Sync.status = s; Sync.msg = msg || ''; render(); }

  // ---------- Giao diện trong Cài đặt ----------
  Sync.renderBox = el => { box = el; render(); };
  function render() {
    if (!box || !document.body.contains(box)) return;
    if (!supported) {
      box.innerHTML = Store.isExtension ? `<h2>☁️ ${t('Tài khoản & đồng bộ')}</h2><p class="muted small">${t('Tiện ích tự đồng bộ với tài khoản Google qua web app: mở <b>lexkite.com</b> và đăng nhập một lần – từ lưu bằng tiện ích sẽ tự gộp vào tài khoản (và ngược lại) mỗi khi bạn mở web app. Trên máy khác: cài tiện ích + đăng nhập cùng tài khoản trên web app là có đủ dữ liệu.')}</p><a class="btn primary" href="https://lexkite.com/#/settings" target="_blank" rel="noopener">☁️ ${t('Mở web app để đăng nhập & đồng bộ')}</a>`
        : `<h2>☁️ ${t('Tài khoản & đồng bộ')}</h2><p class="muted">${t('Đăng nhập và đồng bộ có trên bản web {link}.', { link: '<a href="https://lexkite.com" target="_blank" rel="noopener">lexkite.com</a>' })}</p>`;
      return;
    }
    const u = Sync.user;
    const st = { idle: '', syncing: '⏳ ' + t('Đang đồng bộ…'), ok: '✓ ' + t('Đã đồng bộ lúc {time}', { time: new Date(Sync.lastSync).toLocaleTimeString(window.I18N ? I18N.lang() : 'vi-VN') }), error: '⚠️ ' + t('Lỗi đồng bộ: {msg}', { msg: esc(Sync.msg) }) }[Sync.status];
    box.innerHTML = u ? `
      <div class="row between"><div class="row nowrap"><span class="avatar">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((u.displayName || u.email || '?')[0])}</span>
        <div><b>${esc(u.displayName || t('Bạn'))}</b><div class="small muted">${esc(u.email || '')}</div></div></div>
        <div class="row"><button class="btn sm" id="syncNow">🔄 ${t('Đồng bộ ngay')}</button><button class="btn sm ghost" id="signOut">${t('Đăng xuất')}</button></div></div>
      <div class="small muted">${st || t('Dữ liệu học được tự động sao lưu và đồng bộ giữa các thiết bị.')}</div>`
      : `<div class="row between"><div><h2 style="margin:0">☁️ ${t('Đăng nhập để không mất dữ liệu')}</h2><p class="muted small">${t('Sao lưu flashcard, XP, chuỗi ngày học và học tiếp trên mọi thiết bị.')}</p></div>
        <button class="btn primary" id="signIn"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> ${t('Đăng nhập với Google')}</button></div>
        ${st ? `<div class="small muted">${st}</div>` : ''}`;
    const q = s => box.querySelector(s);
    if (q('#signIn')) q('#signIn').onclick = Sync.signIn;
    if (q('#signOut')) q('#signOut').onclick = Sync.signOut;
    if (q('#syncNow')) q('#syncNow').onclick = Sync.now;
  }

  // Khởi động trễ để không chặn giao diện
  if (supported) setTimeout(() => init().catch(e => console.warn('firebase', e)), 1200);
})();
