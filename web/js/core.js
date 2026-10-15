/* Lõi dùng chung cho web app, trang add-on và background service worker.
 * Không đụng tới DOM để có thể chạy bằng importScripts().
 */
(function (g) {
  const t = (typeof self !== 'undefined' && self.t) || ((s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s));
  // ---------- Storage: chrome.storage.local trong add-on, localStorage trên web ----------
  const hasChrome = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && !(typeof location !== 'undefined' && /[?&]sandbox=1/.test(location.search));
  // ?sandbox=1 → dữ liệu thử nghiệm tách riêng, không đụng dữ liệu học thật (dùng khi kiểm thử)
  const SANDBOX = typeof location !== 'undefined' && /[?&]sandbox=1/.test(location.search);
  const PREFIX = SANDBOX ? 'sbx.' : 'ielts.';

  // Dữ liệu lớn (flashcard) trên web: IndexedDB (dung lượng hàng GB) thay vì localStorage (~5MB) → người học chăm không bị
  // "đầy bộ nhớ" âm thầm. Tự chuyển dữ liệu cũ sang lần đầu; trình duyệt không có IndexedDB → vẫn dùng localStorage.
  const BIG = new Set(['cards']);
  let dbp = null;
  const idb = () => dbp || (dbp = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('no-idb'));
    const rq = indexedDB.open('vocaband', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('kv');
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); rq.onblocked = () => rej(new Error('blocked'));
  }));
  const idbDo = (mode, fn) => idb().then(db => new Promise((res, rej) => { const tx = db.transaction('kv', mode), r = fn(tx.objectStore('kv')); tx.oncomplete = () => res(r && r.result); tx.onerror = tx.onabort = () => rej(tx.error); }));
  const bigGet = async key => {
    let v = await idbDo('readonly', st => st.get(PREFIX + key));
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) { // chuyển từ localStorage (lần đầu, hoặc tab bản cũ vừa ghi): gộp, giữ bản sửa mới nhất của từng thẻ
      const old = JSON.parse(raw);
      if (v && typeof v === 'object' && old && typeof old === 'object') { for (const [k, c] of Object.entries(old)) if (!v[k] || ((c && c.mod) || 0) > ((v[k] && v[k].mod) || 0)) v[k] = c; } else v = old;
      await idbDo('readwrite', st => st.put(v, PREFIX + key)); localStorage.removeItem(PREFIX + key);
    }
    return v;
  };
  const Store = {
    async get(key, fallback) {
      try {
        if (hasChrome) {
          const r = await chrome.storage.local.get(key);
          return r[key] !== undefined ? r[key] : fallback;
        }
        if (BIG.has(key)) { try { const v = await bigGet(key); return v !== undefined ? v : fallback; } catch (e) { /* không có IndexedDB → localStorage */ } }
        const raw = localStorage.getItem(PREFIX + key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    },
    async remove(key) {
      if (hasChrome) return chrome.storage.local.remove(key);
      if (BIG.has(key)) await idbDo('readwrite', st => st.delete(PREFIX + key)).catch(() => {});
      localStorage.removeItem(PREFIX + key);
    },
    async set(key, value) {
      if (hasChrome) return chrome.storage.local.set({ [key]: value });
      if (BIG.has(key)) { try { await idbDo('readwrite', st => st.put(value, PREFIX + key)); localStorage.removeItem(PREFIX + key); return; } catch (e) { /* không có IndexedDB → localStorage */ } }
      try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); }
      catch (e) {
        // Hết dung lượng: xóa bộ nhớ đệm từ điển (có thể tra lại) rồi thử lần nữa
        Object.keys(localStorage).filter(k => k.startsWith(PREFIX + 'dc')).forEach(k => localStorage.removeItem(k));
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      }
    },
    isExtension: !!hasChrome,
    sandbox: SANDBOX,
  };

  const DEFAULT_SETTINGS = {
    reminderOn: true,
    reminderTime: '20:00',
    dailyNew: 10,
    dailyGoal: 20,
    accent: 'en-GB',
    autoSpeak: true,
    goldenOn: true,       // nhắc "thời điểm vàng" khi có đủ từ sắp quên
    goldenMin: 10,        // số từ tối thiểu để nhắc
    quietStart: '22:30',  // giờ yên lặng
    quietEnd: '07:00',
    sessionCap: 50,       // tối đa thẻ mỗi phiên ôn (0 = không giới hạn)
  };

  // ---------- Ngày tháng ----------
  const DAY = 86400000;
  const todayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const endOfToday = () => startOfToday() + DAY - 1;

  // ---------- SRS: FSRS-5 (Free Spaced Repetition Scheduler – thuật toán Anki dùng từ 2023) + bước học ----------
  // grade: 0 = Quên, 1 = Khó, 2 = Nhớ, 3 = Dễ  (FSRS: Again/Hard/Good/Easy = 1..4)
  // Mỗi thẻ có độ ổn định S (số ngày để khả năng nhớ giảm còn 90%) và độ khó D (1–10).
  // Khả năng nhớ R(t) = (1 + 19/81 · t/S)^-0.5 → ôn đúng lúc R chạm mức mục tiêu (mặc định 90%).
  // Thẻ mới/quên vẫn đi qua bước 1 phút → 10 phút trước khi xếp lịch theo ngày.
  const MIN = 60 * 1000;
  const W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  const DECAY = -0.5, FACTOR = 19 / 81, MAX_IVL = 3650;
  const clampD = d => Math.min(10, Math.max(1, d));
  const F = {
    R: (t, S) => Math.pow(1 + FACTOR * t / S, DECAY),
    ivl: (S, r) => S / FACTOR * (Math.pow(r, 1 / DECAY) - 1),
    S0: G => W[G - 1],
    D0: G => clampD(W[4] - Math.exp(W[5] * (G - 1)) + 1),
    nextD(D, G) { const d1 = D + (-W[6] * (G - 3)) * (10 - D) / 9; return clampD(W[7] * F.D0(4) + (1 - W[7]) * d1); },
    recallS(D, S, R, G) { return S * (Math.exp(W[8]) * (11 - D) * Math.pow(S, -W[9]) * (Math.exp(W[10] * (1 - R)) - 1) * (G === 2 ? W[15] : 1) * (G === 4 ? W[16] : 1) + 1); },
    forgetS(D, S, R) { return Math.min(S, W[11] * Math.pow(D, -W[12]) * (Math.pow(S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R))); },
    shortS: (S, G) => S * Math.exp(W[17] * (G - 3 + W[18])),
  };
  // Thẻ cũ (SM-2) → ước lượng S, D từ khoảng cách và hệ số dễ
  const ensureFsrs = s => {
    if (s.S != null && s.D != null) return s;
    if (s.reps > 0) { s.S = Math.max(0.5, s.interval || 1); s.D = clampD(10 - ((s.ef || 2.5) - 1.3) * 5); }
    return s;
  };
  const SRS = {
    retentionTarget: 0.9, // khả năng nhớ mục tiêu khi đến hạn (0.8–0.95), chỉnh trong Cài đặt
    newState: () => ({ ef: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now(), last: null, step: 0 }),

    isLearning: s => s.reps === 0,

    // Khoảng cách (ngày) cho Khó/Nhớ/Dễ của thẻ đang ôn theo ngày, đảm bảo Khó ≤ Nhớ < Dễ
    _reviewIvls(s, now) {
      const t = Math.max(0, (now - (s.last || now)) / DAY), R = F.R(t, s.S), r = SRS.retentionTarget;
      const out = {};
      [2, 3, 4].forEach(G => { const S = F.recallS(s.D, s.S, R, G); out[G] = { S, ivl: Math.min(MAX_IVL, Math.max(1, Math.round(F.ivl(S, r)))) }; });
      out[2].ivl = Math.min(out[2].ivl, out[3].ivl);
      out[3].ivl = Math.max(out[3].ivl, out[2].ivl + 1);
      out[4].ivl = Math.max(out[4].ivl, out[3].ivl + 1);
      return out;
    },

    review(s, grade, now = Date.now(), noFuzz) {
      s = ensureFsrs({ step: 0, ...s });
      const G = grade + 1, r = SRS.retentionTarget;
      const toDay = days => {
        // giãn ngẫu nhiên ±5% để các thẻ không dồn cùng một ngày
        const fuzz = days >= 3 && !noFuzz ? Math.round(days * (Math.random() * 0.1 - 0.05)) : 0;
        s.interval = Math.min(MAX_IVL, Math.max(1, days + fuzz));
        const d = new Date(now); d.setHours(4, 0, 0, 0);
        s.due = d.getTime() + s.interval * DAY;
      };
      if (s.reps === 0) {
        // Đang học / học lại: lần đầu khởi tạo S, D; các lần trong ngày dùng công thức ngắn hạn
        if (s.S == null) { s.S = F.S0(G); s.D = F.D0(G); }
        else if (s.last) { s.S = Math.max(0.1, F.shortS(s.S, G)); s.D = F.nextD(s.D, G); }
        if (grade === 0) { s.step = 0; s.due = now + MIN; }
        else if (grade === 1) { s.due = now + (s.step === 0 ? 6 : 10) * MIN; }
        else if (grade === 2 && s.step === 0) { s.step = 1; s.due = now + 10 * MIN; }
        else { s.reps = 1; s.step = 0; toDay(Math.max(grade === 3 ? 2 : 1, Math.round(F.ivl(s.S, r)))); }
      } else if (grade === 0) {
        // Quên → giảm độ ổn định theo FSRS, về bước học lại
        const t = Math.max(0, (now - (s.last || now)) / DAY);
        s.S = Math.max(0.1, F.forgetS(s.D, s.S, F.R(t, s.S))); s.D = F.nextD(s.D, G);
        s.lapses += 1; s.reps = 0; s.step = 0; s.interval = 0;
        s.due = now + MIN;
      } else {
        const iv = SRS._reviewIvls(s, now)[G];
        s.S = iv.S; s.D = F.nextD(s.D, G);
        toDay(iv.ivl);
        s.reps += 1;
      }
      s.S = Math.round(s.S * 1000) / 1000; s.D = Math.round(s.D * 1000) / 1000;
      s.last = now;
      return s;
    },

    preview(s, grade) {
      if (s.reps === 0) {
        if (grade === 0) return t('{n} phút', { n: 1 });
        if (grade === 1) return (s.step || 0) === 0 ? t('{n} phút', { n: 6 }) : t('{n} phút', { n: 10 });
        if (grade === 2 && !(s.step > 0)) return t('{n} phút', { n: 10 });
      } else if (grade === 0) return t('{n} phút', { n: 1 });
      const n = SRS.review({ ...s }, grade, Date.now(), true);
      const d = Math.round((n.due - Date.now()) / DAY);
      return d <= 1 ? t('1 ngày') : d < 30 ? t('{n} ngày', { n: d }) : d < 365 ? t('{n} tháng', { n: Math.round(d / 30) }) : t('{n} năm', { n: (d / 365).toFixed(1) });
    },

    // Khả năng còn nhớ lúc này theo đường cong quên lãng của FSRS
    retention(s, now = Date.now()) {
      if (!s || !s.last) return null;
      if (s.reps === 0) return Math.max(0.3, 0.9 ** ((now - s.last) / (10 * MIN)));
      const t = Math.max(0, (now - s.last) / DAY);
      if (s.S != null) return F.R(t, s.S);
      return Math.pow(0.9, t / Math.max(1, s.interval));
    },
    F,

    // 5 cấp độ nhớ (kiểu MochiVocab): 1 < 1 ngày · 2 ≤ 3 ngày · 3 ≤ 10 ngày · 4 ≤ 30 ngày · 5 > 30 ngày; 0 = chưa học
    level5(s) {
      if (!s || !s.last) return 0;
      if (s.reps === 0) return 1;
      return s.interval <= 3 ? 2 : s.interval <= 10 ? 3 : s.interval <= 30 ? 4 : 5;
    },

    // Mức thuộc: 0 mới, 1 đang học, 2 quen, 3 thuộc
    mastery(s) {
      if (!s || s.reps === 0) return s && s.last ? 1 : 0;
      if (s.interval >= 21) return 3;
      if (s.interval >= 4) return 2;
      return 1;
    },
  };

  // ---------- Thẻ ----------
  // Ghi tuần tự để các thao tác đọc-sửa-ghi không đè nhau
  let cardLock = Promise.resolve();
  const serial = fn => (cardLock = cardLock.then(fn, fn));
  // Khóa duy nhất cho mỗi từ/cụm: chữ thường, gộp khoảng trắng, dấu nháy thẳng → không trùng lặp
  const keyOf = w => String(w || '').toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, ' ').trim();
  const activityOf = c => Math.max((c.srs && c.srs.last) || 0, c.mod || 0, c.added || 0);
  function normalize(map) {
    map = Object.assign(Object.create(null), map || {}); // không kế thừa prototype: thẻ "constructor", "toString"… không bị nhầm
    for (const [k, c] of Object.entries(map || {})) {
      if (!c || !c.word) { delete map[k]; continue; }
      const nk = keyOf(c.word);
      if (nk !== k) {
        // gộp bản trùng: giữ bản hoạt động gần nhất, hợp nhất ngữ cảnh
        const other = map[nk];
        delete map[k];
        if (other && activityOf(other) >= activityOf(c)) { other.contexts = [...(other.contexts || []), ...(c.contexts || []).filter(x => !(other.contexts || []).some(y => y.text === x.text))].slice(0, 5); continue; }
        if (other) c.contexts = [...(c.contexts || []), ...(other.contexts || []).filter(x => !(c.contexts || []).some(y => y.text === x.text))].slice(0, 5);
        map[nk] = c;
      }
      c.contexts = Array.isArray(c.contexts) ? c.contexts : [];
      c.col = Array.isArray(c.col) ? c.col : [];
      c.syn = Array.isArray(c.syn) ? c.syn : [];
      c.sentences = Array.isArray(c.sentences) ? c.sentences : [];
      c.srs = { ...SRS.newState(), ...(c.srs || {}) };
      if (!c.added) c.added = Date.now();
      // Ảnh cũ từ Wikipedia không rõ giấy phép → bỏ, dùng emoji cho tới khi tra lại ảnh có giấy phép
      if (c.image && !c.imageCredit && /wikipedia|wikimedia/.test(c.image)) c.image = '';
    }
    return map;
  }
  const Cards = {
    async all() { return normalize(await Store.get('cards', {})); },
    async save(map) { return serial(() => Store.set('cards', normalize(map))); },

    make(entry, extra = {}) {
      return {
        word: entry.word,
        ipa: entry.ipa || '',
        ipaUS: entry.ipaUS || '',
        pos: entry.pos || '',
        vi: entry.vi || '',
        def: entry.def || '',
        ex: entry.ex || '',
        col: entry.col || [],
        syn: entry.syn || [],
        level: entry.level || '',
        topic: entry.topic || 'mine',
        emoji: entry.emoji || '📘',
        image: entry.image || '',
        imageCredit: entry.imageCredit || null,
        audio: entry.audio || '',
        sentences: (entry.sentences || []).slice(0, 2), // câu song ngữ [{en, vi}]
        contexts: [],          // [{text, vi, source, title, at}]
        note: '',
        added: Date.now(),
        srs: SRS.newState(),
        ...extra,
      };
    },

    // Thêm/gộp một thẻ. context = {text, source, title}
    add(entry, context) { return serial(() => Cards._add(entry, context)); },
    async _add(entry, context) {
      const map = await Cards.all();
      const key = keyOf(entry.word);
      let card = map[key];
      if (!card) card = Cards.make(entry);
      else {
        // bổ sung trường còn trống
        if (!card.image && entry.image) card.imageCredit = entry.imageCredit || null;
        for (const k of ['ipa', 'ipaUS', 'pos', 'vi', 'def', 'ex', 'image', 'audio', 'level']) {
          if (!card[k] && entry[k]) card[k] = entry[k];
        }
        if (!(card.sentences || []).length && entry.sentences) card.sentences = entry.sentences.slice(0, 2);
      }
      if (context && context.text && !card.contexts.some(c => c.text === context.text)) {
        card.contexts.unshift({ ...context, at: Date.now() });
        card.contexts = card.contexts.slice(0, 5);
      }
      card.mod = Date.now();
      map[key] = card;
      await Store.set('cards', map);
      const del = await Store.get('deleted', {});
      if (del[key]) { delete del[key]; await Store.set('deleted', del); }
      return card;
    },

    remove(word) {
      return serial(async () => {
        const map = await Cards.all();
        delete map[keyOf(word)];
        await Store.set('cards', map);
        // dấu xóa để đồng bộ không khôi phục lại thẻ đã xóa
        const del = await Store.get('deleted', {}); del[keyOf(word)] = Date.now(); const cut = Date.now() - 90 * DAY; for (const k in del) if (del[k] < cut) delete del[k]; await Store.set('deleted', del);
      });
    },

    update(card) {
      return serial(async () => {
        const map = await Cards.all();
        card.mod = Date.now();
        map[keyOf(card.word)] = card;
        await Store.set('cards', map);
      });
    },
    // Sửa một phần thẻ theo dữ liệu mới nhất (tránh ghi đè bằng bản cũ)
    patch(word, fn) {
      return serial(async () => {
        const map = await Cards.all();
        const c = map[keyOf(word)];
        if (!c) return null;
        fn(c); c.mod = Date.now();
        await Store.set('cards', map);
        return c;
      });
    },


    dueCount(map, settings, stats) {
      const list = Object.values(map);
      const end = endOfToday();
      const due = list.filter(c => c.srs.reps > 0 || c.srs.last ? c.srs.due <= end : false).length;
      const introduced = (stats && stats.newToday && stats.newToday.day === todayKey()) ? stats.newToday.n : 0;
      const newAvail = list.filter(c => c.srs.reps === 0 && !c.srs.last).length;
      const newCount = Math.min(newAvail, Math.max(0, (settings || DEFAULT_SETTINGS).dailyNew - introduced));
      return { due, newCount, total: due + newCount };
    },
  };

  // ---------- Thời điểm vàng ----------
  const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const Golden = {
    // Số thẻ đã đến hạn ôn ngay lúc này (kể cả thẻ đang ở bước học)
    dueNow(map, now = Date.now()) { return Object.values(map).filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= now).length; },
    // Mốc thời gian gần nhất có thẻ đến hạn trong tương lai
    next(map, now = Date.now()) {
      const t = Object.values(map).filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due > now).map(c => c.srs.due).sort((a, b) => a - b);
      if (!t.length) return null;
      return { at: t[0], count: t.filter(x => x <= t[0] + 3600 * 1000).length };
    },
    quiet(settings, d = new Date()) {
      const n = d.getHours() * 60 + d.getMinutes(), a = toMin(settings.quietStart), b = toMin(settings.quietEnd);
      return a <= b ? n >= a && n < b : n >= a || n < b;
    },
  };

  // ---------- Thống kê & chuỗi ngày ----------
  const Stats = {
    async get() { return Store.get('stats', { days: {}, newToday: { day: '', n: 0 } }); },
    async logReview(isNew) {
      const s = await Stats.get();
      const k = todayKey();
      s.days[k] = (s.days[k] || 0) + 1;
      const ks = Object.keys(s.days).sort(); while (ks.length > 400) delete s.days[ks.shift()];
      if (isNew) {
        if (s.newToday.day !== k) s.newToday = { day: k, n: 0 };
        s.newToday.n += 1;
      }
      await Store.set('stats', s);
      return s;
    },
    streak(s) {
      let n = 0;
      const d = new Date();
      if (!s.days[todayKey(d)]) d.setDate(d.getDate() - 1); // hôm nay chưa học vẫn giữ chuỗi
      while (s.days[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
  };

  g.Core = { keyOf, Golden, Store, SRS, Cards, Stats, DEFAULT_SETTINGS, todayKey, startOfToday, endOfToday, DAY };
})(typeof self !== 'undefined' ? self : this);
