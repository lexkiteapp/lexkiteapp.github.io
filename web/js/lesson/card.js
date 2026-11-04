/* 🎓 Thẻ kết quả theo câu, dùng chung mọi dạng bài có câu (docs/specs/learn-card.md).
 * Mặc định: câu đúng đủ dấu · nghĩa tiếng mẹ đẻ · mẫu câu. Mở thêm: Vì sao · Thử đổi từ. Nói theo bằng mic, chạm từ xem nghĩa, mẫu tự vào ôn tập.
 * Phần thuần (match, tokens, saveAllowed) chạy được trong Node: scripts/lesson/build-card.mjs + scripts/test/lesson-card.mjs. Dữ liệu: web/packs/lcard. */
(function (g) {
  const norm = s => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' -]+/g, ' ').replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
  const clean = s => String(s || '').replace(/[’‘]/g, "'").trim();
  const DAY_MAX = 5, LESSON_MAX = 2;

  /** Mẫu câu của một câu: mẫu đầu tiên khớp trong danh sách (đặt cụ thể trước, chung sau). → frame | null */
  function match(sent, frames) {
    const s = clean(sent); if (!s || !frames) return null;
    for (const f of frames) { try { if ((f._r || (f._r = new RegExp(f.re, 'i'))).test(s)) return f; } catch (e) { /* mẫu lỗi: build-card.mjs chặn trên CI */ } }
    return null;
  }
  /** Tách câu thành từ + phần giữa (giữ nguyên dấu): [{ w, gap }] – vẽ từ chạm được mà câu vẫn đủ dấu */
  function tokens(sent) {
    const out = [], re = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g; let m, at = 0; const s = String(sent || '');
    while ((m = re.exec(s))) { if (m.index > at) out.push({ gap: s.slice(at, m.index) }); out.push({ w: m[0] }); at = m.index + m[0].length; }
    if (at < s.length) out.push({ gap: s.slice(at) });
    return out;
  }
  /** Có được tự lưu mẫu này không (trần theo bài/ngày, không trùng). log: { day, n } · seen: số mẫu đã lưu trong bài */
  function saveAllowed(log, seen, today) {
    const n = log && log.day === today ? log.n : 0;
    return seen < LESSON_MAX && n < DAY_MAX;
  }
  /** Câu đổi từ: "Can I have [a small tea], please?" → [trước, chữ đổi, sau] */
  const altParts = a => { const m = /^(.*?)\[(.+?)\](.*)$/.exec(String(a || '')); return m ? [m[1], m[2], m[3]] : [String(a || ''), '', '']; };
  const altText = a => altParts(a).join('');
  /** Bản dịch dùng được: có chữ và khác câu tiếng Anh (bản trùng = chưa dịch → ẩn) */
  const goodTr = (tr, en) => { const x = String(tr || '').trim(); return x && norm(x) !== norm(en) ? x : ''; };

  // ---------- dữ liệu ----------
  const base = () => { try { return /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) || /^(localhost|127\.)/.test(location.hostname) ? '' : 'https://lexkite.com'; } catch (e) { return ''; } };
  const P = {};
  const get = n => P[n] || (P[n] = fetch(`${base()}/packs/lcard/${n}.json`).then(r => (r.ok ? r.json() : null)).catch(() => { delete P[n]; return null; }));
  let FR = null, LG = {};
  const load = lang => Promise.all([get('frames').then(j => { FR = (j && j.frames) || FR; }), lang && lang !== 'en' ? get(lang).then(j => { if (j) LG[lang] = j; }) : null]).then(() => {});
  const trOf = (lang, en) => { const j = LG[lang]; return (j && j.s && j.s[norm(en)]) || ''; };

  // ---------- CSS ----------
  const CSS = `.lkc{display:flex;flex-direction:column;gap:.5rem;border-radius:12px;padding:.75rem;background:#FFF4D4;color:#422006;box-shadow:0 1px 2px rgba(0,0,0,.05)}:root[data-theme=dark] .lkc{background:#102220;color:#EEF6F7;border:1px solid #1e453e}@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .lkc{background:#102220;color:#EEF6F7;border:1px solid #1e453e}}
.lkc-l{font-size:11px;line-height:14px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;opacity:.85;margin:0}.lkc-s{margin:0;font-size:18px;line-height:26px;font-weight:700}.lkc-w{all:unset;cursor:pointer;border-radius:4px;display:inline-block;min-height:26px}.lkc-w:hover,.lkc-w[aria-expanded=true]{text-decoration:underline;text-underline-offset:3px}.lkc-w:focus-visible{outline:2px solid currentColor;outline-offset:1px}
.lkc-t{margin:0;font-size:15px;line-height:22px}.lkc-g{margin:0;font-size:14px;line-height:20px;font-weight:600;min-height:20px}.lkc-g:empty{display:none}.lkc-p{margin:0;font-size:17px;line-height:24px;font-weight:800}.lkc-a{display:flex;flex-wrap:wrap;gap:.5rem}
.lkc-b{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:.25rem;min-height:44px;padding:0 .75rem;border-radius:9999px;border:1px solid currentColor;font-size:13px;font-weight:700;line-height:1.2}.lkc-b:focus-visible{outline:2px solid currentColor;outline-offset:2px}.lkc-b .material-symbols-outlined{font-size:18px}.lkc-b[aria-expanded=true],.lkc-b.on{font-weight:800}
.lkc-m{margin:0;font-size:14px;line-height:20px;font-weight:600}.lkc-m:empty{display:none}.lkc-x{display:flex;flex-direction:column;gap:.25rem;border-top:1px solid currentColor;padding-top:.5rem}.lkc-x[hidden]{display:none}.lkc-x b{font-weight:800}.lkc-alt{all:unset;cursor:pointer;display:flex;align-items:center;gap:.5rem;min-height:44px;font-size:15px;line-height:21px}.lkc-alt:focus-visible{outline:2px solid currentColor}.lkc-alt .material-symbols-outlined{font-size:18px;flex:none}.lkc-why{font-size:14px;line-height:20px}.lkc-why p,.lkc-why ul{margin:.25rem 0}.lkc-n{font-size:14px;line-height:20px;margin:0}`;
  const css = () => { if (typeof document === 'undefined' || document.getElementById('lkcCss')) return; const s = document.createElement('style'); s.id = 'lkcCss'; s.textContent = CSS; document.head.appendChild(s); };

  // ---------- vẽ ----------
  const ic = n => `<span class="material-symbols-outlined" aria-hidden="true">${n}</span>`;
  /** spec { en, tr, word, hard:{w,m}, idiom, frame, canWhy, saved } → HTML. Không có dữ liệu nào thì phần đó không có mặt. */
  function html(spec, t, esc) {
    const f = spec.frame, A = f && f.alts ? f.alts : [], tr = goodTr(spec.tr, spec.en), idiom = f && f.idiom;
    const sent = tokens(spec.en).map(x => (x.w ? `<button type="button" class="lkc-w" data-w="${esc(x.w)}">${esc(x.w)}</button>` : esc(x.gap))).join('');
    return `<div class="lkc" id="lkc" data-sent="${esc(spec.en)}">
      <p class="lkc-l">${esc(spec.ok ? t('Câu đúng') : t('Đáp án đúng'))}</p>
      <p class="lkc-s" lang="en" dir="ltr">${sent}</p>
      <p class="lkc-g" id="lkcG" aria-live="polite"></p>
      ${tr ? `<p class="lkc-t" dir="auto" id="lkcTr">${esc(tr)}</p>` : ''}
      ${f ? `<p class="lkc-l">${esc(idiom ? t('Thành ngữ') : t('Mẫu câu'))}</p><p class="lkc-p" lang="en" dir="ltr">${esc(f.f)}</p>` : ''}
      ${idiom && spec.idiomMean ? `<p class="lkc-n" dir="auto">${esc(spec.idiomMean)}</p>` : ''}
      ${spec.hard ? `<p class="lkc-n" dir="auto"><b>${esc(t('Từ mới'))}:</b> <span lang="en" dir="ltr">${esc(spec.hard.w)}</span> · ${esc(spec.hard.m)}</p>` : ''}
      <div class="lkc-a">
        <button type="button" class="lkc-b" id="lkcSay">${ic('mic')}<span>${esc(t('Nói theo'))}</span></button>
        ${spec.canWhy ? `<button type="button" class="lkc-b" id="lkcWhy" aria-expanded="false" aria-controls="lkcWhyB">${ic('lightbulb')}<span>${esc(t('Vì sao?'))}</span></button>` : ''}
        ${A.length ? `<button type="button" class="lkc-b" id="lkcSwap" aria-expanded="false" aria-controls="lkcSwapB">${ic('swap_horiz')}<span>${esc(t('Thử đổi từ'))}</span></button>` : ''}
        ${f ? `<button type="button" class="lkc-b${spec.saved ? ' on' : ''}" id="lkcSave" aria-pressed="${spec.saved ? 'true' : 'false'}" ${spec.saved ? '' : 'hidden'}>${ic('bookmark_added')}<span>${esc(t('Đã lưu vào ôn tập'))}</span></button>` : ''}
      </div>
      <p class="lkc-m" id="lkcMsg" aria-live="polite"></p>
      ${spec.canWhy ? '<div class="lkc-x lkc-why" id="lkcWhyB" hidden></div>' : ''}
      ${A.length ? `<div class="lkc-x" id="lkcSwapB" hidden>${A.slice(0, 3).map(a => { const [x, y, z] = altParts(a); return `<button type="button" class="lkc-alt" data-say="${esc(x + y + z)}" lang="en" dir="ltr">${ic('volume_up')}<span>${esc(x)}<b>${esc(y)}</b>${esc(z)}</span></button>`; }).join('')}</div>` : ''}
    </div>`;
  }

  /** Gắn sự kiện. deps { t, speak(text), gloss(word)→nghĩa|'', why()→HTML|'' , rec(text, cb), save()→bool, unsave() } */
  function wire(root, spec, deps) {
    const q = s => root.querySelector(s), msg = q('#lkcMsg'), gl = q('#lkcG'), t = deps.t;
    root.querySelectorAll('.lkc-w').forEach(b => { b.onclick = () => {
      const w = b.dataset.w, open = b.getAttribute('aria-expanded') === 'true';
      root.querySelectorAll('.lkc-w[aria-expanded=true]').forEach(x => x.setAttribute('aria-expanded', 'false'));
      if (open) { gl.textContent = ''; return; }
      b.setAttribute('aria-expanded', 'true'); if (deps.speak) deps.speak(w);
      const m = deps.gloss ? deps.gloss(w) : ''; gl.textContent = m ? `${w}: ${m}` : ''; // không có nghĩa → chỉ đọc từ, không hiện dòng trống
    }; });
    const tog = (btn, box, fill) => { if (!btn || !box) return null; const fn = () => { const on = box.hidden; if (on && fill) fill(box); box.hidden = !on; btn.setAttribute('aria-expanded', String(on)); }; btn.onclick = fn; return fn; };
    const openWhy = tog(q('#lkcWhy'), q('#lkcWhyB'), box => { if (!box.dataset.f) { box.innerHTML = (deps.why && deps.why()) || `<p>${spec.tr ? '' : ''}</p>`; box.dataset.f = '1'; } });
    tog(q('#lkcSwap'), q('#lkcSwapB'));
    root.querySelectorAll('.lkc-alt').forEach(b => { b.onclick = () => deps.speak && deps.speak(b.dataset.say); });
    const say = q('#lkcSay');
    if (say) say.onclick = () => {
      if (!deps.rec) return; say.disabled = true; msg.textContent = t('Đang nghe bạn nói…');
      deps.rec(spec.en, r => { say.disabled = false; msg.textContent = r.err ? r.err : r.score >= 70 ? t('Rõ lắm, cứ nói như vậy!') : t('Gần được rồi, nghe lại rồi thử nhé.'); });
    };
    const sv = q('#lkcSave');
    if (sv) sv.onclick = () => { const on = sv.getAttribute('aria-pressed') === 'true'; if (on) { if (deps.unsave) deps.unsave(); sv.setAttribute('aria-pressed', 'false'); sv.classList.remove('on'); sv.lastElementChild.textContent = t('Lưu vào ôn tập'); } else { if (deps.save) deps.save(); sv.setAttribute('aria-pressed', 'true'); sv.classList.add('on'); sv.lastElementChild.textContent = t('Đã lưu vào ôn tập'); } };
    if (!spec.ok && openWhy) openWhy(); // sai: cho thấy lý do ngay, không phạt
  }
  const on = () => { try { return localStorage.getItem('lk.lcard') !== '0'; } catch (e) { return true; } };
  g.LearnCard = { match, tokens, saveAllowed, altParts, altText, goodTr, norm, load, trOf, frames: () => FR, idiomOf: (lang, id) => { const j = LG[lang]; return (j && j.i && j.i[id]) || ''; }, css, html, wire, on, DAY_MAX, LESSON_MAX };
})(typeof self !== 'undefined' ? self : globalThis);
