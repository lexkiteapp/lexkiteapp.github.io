/* 🧠 Thẻ giải thích đáp án dùng chung (mọi bài trắc nghiệm/điền: cách dùng từ, ngữ pháp, từ vựng, đọc, nghe, đề thi, add-on).
 * Tải lười (không ở khung app). Lược đồ & quy trình sinh dữ liệu: docs/EXPLAIN.md · dữ liệu: content/explain/<bộ>.json → web/js/explain/<bộ>/<lang>.json
 * Lược đồ một mục (đã chọn ngôn ngữ):
 *   { p: 'be engaged [in] + N / V-ing', why, wrong: { lựa chọn: ghi chú }, ex: [câu tiếng Anh], hook, fam: [{ w, href }],
 *     ev: { text, hl } (đọc: câu bằng chứng), tr: { text, at } (nghe: lời thoại + giây), nu (từ vựng: sắc thái), col: [collocation], en: true (phần giải thích đang là tiếng Anh) }
 * API: ExplainCard.ready() → chữ giao diện sẵn sàng · ExplainCard.load(bộ) → Promise<map> · ExplainCard.pick(map[id]) → mục theo ngôn ngữ người học
 *      ExplainCard.html(x, { ok, chosen, id }) → HTML · ExplainCard.bind(gốc, { speak(text), review(id, nút), report(id) }) */
(function (g) {
  if (g.ExplainCard) return;
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // *tiếng Anh* → giữ nguyên khi dịch (translate=no) · [đáp án] trong mẫu → tô sáng
  const fmt = s => esc(s).replace(/\*([^*]+)\*/g, '<i class="xc-k" lang="en" translate="no">$1</i>');
  const pat = s => esc(s).replace(/\[([^\]]+)\]/g, '<mark>$1</mark>');
  const lang = () => (g.I18N && I18N.learnLang ? I18N.learnLang() : 'vi');
  const cache = {};
  // Chữ giao diện của thẻ: nhóm tải lười js/i18n/en/explain.js (+ js/i18n/<lang>/explain.js) – nạp trước khi vẽ
  let dictP;
  const have = l => g.I18N_DICT && g.I18N_DICT[l] && g.I18N_DICT[l]['Xem giải thích chi tiết'];
  const one = src => new Promise(y => { const s = document.createElement('script'); s.src = src; s.onload = s.onerror = () => y(); document.head.appendChild(s); });
  function ready() {
    const l = g.I18N && I18N.lang ? I18N.lang() : 'vi';
    return dictP || (dictP = !g.document || l === 'vi' || (have('en') && (l === 'en' || have(l))) ? Promise.resolve() : one('js/i18n/en/explain.js').then(() => (l !== 'en' ? one(`js/i18n/${l}/explain.js`) : null)));
  }
  // Mục bị học viên báo sai ≥ N lần (api/report op 'hidden') → ẩn tới khi sửa. Lỗi mạng → không ẩn gì (fail-open, không chặn học)
  let hidP = null;
  function hidden() {
    if (hidP) return hidP;
    try { const c = JSON.parse(sessionStorage.getItem('lk.hidden') || 'null'); if (c && Date.now() - c.at < 6e5) return (hidP = Promise.resolve(c.cids)); } catch (e) { /* bỏ qua */ }
    const base = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
    return (hidP = fetch(base + '/api/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"op":"hidden"}' }).then(r => (r.ok ? r.json() : {})).then(j => {
      const cids = Array.isArray(j.cids) ? j.cids.filter(x => typeof x === 'string') : []; try { sessionStorage.setItem('lk.hidden', JSON.stringify({ at: Date.now(), cids })); } catch (e) { /* bỏ qua */ } return cids;
    }).catch(() => []));
  }
  function load(set, l) {
    l = l || lang();
    const k = set + '/' + l;
    if (cache[k]) return cache[k];
    const f = g.fetch ? Promise.all([fetch(`js/explain/${set}/${l}.json`).then(r => (r.ok ? r.json() : l !== 'en' ? load(set, 'en') : {})), hidden()])
      .then(([m, h]) => { for (const c of h) if (c.startsWith('explain:')) delete m[c.slice(8)]; return m; }) : Promise.resolve({});
    return (cache[k] = f.catch(() => { delete cache[k]; return {}; }));
  }
  // Tệp theo ngôn ngữ: id → [mẫu, vì sao, mẹo, {sai}, [ví dụ], cờ] (cờ 1 = phần giải thích là tiếng Anh dự phòng)
  function pick(row) {
    if (!row) return null;
    if (!Array.isArray(row)) return row;
    const [p, why, hook, wrong, ex, en] = row;
    return { p, why, hook, wrong: wrong || {}, ex: ex || [], en: !!en };
  }
  // id ổn định theo nội dung câu (không theo thứ tự): FNV-1a 32 bit → base36 (scripts/explain/sets.mjs dùng chính hàm này)
  const hid = s => { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36); };
  // Ngữ pháp: id = g|<bài>|<băm câu hỏi>; tệp con grammar-<0..7> theo bài
  const gid = (lesson, q) => `g|${lesson}|${hid(q)}`, gsub = lesson => 'grammar-' + (parseInt(hid(lesson), 36) % 8);
  let n = 0;
  function html(x, o) {
    o = o || {};
    if (!x || (!x.p && !x.why && !o.whyHtml)) return '';
    const id = 'xc' + (++n), L = x.en ? ' lang="en"' : '';
    const wrong = !o.ok && o.chosen && x.wrong && x.wrong[o.chosen];
    const say = s => `<button type="button" class="icon-btn sm" data-xsay="${esc(s)}" aria-label="${esc(t('Nghe ví dụ') + ': ' + s)}">🔊</button>`;
    const more = [
      wrong ? `<p class="xc-row xc-bad"><span class="xc-l">✗ ${t('Vì sao lựa chọn của bạn sai')}</span><b lang="en" translate="no">${esc(o.chosen)}</b>: <span${L}>${fmt(wrong)}</span></p>` : '',
      x.ev && x.ev.text ? `<p class="xc-row"><span class="xc-l">📄 ${t('Bằng chứng trong bài')}</span><span lang="en" translate="no">${x.ev.hl ? esc(x.ev.text).replace(esc(x.ev.hl), `<mark>${esc(x.ev.hl)}</mark>`) : esc(x.ev.text)}</span></p>` : '',
      x.tr && x.tr.text ? `<p class="xc-row"><span class="xc-l">🎧 ${t('Lời thoại')}${x.tr.at != null ? ` <button type="button" class="xc-at" data-xat="${+x.tr.at}">${Math.floor(x.tr.at / 60)}:${String(Math.floor(x.tr.at % 60)).padStart(2, '0')}</button>` : ''}</span><span lang="en" translate="no">${esc(x.tr.text)}</span></p>` : '',
      x.nu ? `<p class="xc-row"><span class="xc-l">🎯 ${t('Sắc thái nghĩa')}</span><span${L}>${fmt(x.nu)}</span></p>` : '',
      x.ex && x.ex.length ? `<div class="xc-row"><span class="xc-l">📝 ${t('Ví dụ thêm')}</span><ul class="xc-ex">${x.ex.map(s => `<li><span lang="en" translate="no">${esc(s)}</span>${say(s)}</li>`).join('')}</ul></div>` : '',
      x.hook ? `<p class="xc-row xc-hook"><span class="xc-l">💡 ${t('Mẹo nhớ')}</span><span${L}>${fmt(x.hook)}</span></p>` : '',
      (x.fam && x.fam.length) || (x.col && x.col.length) ? `<div class="xc-row"><span class="xc-l">🧩 ${t('Cùng nhóm')}</span><span class="xc-fam">${(x.fam || []).map(f => `<a class="chip" href="${esc(f.href)}" lang="en" translate="no">${esc(f.w)}</a>`).join('')}${(x.col || []).map(c => `<span class="chip" lang="en" translate="no">${esc(c)}</span>`).join('')}</span></div>` : ''
    ].filter(Boolean).join('');
    return `<div class="xc" data-xid="${esc(o.id || '')}">
      ${x.p ? `<p class="xc-p"><span class="xc-l">${t('Cấu trúc')}</span><code lang="en" translate="no">${pat(x.p)}</code></p>` : ''}
      ${x.why ? `<p class="xc-why"${L}>${fmt(x.why)}</p>` : o.whyHtml ? `<p class="xc-why">${o.whyHtml}</p>` : ''}
      ${more ? `<details class="xc-more"${wrong ? ' open' : ''}><summary aria-controls="${id}">${t('Xem giải thích chi tiết')}</summary><div id="${id}">${more}</div></details>` : ''}
      <div class="xc-act">${o.id && o.review !== false ? `<button type="button" class="btn sm ghost" data-xrev>＋ ${t('Thêm vào ôn tập')}</button>` : ''}<button type="button" class="btn sm ghost xc-flag" data-xrep aria-label="${esc(t('Báo lỗi giải thích'))}">⚑ ${t('Báo lỗi')}</button></div></div>`;
  }
  function bind(root, h) {
    if (!root || root.dataset.xcBound) return;
    root.dataset.xcBound = 1;
    root.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-xsay],[data-xrev],[data-xrep],[data-xat]'); if (!b) return;
      const card = b.closest('.xc'), id = card ? card.dataset.xid : '';
      e.preventDefault();
      if (b.dataset.xsay != null) h.speak && h.speak(b.dataset.xsay);
      else if (b.hasAttribute('data-xrev')) h.review && h.review(id, b);
      else if (b.hasAttribute('data-xrep')) h.report ? h.report(id) : (g.LexReportLoad && LexReportLoad().then(R => R && R.open({ cat: 'content', cid: 'explain:' + id })));
      else if (b.dataset.xat != null) h.seek && h.seek(+b.dataset.xat);
    });
  }
  const CSS = `.xc{margin-top:.45rem;padding:.6rem .75rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);font-size:.92rem;line-height:1.45}
.xc p{margin:0 0 .3rem}.xc-l{display:block;font-size:.72rem;font-weight:800;color:var(--muted);text-transform:none;margin-block-end:.1rem}
.xc-p code{font-size:.95rem;background:none;padding:0;white-space:normal}.xc mark{background:var(--primary-soft,#d9f2ee);color:inherit;font-weight:800;border-radius:4px;padding:0 .15rem}
.xc-why{font-weight:600}.xc-more summary{cursor:pointer;color:var(--primary);font-weight:700;min-height:44px;display:flex;align-items:center;list-style-position:inside}
.xc-more summary:focus-visible{outline:3px solid var(--primary);outline-offset:2px;border-radius:6px}
.xc-row{margin:.35rem 0}.xc-bad{border-inline-start:3px solid var(--again);padding-inline-start:.5rem}.xc-hook{border-inline-start:3px solid var(--primary);padding-inline-start:.5rem}
.xc-ex{margin:0;padding-inline-start:1.1rem}.xc-ex li{margin:.1rem 0}.xc-fam{display:flex;flex-wrap:wrap;gap:.3rem}.xc-fam .chip{min-height:32px;display:inline-flex;align-items:center}
.xc-act{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.35rem}.xc-flag{margin-inline-start:auto}.xc-k{font-style:italic}
.xc-at{border:1px solid var(--line);border-radius:6px;background:none;color:var(--primary);font:inherit;cursor:pointer;padding:0 .3rem}`;
  function style() { if (!g.document || document.getElementById('xc-css')) return; const s = document.createElement('style'); s.id = 'xc-css'; s.textContent = CSS; document.head.appendChild(s); }
  style();
  g.ExplainCard = { load, pick, html, bind, ready, fmt, pat, hid, gid, gsub };
})(typeof self !== 'undefined' ? self : this);
