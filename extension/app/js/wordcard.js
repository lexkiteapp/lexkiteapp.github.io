/* 🧠 Thẻ từ – khối "Hiểu sâu" dùng chung cho Ôn tập (mặt sau thẻ), Học thông minh (thẻ từ mới) và Từ điển:
   💡 Mẹo nhớ · ⚠️ Lỗi hay gặp (cặp ✕ sai / ✓ đúng) · 🎯 Dùng khi thi · 🌳 Họ từ (chip + từ loại).
   Tải lười: App.need('wordcard') (app.js renderNotes). Không gọi t() lúc nạp module – chỉ lúc vẽ.
   Dữ liệu ghi chú soạn bằng tiếng Việt (js/notes/<chữ>.json: m, e, u, f); câu/cụm tiếng Anh là NỘI DUNG học → không dịch,
   phần giải thích tiếng Việt nằm trong .wn nên vẫn được app.js dịch sang ngôn ngữ người học. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VI = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  const EN = s => (VI.test(s) ? '' : ' lang="en"');

  // ---------- Bộ tách "Lỗi hay gặp" ----------
  // "Sai: X → Đúng: Y. Sai: X2 → Đúng: Y2. Ghi chú…" (cả "Nhấn sai:", "Phát âm sai:", "Nhầm:", "Wrong/Incorrect: … → Correct/Right: …")
  const WRONG = '(?:(?:phát âm|nhấn(?: âm)?|viết|chính tả|dùng|ngữ pháp)\\s+)?sai|nhầm|wrong|incorrect|mistake|✗|❌|×';
  const RIGHT = 'đúng|thường dùng|nên dùng|nên nói|right|correct|better|✓|✅';
  const LBL = new RegExp(`(^|[\\s.;!?(])(?:${WRONG})\\s*:`, 'giu'), WL = new RegExp(`^(?:${WRONG})\\s*:\\s*`, 'iu'), RL = new RegExp(`^(?:${RIGHT})\\s*:\\s*`, 'iu'), ARROW = /\s*(?:→|->|=>|⇒)\s*/;
  // Tách ghi chú tiếng Việt trong ngoặc ở cuối: "analyse the data (không dùng about)" → ["analyse the data", "(không dùng about)"]
  const tail = s => { const m = /^(.*\S)\s*(\([^()]*\))$/.exec(s.trim()); return m && VI.test(m[2]) && !VI.test(m[1]) ? [m[1], m[2]] : [s.trim(), '']; };
  const sentences = s => String(s || '').replace(/([.!?])\s+/g, '$1\u0000').split('\u0000').map(x => x.trim().replace(/^[.;,\s]+/, '')).filter(x => x.replace(/[.;\s]/g, '').length > 1);
  // Câu đúng kết thúc ở dấu câu (ngoài ngoặc) mà câu sau là lời giải thích tiếng Việt
  const rightEnd = s => {
    let d = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]; if (ch === '(') d++; else if (ch === ')') d = Math.max(0, d - 1);
      else if (!d && /[.?!…;]/.test(ch)) {
        let j = i; while (j < s.length && /[.?!…;]/.test(s[j])) j++;
        if (j < s.length && !/\s/.test(s[j])) { i = j - 1; continue; }
        const next = s.slice(j).trimStart(), abbr = /(?:^|\s)(?:Mr|Mrs|Ms|Dr|St|vs|etc|e\.g|i\.e)$/i.test(s.slice(0, i));
        if (ch === ';' || (!abbr && (/^[A-ZĐ]/.test(next) || VI.test(next.split(/[.?!]/)[0])))) return ch === ';' || (ch === '.' && j - i === 1) ? i : j;
        i = j - 1;
      }
    }
    return s.length;
  };
  const unq = s => s.replace(/^["'“‘]|["'”’]$/g, '');
  function parseErrors(text) {
    const s = String(text || '').trim(), pairs = [], notes = [];
    if (!s) return { pairs, notes };
    const cuts = []; let m; LBL.lastIndex = 0;
    while ((m = LBL.exec(s))) cuts.push(m.index + m[1].length);
    if (!cuts.length) return { pairs, notes: [s] };
    notes.push(...sentences(s.slice(0, cuts[0])));
    cuts.forEach((c, i) => {
      const raw = s.slice(c, i + 1 < cuts.length ? cuts[i + 1] : s.length), seg = raw.replace(WL, ''), a = seg.search(ARROW);
      if (a < 0) return notes.push(...sentences(raw));
      const rest = seg.slice(a).replace(ARROW, '').replace(RL, ''), e = rightEnd(rest);
      const [w, wn] = tail(seg.slice(0, a)), [r, rn] = tail(rest.slice(0, e).replace(/[\s;]+$/, '').replace(/([^.])\.$/, '$1'));
      if (!w || !r) return notes.push(...sentences(raw));
      pairs.push({ wrong: unq(w), right: unq(r), wn, rn });
      notes.push(...sentences(rest.slice(e)));
    });
    return pairs.length ? { pairs, notes } : { pairs: [], notes: [s] };
  }

  // ---------- Họ từ: "curriculum (n), curricula (pl), curricular (adj)" → [{ w, pos }] (dấu phẩy trong ngoặc không tách) ----------
  function parseFamily(text, head) {
    const parts = []; let depth = 0, cur = '';
    for (const ch of String(text || '')) { if (ch === '(') depth++; if (ch === ')') depth = Math.max(0, depth - 1); if ((ch === ',' || ch === ';') && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
    parts.push(cur);
    const h = String(head || '').toLowerCase();
    return parts.map(p => p.trim()).filter(Boolean).map(p => { const m = /^(.+?)\s*(?:\(([^()]*)\))?\.?$/.exec(p); return m && !VI.test(m[1]) && m[1].length <= 40 ? { w: m[1].trim(), pos: (m[2] || '').trim() } : { text: p }; })
      .filter((x, i) => i || !x.w || x.w.toLowerCase() !== h);
  }

  // Cụm tiếng Anh trong ngoặc ('…' “…” "…") → <q lang="en"> (nổi bật, không bị dịch máy kéo theo)
  const QRE = /(^|[\s(])(['‘“"])([^'’”"]{2,80}?)(['’”"])(?=[\s.,;:!?)]|$)/g;
  const quotes = s => { s = String(s || ''); let out = '', last = 0, m; QRE.lastIndex = 0; while ((m = QRE.exec(s))) { const a = m.index + m[1].length; out += esc(s.slice(last, a)) + (VI.test(m[3]) ? esc(s.slice(a, QRE.lastIndex)) : `<q class="wc-q" lang="en">${esc(m[3])}</q>`); last = QRE.lastIndex; } return out + esc(s.slice(last)); };
  // Dùng khi thi: tách từng dòng theo mốc "Writing Task 2", "Speaking Part 3", "TOEIC Part 5"…
  const EXAM = /^((?:IELTS|TOEIC|TOEFL|VSTEP)?\s*(?:(?:Academic |General )?(?:Writing|Speaking|Listening|Reading)(?:\s+(?:Task|Part)\s*\d(?:\s*[/&-]\s*\d)?)?|Part\s*\d|Task\s*\d)|IELTS|TOEIC|TOEFL|VSTEP)\s*[:–-]?\s*/i;
  function parseUsage(text) {
    const out = [];
    sentences(text).forEach(x => { const m = EXAM.exec(x); out.push(m && m[1].trim() && x.length > m[0].length ? { tag: m[1].trim(), text: x.slice(m[0].length) } : { tag: '', text: x }); });
    return out;
  }

  // ---------- Trạng thái mở/đóng nhớ trên máy (Core.Store, mặc định mở "Mẹo nhớ") ----------
  const KEY = 'wcOpen'; let open = ['m'];
  // CSS riêng tải cùng module; chờ tối đa 1,5 s để khối hiện ra đã có kiểu (không nháy chữ trần)
  const css = new Promise(res => { if (document.querySelector('link[data-wc-css]')) return res(); const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'css/wordcard.css'; l.dataset.wcCss = 1; l.onload = l.onerror = () => res(); setTimeout(res, 1500); document.head.appendChild(l); });
  const ready = Promise.all([css, (window.Core && Core.Store ? Core.Store.get(KEY, open) : Promise.resolve(open)).then(v => { if (Array.isArray(v)) open = v; }).catch(() => {})]);
  let saveT = 0;
  document.addEventListener('toggle', e => {
    const d = e.target; if (!d || !d.matches || !d.matches('details[data-wc]')) return;
    const k = d.dataset.wc; open = open.filter(x => x !== k); if (d.open) open.push(k);
    clearTimeout(saveT); saveT = setTimeout(() => { try { Core.Store.set(KEY, open); } catch (err) { /* bỏ qua */ } }, 200);
  }, true);

  // ---------- Vẽ ----------
  const sec = (k, ic, label, meta, body) => `<details class="wc-sec wc-${k}" data-wc="${k}"${open.includes(k) ? ' open' : ''}><summary><span class="wc-ic" aria-hidden="true">${ic}</span><span class="wc-lb">${label}</span>${meta ? `<span class="wc-n">${meta}</span>` : ''}<span class="wc-chev" aria-hidden="true"></span></summary><div class="wc-body">${body}</div></details>`;
  const errHtml = e => {
    const { pairs, notes } = parseErrors(e);
    return (pairs.length ? `<ul class="wc-pairs">${pairs.map(p => `<li class="wc-pair">
      <div class="wc-wrong"><span class="wc-mk" aria-hidden="true">✕</span><span class="sr-only">${t('Sai')}: </span><span><s${EN(p.wrong)}>${esc(p.wrong)}</s>${p.wn ? ` <span class="wc-why">${esc(p.wn)}</span>` : ''}</span></div>
      <div class="wc-right"><span class="wc-mk" aria-hidden="true">✓</span><span class="sr-only">${t('Đúng')}: </span><span><b${EN(p.right)}>${esc(p.right)}</b>${p.rn ? ` <span class="wc-why">${esc(p.rn)}</span>` : ''}</span></div></li>`).join('')}</ul>` : '')
      + (notes.length ? `<ul class="wc-notes">${notes.map(x => `<li>${quotes(x)}</li>`).join('')}</ul>` : '');
  };
  const famHtml = (f, word) => {
    const items = parseFamily(f, word);
    return items.length ? `<div class="wc-chips">${items.map(x => x.w ? `<button type="button" class="chip wc-chip" data-wc-say="${esc(x.w.split('/')[0].trim())}"><span lang="en">${esc(x.w)}</span>${x.pos ? `<small class="wc-pos">${esc(x.pos)}</small>` : ''}</button>` : `<span class="wc-ftx">${esc(x.text)}</span>`).join('')}</div>` : esc(f);
  };
  const useHtml = u => `<ul class="wc-use">${parseUsage(u).map(x => `<li>${x.tag ? `<span class="wc-tag" lang="en">${esc(x.tag)}</span>` : ''}<span>${quotes(x.text)}</span></li>`).join('')}</ul>`;

  // 🎬 "Xem 20 giây": chỗ trống ẩn – lesson-video.js (gói lvideo, tải lười) chỉ hiện khi có video khớp từ này (docs/VIDEO-SCALE-PLAN.md §10)
  const lvSlot = word => { if (!word || !window.App || !App.need) return ''; setTimeout(() => App.need('lvideo').then(() => window.LessonVideo && LessonVideo.scan()).catch(() => {}), 0); return `<div class="lv-slot" hidden data-lv="${esc(JSON.stringify({ mode: 'word', words: [String(word).toLowerCase()] }))}"></div>`; };
  function notes(n, word) {
    if (!n) return lvSlot(word);
    const fam = n.f ? parseFamily(n.f, word).filter(x => x.w).length : 0, errs = n.e ? parseErrors(n.e).pairs.length : 0;
    const body = [
      n.m ? sec('m', '💡', t('Mẹo nhớ'), '', `<p class="wc-p">${quotes(n.m)}</p>`) : '',
      n.e ? sec('e', '⚠️', t('Lỗi hay gặp'), errs || '', errHtml(n.e)) : '',
      n.u ? sec('u', '🎯', t('Dùng khi thi'), '', useHtml(n.u)) : '',
      n.f ? sec('f', '🌳', t('Họ từ'), fam || '', famHtml(n.f, word)) : '',
    ].join('');
    return body ? `<section class="wn wc${I18N.learnLang() === 'vi' ? '' : ' wn-tr'}" aria-label="${t('Hiểu sâu')}"><div class="wc-head"><span aria-hidden="true">🧠</span> ${t('Hiểu sâu')}</div>${body}</section>` + lvSlot(word) : lvSlot(word);
  }

  window.WordCard = { notes, parseErrors, parseFamily, parseUsage, ready };
})();
