/* 🧩 Phản hồi mỗi lượt nói/viết (docs/specs/ai-speaking-first.md §3, việc T2 + T12) – logic thuần, không tự gọi mạng (test: scripts/test/feedback-turn.mjs).
 * Feedback.turn(src, q)  → null (câu ổn) | { src, good, ops[], items[], tier:'local', srs } – chạy TRÊN MÁY bằng bộ luật CallEngine.correct, < 5 ms.
 *   ops = diff theo từ: ['=', w] · ['-', w] · ['+', w] · ['~', cũ, mới] → tô gạch/tô đậm TỪNG chỗ sửa (luật là engine "edit": không khoe cả câu như câu chuẩn).
 *   items = mỗi lỗi một mục: { id, name (công thức tiếng Anh), why (t(), ngôn ngữ giao diện), ok/bad (ví dụ đúng/sai), lesson (#/grammar/<id>) }.
 *   srs = { front, back } để đưa lỗi vào ôn FSRS (call.js: tổng kết buổi → App.addWord).
 * Feedback.engine({ net, timeoutMs }) → { run(src, q) → { local, upgrade: Promise } } (chủ 05/11: "trên máy, 100% free, KHÔNG lỗi, KHÔNG giới hạn"):
 *   local có NGAY; upgrade = local + phần nâng thêm từ gói AI miễn phí (net) nếu kịp. net lỗi / 429 hết quota / 5xx / quá giờ / offline / trả rác
 *   → upgrade = local, im lặng (không chữ "hết lượt", không màn lỗi); sau 429/5xx nghỉ gọi mạng một lúc để không dội máy chủ.
 * Feedback.card(fb, { compact }) → HTML một thẻ dùng chung (Call · Roleplay · luyện viết · add-on). */
(function (g) {
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Mỗi luật của CallEngine → cấu trúc + ví dụ + bài ngữ pháp (id bài có thật: test kiểm với web/js/grammar*). Lời giải thích lấy từ luật (đã qua t()).
  const META = {
    'be-agree': { name: 'S + agree (verb)', ok: 'I agree with you.', bad: 'I am agree with you.', lesson: 'stative-dynamic' },
    doesnt: { name: "he/she/it + doesn't + V", ok: "She doesn't like coffee.", bad: "She don't like coffee.", lesson: 'present-simple' },
    'modal-to': { name: 'can/should/will + V', ok: 'I can swim.', bad: 'I can to swim.', lesson: 'modals-ability-permission' },
    'more-er': { name: 'better / easier (no “more”)', ok: 'This one is better.', bad: 'This one is more better.', lesson: 'comparatives-superlatives' },
    uncount: { name: 'uncountable noun (no -s)', ok: 'I need some advice.', bad: 'I need some advices.', lesson: 'countable-uncountable' },
    'very-verb': { name: 'really + verb', ok: 'I really like it.', bad: 'I very like it.', lesson: 'adverbs-position' },
    'want-to': { name: 'want/need + to + V', ok: 'I want to go home.', bad: 'I want go home.', lesson: 'gerund-infinitive' },
    'article-job': { name: 'a/an + job', ok: "I'm a teacher.", bad: "I'm teacher.", lesson: 'articles' },
    sva: { name: 'he/she + V-s', ok: 'He works in a bank.', bad: 'He work in a bank.', lesson: 'present-simple' },
    'past-perfect': { name: 'yesterday/ago → past simple', ok: 'I saw it yesterday.', bad: 'I have seen it yesterday.', lesson: 'present-perfect' },
    past: { name: 'past simple: V-ed / V2', ok: 'I went to the beach.', bad: 'I go to the beach yesterday.', lesson: 'past-simple' },
    'past-s': { name: 'past simple: V-ed / V2', ok: 'It rained last night.', bad: 'It rains last night.', lesson: 'past-simple' },
  };

  // Diff theo từ (LCS), giữ nguyên chữ/dấu người học gõ; so khớp bỏ hoa thường + dấu câu đầu/cuối từ.
  const key = w => String(w).toLowerCase().replace(/[’‘`]/g, "'").replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, '');
  function diff(a, b) {
    const x = String(a || '').split(/\s+/).filter(Boolean), y = String(b || '').split(/\s+/).filter(Boolean), n = x.length, m = y.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = key(x[i]) === key(y[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (key(x[i]) === key(y[j])) { out.push(['=', y[j]]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) out.push(['-', x[i++]]); else out.push(['+', y[j++]]);
    }
    while (i < n) out.push(['-', x[i++]]);
    while (j < m) out.push(['+', y[j++]]);
    // gom "- cũ, + mới" liền nhau thành một chỗ thay ['~', cũ, mới] (đọc dễ hơn: go → went)
    const r = [];
    for (let k = 0; k < out.length; k++) {
      const a1 = out[k], b1 = out[k + 1];
      if (a1[0] === '-' && b1 && b1[0] === '+') { r.push(['~', a1[1], b1[1]]); k++; } else r.push(a1);
    }
    return r;
  }

  function item(id, why) {
    const m = META[id] || {};
    return { id, name: m.name || '', why: why || '', ok: m.ok || '', bad: m.bad || '', lesson: m.lesson || '' };
  }

  function turn(src, q) {
    const E = g.CallEngine; const s = String(src || '').trim();
    if (!E || !s) return null;
    let r = null; try { r = E.correct(s, q || ''); } catch (e) { r = null; } // luật hỏng không bao giờ làm mất lượt
    if (!r) return null;
    const seen = {}, items = [];
    (r.ids || []).forEach((id, k) => { if (seen[id]) return; seen[id] = 1; items.push(item(id, E.whyOf ? E.whyOf(id) : (r.whys || [])[Math.min(k, (r.whys || []).length - 1)])); });
    if (!items.length && r.why) items.push(item('', r.why));
    return { src: s, good: r.good, ops: diff(s, r.good), items, tier: 'local', srs: { front: r.good, back: items.map(x => x.name).filter(Boolean).join(' · ') } };
  }

  // ---------- Tầng: trên máy trước, gói miễn phí chỉ nâng thêm (T12) ----------
  const BAD_NET = /\b(quota|limit|rate|error|exceeded|unavailable|forbidden|429|5\d\d)\b|hết lượt|lỗi/i;
  function clean(v, src) {
    if (typeof v !== 'string') return '';
    const s = v.replace(/\s+/g, ' ').trim();
    if (!s || s.length > 240 || s.length > Math.max(60, String(src).length * 3)) return '';
    if (BAD_NET.test(s) || /[<>{}]/.test(s) || !/[a-z]/i.test(s)) return ''; // thông báo lỗi/HTML/JSON lọt vào → bỏ
    if (key(s.replace(/\s+/g, '')) === key(String(src).replace(/\s+/g, ''))) return '';
    return s;
  }
  function engine(o) {
    o = o || {};
    const net = typeof o.net === 'function' ? o.net : null, ms = o.timeoutMs > 0 ? o.timeoutMs : 2500, rest = o.restMs > 0 ? o.restMs : 10 * 60 * 1000;
    const now = o.now || (() => Date.now());
    const online = o.online || (() => !(g.navigator && g.navigator.onLine === false));
    let quietUntil = 0;
    function run(src, q) {
      const local = turn(src, q);
      if (!net || !online() || now() < quietUntil || !String(src || '').trim()) return { local, upgrade: Promise.resolve(local) };
      const upgrade = new Promise(res => {
        let done = 0, tm = 0; const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const end = v => { if (done) return; done = 1; clearTimeout(tm); res(v); };
        tm = setTimeout(() => { if (ac) try { ac.abort(); } catch (e) { /* bỏ */ } end(local); }, ms);
        const nap = st => { if (st === 429 || st >= 500) quietUntil = now() + rest; };
        let p; try { p = Promise.resolve(net(src, q, ac && ac.signal)); } catch (e) { p = Promise.reject(e); }
        p.then(r => {
          if (!r || typeof r !== 'object') return end(local);
          if (r.status && r.status >= 400) { nap(r.status); return end(local); }
          const nat = clean(r.natural, src);
          if (!nat) return end(local);
          const base = local || { src: String(src).trim(), good: String(src).trim(), ops: [], items: [], srs: null };
          end(Object.assign({}, base, { natural: nat, tier: 'net' }));
        }, e => { nap(e && (e.status || (e.response && e.response.status))); end(local); });
      });
      return { local, upgrade };
    }
    return { run, state: () => ({ quietUntil }) };
  }

  // ---------- Thẻ dùng chung ----------
  const del = w => `<s class="fb-del">${esc(w)}</s>`, add = w => `<b class="fb-add">${esc(w)}</b>`;
  const ops = fb => (fb.ops || []).map(o => (o[0] === '=' ? esc(o[1]) : o[0] === '-' ? del(o[1]) : o[0] === '+' ? add(o[1]) : del(o[1]) + ' ' + add(o[2]))).join(' ');
  function lessonName(id) {
    const x = (g.GRAMMAR || []).find(y => y.id === id);
    if (!x) return '';
    return g.I18N && g.I18N.lang && g.I18N.lang() === 'vi' ? x.title : x.en || '';
  }
  function card(fb, opt) {
    if (!fb) return '';
    opt = opt || {};
    const list = opt.compact ? (fb.items || []).slice(0, 1) : fb.items || [];
    const its = list.map(x => `<div class="fb-item">${x.name ? `<b lang="en">${esc(x.name)}</b>` : ''}${x.why ? ` <span class="fb-why">${esc(x.why)}</span>` : ''}`
      + (!opt.compact && x.ok ? `<div class="small fb-ex" lang="en">✓ ${esc(x.ok)} <span class="muted">· ✗ <s>${esc(x.bad)}</s></span></div>` : '')
      + (x.lesson ? ` <a class="fb-lesson" href="#/grammar/${esc(x.lesson)}">📐 ${esc(lessonName(x.lesson) || t('Học bài ngữ pháp liên quan'))}</a>` : '') + '</div>').join('');
    const nat = fb.natural ? `<div class="fb-nat">✨ ${esc(t('Cách nói tự nhiên hơn'))}: <span lang="en">${esc(fb.natural)}</span></div>` : '';
    const dif = (fb.ops || []).some(o => o[0] !== '=') ? `<div class="fb-diff" lang="en">${ops(fb)}</div>` : '';
    return `<div class="fb-card">${dif}${its}${nat}</div>`;
  }

  g.Feedback = { turn, engine, card, diff, META };
})(typeof window !== 'undefined' ? window : globalThis);
