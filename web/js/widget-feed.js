/* 📱 Widget "Từ mỗi giờ" (Word of the hour) – CHỈ app gốc (VBNative.is), tải lười gói 'wfeed' (native.js gọi khi mở app / quay lại app /
 * sau phiên ôn / sau đồng bộ; Cài đặt → Nhắc học vẽ khối cài đặt). Chọn ~48 từ: thẻ SRS đến hạn → đang học → thẻ mới của người học
 * → từ mới đúng trình độ/mục tiêu (kho từ sẵn có), rồi đẩy sang plugin nội bộ WordWidget (iOS App Group + WidgetKit, Android SharedPreferences
 * + AppWidget). Widget tự đổi từ theo nhịp đã chọn trong khung giờ hoạt động, KHÔNG gửi thông báo, không gọi mạng.
 * Nghĩa theo ngôn ngữ giao diện (App.meanOf – gói nghĩa bản địa). Không gọi t() lúc nạp module. */
(function (g) {
  'use strict';
  const t = (k, v) => (g.t ? g.t(k, v) : k);
  const DAY = 864e5, N = 48, CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const INTERVALS = [30, 60, 120, 180];
  const DEF = { intervalMin: 60, startHour: 7, endHour: 22, showMean: true };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clip = (s, n) => { s = String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trim() + '…' : s; };

  /** Cấu hình đã chuẩn hóa (settings.wordWidget) */
  function conf(settings) {
    const c = { ...DEF, ...((settings && settings.wordWidget) || {}) };
    if (!INTERVALS.includes(+c.intervalMin)) c.intervalMin = DEF.intervalMin;
    c.intervalMin = +c.intervalMin;
    c.startHour = Math.min(23, Math.max(0, Math.round(+c.startHour)));
    c.endHour = Math.min(24, Math.max(1, Math.round(+c.endHour)));
    if (!Number.isFinite(c.startHour)) c.startHour = DEF.startHour;
    if (!Number.isFinite(c.endHour)) c.endHour = DEF.endHour;
    c.showMean = c.showMean !== false;
    return c;
  }

  /** Trình độ CEFR mục tiêu (chỉ số 0..5): mục tiêu "general" → kiểm tra đầu vào → band IELTS mục tiêu → mặc định B1 */
  function cefrIndex(settings) {
    const s = settings || {}, goal = s.goal || {}, idx = x => CEFR.indexOf(String(x || '').toUpperCase().slice(0, 2));
    if (goal.exam === 'general' && +goal.target >= 1) return Math.min(5, +goal.target - 1);
    const pl = s.placement || {};
    if (idx(pl.vCefr) >= 0) return idx(pl.vCefr);
    const band = parseFloat(goal.target || s.examTarget);
    if ((!goal.exam || goal.exam === 'ielts') && band >= 3 && band <= 9) return band < 5.5 ? 2 : band < 7 ? 3 : 4;
    return 2;
  }

  // Xáo trộn ổn định theo hạt giống (mỗi ngày một bộ từ mới khác, cùng ngày thì giữ nguyên)
  function shuffle(arr, seed) {
    const a = arr.slice(); let x = (seed >>> 0) || 1;
    for (let i = a.length - 1; i > 0; i--) { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; const j = (x >>> 0) % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /**
   * Chọn từ cho widget (hàm thuần – kiểm bằng scripts/test/unit.mjs).
   * @param {{cards?: object[], pool?: object[], level?: number, now?: number, n?: number}} o
   * @returns {object[]} thẻ/từ theo thứ tự ưu tiên: đến hạn → đang học → thẻ mới của người học → từ mới đúng trình độ
   */
  function pickWords(o) {
    const now = o.now || Date.now(), n = o.n || N, lv = o.level == null ? 2 : o.level;
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const cards = (o.cards || []).filter(c => c && c.word && c.srs);
    const seen = new Set(), out = [];
    const add = list => { for (const c of list) { const k = String(c.word).toLowerCase().trim(); if (!k || seen.has(k)) continue; seen.add(k); out.push(c); if (out.length >= n) return true; } return false; };
    const reviewed = c => c.srs.reps > 0 || !!c.srs.last;
    const due = cards.filter(c => reviewed(c) && c.srs.due <= end.getTime()).sort((a, b) => a.srs.due - b.srs.due);
    const learning = cards.filter(c => reviewed(c) && c.srs.due > end.getTime() && ((c.srs.interval || 0) < 21 || c.srs.lapses > 0)).sort((a, b) => a.srs.due - b.srs.due);
    const fresh = cards.filter(c => !reviewed(c)).sort((a, b) => (a.added || 0) - (b.added || 0));
    if (add(due) || add(learning) || add(fresh)) return out;
    const owned = new Set(cards.map(c => String(c.word).toLowerCase()));
    const pool = (o.pool || []).filter(w => w && w.word && !owned.has(String(w.word).toLowerCase()) && !/\s{2,}/.test(w.word));
    const at = w => CEFR.indexOf(String(w.level || '').toUpperCase().slice(0, 2));
    const seed = Math.floor(now / DAY);
    const tiers = [w => at(w) === lv || at(w) === lv + 1, w => at(w) === lv - 1 || at(w) === lv + 2, () => true];
    for (const f of tiers) if (add(shuffle(pool.filter(f), seed))) break;
    return out;
  }

  /** Mục cho widget: { w, ipa, mean, ex, id } – nghĩa theo ngôn ngữ giao diện */
  function toItem(c, settings, meanOf) {
    const us = settings && settings.accent === 'en-US';
    return { w: c.word, ipa: (us ? c.ipaUS || c.ipa : c.ipa || c.ipaUS) || '', mean: clip(meanOf(c), 80), ex: clip(c.ex, 120), id: String(c.word).toLowerCase() };
  }

  /** Dữ liệu gửi cho plugin (hàm thuần) */
  function payload(state, pool, meanOf, now) {
    const s = (state && state.settings) || {}, c = conf(s);
    const words = pickWords({ cards: Object.values((state && state.cards) || {}), pool, level: cefrIndex(s), now });
    return {
      items: words.map(w => toItem(w, s, meanOf)),
      intervalMin: c.intervalMin, startHour: c.startHour, endHour: c.endHour, showMean: c.showMean,
      rtl: !!(g.I18N && g.I18N.rtl), lang: g.I18N ? g.I18N.lang() : 'vi',
      l: { title: t('Từ mỗi giờ'), tap: t('Chạm để xem nghĩa') },
    };
  }

  const plugin = () => { const C = g.Capacitor; return C && C.Plugins && C.Plugins.WordWidget; };
  let last = '', busy = null;
  /** Đẩy danh sách từ sang widget (bỏ qua nếu không đổi). Gọi nhiều lần liên tiếp → gộp. */
  function push(state) {
    const P = plugin(), A = g.App;
    if (!P || !state || !g.VBNative || !g.VBNative.is) return Promise.resolve(false);
    if (busy) return busy;
    busy = (async () => {
      try {
        if (A && A.need) await A.need('words').catch(() => {}); // kho từ đầy đủ (nằm sẵn trong gói cài đặt)
        if (A && A.loadPack) await A.loadPack().catch(() => {}); // nghĩa tiếng mẹ đẻ dịch sẵn
        const D = g.IELTS_DATA, pool = D && D.TOPICS ? D.TOPICS.flatMap(x => x.words || []) : [];
        const meanOf = A && A.meanOf ? A.meanOf : (x => x.def || '');
        const p = payload(state, pool, meanOf, Date.now()), key = JSON.stringify(p);
        if (key === last) return false;
        await P.setWords(p); last = key; return true;
      } catch (e) { return false; } finally { setTimeout(() => { busy = null; }, 0); }
    })();
    return busy;
  }

  /** Khối cài đặt trong Cài đặt → Nhắc học (chỉ app gốc) */
  function settings(box, state, save) {
    if (!box || !state) return;
    const s = state.settings, c = conf(s), ios = g.VBNative && g.VBNative.platform === 'ios';
    const hh = h => String(h).padStart(2, '0') + ':00';
    const opt = (v, label, cur) => `<option value="${v}" ${+cur === v ? 'selected' : ''}>${label}</option>`;
    const ivLabel = m => (m === 30 ? t('30 phút') : m === 60 ? t('1 giờ') : t('{n} giờ', { n: m / 60 }));
    box.innerHTML = `<div class="set-row col ww-head"><span class="set-l"><span>📱 ${t('Widget Từ mỗi giờ')}</span><small>${t('Một từ trên màn hình khóa và màn hình chính, tự đổi theo nhịp bạn chọn. Không gửi thông báo.')}</small></span></div>
      <div class="set-row"><div class="set-l"><span>${t('Đổi từ mỗi')}</span></div><div class="set-c"><select class="input" id="wwIv" aria-label="${esc(t('Đổi từ mỗi'))}">${INTERVALS.map(m => opt(m, ivLabel(m), c.intervalMin)).join('')}</select></div></div>
      <div class="set-row"><div class="set-l"><span>${t('Giờ hoạt động')}</span><small>${t('Ngoài khung giờ này widget giữ nguyên từ cuối cùng.')}</small></div><div class="set-c"><span class="set-btns"><select class="input" id="wwS" aria-label="${esc(t('Giờ hoạt động'))}">${Array.from({ length: 24 }, (_, h) => opt(h, hh(h), c.startHour)).join('')}</select><span class="muted">${t('đến')}</span><select class="input" id="wwE" aria-label="${esc(t('Giờ hoạt động'))}">${Array.from({ length: 24 }, (_, i) => opt(i + 1, hh(i + 1), c.endHour)).join('')}</select></span></div></div>
      <label class="set-row switch"><span class="set-l"><span>${t('Hiện nghĩa')}</span><small>${t('Tắt = chế độ đố: widget chỉ hiện từ, chạm vào để xem nghĩa trong app.')}</small></span><input type="checkbox" id="wwMean" ${c.showMean ? 'checked' : ''}></label>
      <details class="set-row col ww-help"><summary>${t('Cách thêm widget')}</summary><p class="small">${ios
        ? t('iPhone: chạm và giữ màn hình chính → nút + → tìm Lexkite → chọn “Từ mỗi giờ”. Màn hình khóa: chạm và giữ màn hình khóa → Tùy chỉnh → Màn hình khóa → chạm vào ô tiện ích → chọn Lexkite.')
        : t('Android: chạm và giữ màn hình chính → Tiện ích → Lexkite → kéo “Từ mỗi giờ” ra màn hình. Chạm và giữ widget để đổi kích thước.')}</p></details>`;
    const q = sel => box.querySelector(sel);
    const upd = patch => { s.wordWidget = { ...conf(s), ...patch }; Promise.resolve(save && save()).then(() => push(state)); };
    q('#wwIv').onchange = e => upd({ intervalMin: +e.target.value });
    q('#wwS').onchange = e => upd({ startHour: +e.target.value });
    q('#wwE').onchange = e => upd({ endHour: +e.target.value });
    q('#wwMean').onchange = e => upd({ showMean: e.target.checked });
  }

  g.WidgetFeed = { pickWords, cefrIndex, conf, payload, toItem, push, settings, N };
})(typeof self !== 'undefined' ? self : this);
