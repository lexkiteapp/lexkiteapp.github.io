/* ✍️ Sửa ngữ pháp – #/fix: dán/gõ đoạn văn → soát lỗi trực tiếp trên máy (LK_WRITE.check – web/js/writecheck-rules.js, không gửi đi đâu),
 * gạch chân theo loại (chính tả/ngữ pháp/dấu câu/văn phong), bấm lỗi → gợi ý + lý do + bài học, sửa 1 chạm, sửa nhanh mọi lỗi an toàn,
 * sao chép bản đã sửa, hoàn tác. "Giải thích bằng AI" chỉ gửi đúng câu chứa lỗi khi người học tự bấm. Bản nháp lưu trên máy (Store 'fixDraft'). */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App, { routes } = App, view = App.view, Store = Core.Store;
  const TYPES = () => [['spelling', t('Chính tả')], ['grammar', t('Ngữ pháp')], ['punct', t('Dấu câu')], ['style', t('Văn phong')]];
  const SAMPLE = 'i am agree that technology is very important in education. Students can to learn faster, and they has more informations then before. Yesterday I didn\'t went to class because i was sick ,so I discussed about the lesson with my freind.';
  const MAXLEN = 20000;
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };

  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.fx{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(0,1fr);gap:1rem;align-items:start}
.fx-c-spelling{--c:var(--again)}.fx-c-grammar{--c:#d97706}.fx-c-punct{--c:var(--easy)}.fx-c-style{--c:var(--accent)}
.fx-ed{position:relative;border:1px solid var(--line);border-radius:16px;background:var(--surface);transition:border-color .15s,box-shadow .15s}
.fx-ed:focus-within{border-color:var(--primary);box-shadow:0 0 0 4px var(--primary-soft)}
.fx-hl,.fx-ta{margin:0;padding:1rem 1.1rem;font:16px/1.75 var(--font);letter-spacing:normal;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;tab-size:4}
.fx-hl{position:absolute;inset:0;color:transparent;pointer-events:none;overflow:hidden;border:1px solid transparent}
.fx-ta{position:relative;display:block;width:100%;min-height:240px;resize:none;border:1px solid transparent;background:transparent;color:var(--text);outline:none;overflow:hidden;caret-color:var(--primary)}
.fx-hl mark{color:transparent;background:color-mix(in srgb,var(--c) 13%,transparent);border-radius:3px;text-decoration:underline var(--c);text-decoration-thickness:2px;text-underline-offset:4px;transition:background .15s}
.fx-hl .fx-c-spelling{text-decoration-style:wavy}.fx-hl .fx-c-grammar{text-decoration-style:solid}.fx-hl .fx-c-punct{text-decoration-style:double}.fx-hl .fx-c-style{text-decoration-style:dotted}
.fx-hl mark.on{background:color-mix(in srgb,var(--c) 32%,transparent)}
.fx-tools{display:flex;flex-wrap:wrap;gap:.4rem;align-items:center;justify-content:space-between;margin-top:.6rem}
.fx-legend{display:flex;flex-wrap:wrap;gap:.35rem}
.fx-lg{display:inline-flex;align-items:center;gap:.35rem;border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:.3rem .7rem;font-weight:700;font-size:.82rem;cursor:pointer;color:var(--text);min-height:36px;transition:opacity .15s,background .15s}
.fx-lg i,.fx-it i{width:.7rem;height:.7rem;border-radius:50%;background:var(--c);flex:none}
.fx-lg[aria-pressed=false]{opacity:.5;text-decoration:line-through}.fx-lg b{color:var(--muted);font-weight:700}
.fx-side{display:grid;gap:.8rem;position:sticky;top:1rem}
.fx-sum{display:flex;align-items:center;gap:.8rem}.fx-num{font-size:2rem;font-weight:800;line-height:1;color:var(--c,var(--text))}
.fx-acts{display:grid;gap:.45rem;margin-top:.8rem}
.fx-card{border-left:4px solid var(--c);animation:fxIn .22s ease}@keyframes fxIn{from{opacity:0;transform:translateY(6px)}}
.fx-card h3{display:flex;align-items:center;gap:.4rem;margin:0 0 .5rem}.fx-ty{font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--c)}
.fx-orig{font-size:1.05rem}.fx-orig s{color:var(--again-text);text-decoration-thickness:2px}
.fx-reps{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0}.fx-reps .btn small{opacity:.8;font-weight:600}
.fx-why{margin:.3rem 0 .6rem;font-size:.92rem}
.fx-nav{display:flex;justify-content:space-between;gap:.4rem;margin-top:.7rem;flex-wrap:wrap}
.fx-list{list-style:none;margin:0;display:grid;gap:.35rem;max-height:420px;overflow:auto;padding:.1rem}
.fx-it{display:flex;align-items:center;gap:.55rem;width:100%;text-align:start;border:1px solid var(--line);background:var(--surface);border-radius:12px;padding:.5rem .7rem;cursor:pointer;color:var(--text);transition:border-color .15s,background .15s,transform .15s}
.fx-it:hover{border-color:var(--c)}.fx-it.on{border-color:var(--c);background:color-mix(in srgb,var(--c) 9%,var(--surface))}.fx-it:active{transform:scale(.99)}
.fx-it span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.88rem}.fx-it s{color:var(--muted)}
.fx-ok{text-align:center;padding:1.2rem .5rem}.fx-ai{margin-top:.6rem}
@media (max-width:860px){.fx{grid-template-columns:1fr}.fx-side{position:static}}`;
    document.head.appendChild(s);
  }

  routes.fix = App.guard(async function () {
    const w = App.W;
    style();
    const W = window.LK_WRITE;
    if (!W) { view.innerHTML = `<div class="card empty"><div class="em">⚠️</div>${t('Không tải được bộ soát lỗi – thử tải lại trang.')}</div>`; return; }
    const ignored = new Set(JSON.parse(ss('fx.ign') || '[]'));
    const off = new Set(JSON.parse(ss('fx.off') || '[]'));
    let text = String(await w(Store.get('fixDraft', '')) || ''), issues = [], sel = -1, undo = [], timer = 0, saveT = 0;
    view.innerHTML = `<div class="page-head"><div><h1>✍️ ${t('Sửa ngữ pháp')}</h1><p class="muted">${t('Dán hoặc gõ đoạn văn tiếng Anh – lỗi được gạch chân ngay. Bộ soát chạy hoàn toàn trên máy bạn, không gửi chữ đi đâu.')}</p></div></div>
      <div class="fx">
        <div>
          <div class="fx-ed"><div class="fx-hl" id="fxHl" aria-hidden="true" translate="no"></div>
            <textarea class="fx-ta" id="fxT" lang="en" spellcheck="false" autocapitalize="sentences" maxlength="${MAXLEN}" aria-label="${t('Đoạn văn cần kiểm tra')}" aria-describedby="fxStat" placeholder="${t('Dán đoạn văn tiếng Anh vào đây…')}"></textarea></div>
          <div class="fx-tools"><div class="fx-legend" role="group" aria-label="${t('Lọc theo loại lỗi')}" id="fxLg"></div>
            <div class="row" style="gap:.35rem"><span class="small muted" id="fxWc"></span><button type="button" class="btn sm ghost" id="fxSample">📄 ${t('Đoạn mẫu')}</button><button type="button" class="btn sm ghost" id="fxClear">🗑️ ${t('Xóa')}</button></div></div>
        </div>
        <aside class="fx-side" aria-label="${t('Kết quả kiểm tra')}">
          <div class="card"><div class="fx-sum"><span class="fx-num" id="fxNum">0</span><div><b id="fxStat" role="status" aria-live="polite"></b><div class="small muted">${t('Bấm vào chữ gạch chân hoặc chọn trong danh sách.')}</div></div></div>
            <div class="fx-acts"><button type="button" class="btn primary" id="fxAll">✨ <span id="fxAllT"></span></button>
              <div class="row" style="gap:.4rem"><button type="button" class="btn sm grow" id="fxCopy">📋 ${t('Sao chép bản đã sửa')}</button><button type="button" class="btn sm" id="fxUndo" disabled>↶ ${t('Hoàn tác')}</button></div></div></div>
          <div id="fxCard"></div>
          <ul class="fx-list" id="fxList" aria-label="${t('Danh sách lỗi')}"></ul>
        </aside>
      </div>`;
    const ta = $('#fxT'), hl = $('#fxHl');
    ta.value = text;
    const key = x => x.rule + '|' + text.slice(x.s, x.e).toLowerCase();
    const visible = () => issues.filter(x => !off.has(x.type));
    const safe = x => x.reps.length === 1 && x.type !== 'style';
    const grow = () => { ta.style.height = 'auto'; ta.style.height = Math.max(240, ta.scrollHeight + 2) + 'px'; };
    const tyName = Object.fromEntries(TYPES());
    function check() {
      const prev = sel >= 0 && issues[sel] ? issues[sel] : null;
      issues = W.check(text).filter(x => !ignored.has(key(x)));
      sel = prev ? issues.findIndex(x => x.rule === prev.rule && x.s === prev.s) : -1;
      draw();
    }
    function draw() {
      // lớp gạch chân (cùng phông, cùng ngắt dòng với ô nhập)
      let html = '', at = 0;
      visible().forEach(x => { const i = issues.indexOf(x); html += esc(text.slice(at, x.s)) + `<mark class="fx-c-${x.type}${i === sel ? ' on' : ''}">${esc(text.slice(x.s, x.e)) || ' '}</mark>`; at = x.e; });
      hl.innerHTML = html + esc(text.slice(at)) + '\n ';
      const vis = visible(), n = vis.length, nSafe = vis.filter(safe).length;
      const counts = Object.fromEntries(TYPES().map(([k]) => [k, issues.filter(x => x.type === k).length]));
      $('#fxLg').innerHTML = TYPES().map(([k, l]) => `<button type="button" class="fx-lg fx-c-${k}" data-ty="${k}" aria-pressed="${!off.has(k)}"><i aria-hidden="true"></i>${l} <b>${counts[k]}</b></button>`).join('');
      $('#fxNum').textContent = n; $('#fxNum').style.setProperty('--c', n ? 'var(--again)' : 'var(--good)');
      $('#fxStat').textContent = !text.trim() ? t('Chưa có nội dung') : n ? t('{n} lỗi cần xem', { n }) : t('Không thấy lỗi nào');
      $('#fxAllT').textContent = t('Sửa nhanh {n} lỗi an toàn', { n: nSafe }); $('#fxAll').disabled = !nSafe;
      $('#fxCopy').disabled = !text.trim(); $('#fxUndo').disabled = !undo.length;
      const words = (text.match(/[A-Za-z][\w'’-]*/g) || []).length;
      $('#fxWc').textContent = t('{n} từ', { n: words });
      $('#fxList').innerHTML = vis.map(x => { const i = issues.indexOf(x), o = text.slice(x.s, x.e); return `<li><button type="button" class="fx-it fx-c-${x.type}${i === sel ? ' on' : ''}" data-i="${i}" aria-current="${i === sel}"><i aria-hidden="true"></i><span><b>${esc(t(x.title))}</b> · <s lang="en" translate="no">${esc(o.trim() || '␣')}</s> → <span lang="en" translate="no">${esc(x.reps[0] != null ? (x.reps[0] || t('(xóa)')) : '')}</span></span></button></li>`; }).join('');
      drawCard();
      grow();
    }
    function drawCard() {
      const box = $('#fxCard'), x = issues[sel];
      if (!x || off.has(x.type)) {
        box.innerHTML = text.trim() && !visible().length ? `<div class="card fx-ok">${window.Kit ? Kit.svg('win', 72) : '🎉'}<h3 style="margin:.4rem 0 .2rem">${t('Không thấy lỗi nào')}</h3><p class="small muted" style="margin:0">${t('Bộ soát offline bắt các lỗi hay gặp của người học – vẫn nên đọc lại một lượt.')}</p></div>` : '';
        return;
      }
      const vis = visible(), pos = vis.indexOf(x), o = text.slice(x.s, x.e);
      const g = (window.GRAMMAR || []).find(l => l.id === x.lesson);
      const lname = g ? (I18N.lang() === 'vi' ? g.title : (t(g.title) !== g.title ? t(g.title) : g.en)) : '';
      box.innerHTML = `<section class="card fx-card fx-c-${x.type}" aria-labelledby="fxCt"><h3 id="fxCt"><span class="fx-ty">${esc(tyName[x.type])}</span> · ${esc(t(x.title))}</h3>
        <div class="fx-orig" translate="no"><s lang="en">${esc(o.trim() || '␣')}</s></div>
        <div class="fx-reps">${x.reps.map((r, k) => `<button type="button" class="btn sm ${k ? '' : 'primary'}" data-rep="${k}" aria-label="${esc(t('Áp dụng: {r}', { r: r || t('(xóa)') }))}"><span lang="en" translate="no">${esc(r || t('(xóa)'))}</span>${x.levels && x.levels[k] ? ` <small>${esc(x.levels[k])}</small>` : ''}</button>`).join('')}</div>
        <p class="fx-why">${esc(t(x.why))}</p>
        <div class="row" style="gap:.4rem">${x.lesson ? `<a class="btn sm ghost" href="#/grammar/${esc(x.lesson)}">📐 ${lname ? esc(lname) : t('Học bài ngữ pháp liên quan')}</a>` : ''}${usageOf(x) ? `<a class="btn sm ghost" href="#/usage/${encodeURIComponent(usageOf(x))}">📘 ${t('Cách dùng “{w}”', { w: usageOf(x) })}</a>` : ''}<button type="button" class="btn sm ghost" id="fxIgn">🙈 ${t('Bỏ qua lỗi này')}</button><button type="button" class="btn sm ghost" id="fxAi">🤖 ${t('Giải thích bằng AI')}</button></div>
        <div id="fxAiOut" class="fx-ai" aria-live="polite"></div>
        <div class="fx-nav"><button type="button" class="btn sm" id="fxPrev" ${pos <= 0 ? 'disabled' : ''}>‹ ${t('Lỗi trước')}</button><span class="small muted">${pos + 1}/${vis.length}</span><button type="button" class="btn sm" id="fxNext" ${pos >= vis.length - 1 ? 'disabled' : ''}>${t('Lỗi sau')} ›</button></div></section>`;
      $$('[data-rep]', box).forEach(b => b.onclick = () => apply([{ x, rep: x.reps[+b.dataset.rep] }], true));
      $('#fxIgn').onclick = () => { ignored.add(key(x)); ss('fx.ign', JSON.stringify([...ignored].slice(-200))); sel = -1; check(); toast(t('Đã bỏ qua')); };
      $('#fxPrev').onclick = () => pick(issues.indexOf(vis[pos - 1]), true);
      $('#fxNext').onclick = () => pick(issues.indexOf(vis[pos + 1]), true);
      $('#fxAi').onclick = () => explainAI(x);
    }
    // Lỗi giới từ / mẫu câu → trang "Cách dùng từ" của đúng từ đó (chỉ mục nhỏ LK_USAGE_IDX, tải cùng trang)
    const USE_RULE = { 'lk:despite-of': 'despite', 'lk:although-but': 'although', 'lk:because-so': 'because', 'lk:other-hand': 'on the other hand', 'lk:since-for': 'since-for', 'lk:look-fwd': 'look forward to' };
    const USE_SCAN = new Set(['lk:dep-prep', 'lk:discuss-about', 'lk:ger', 'lk:make-to', 'lk:explain-me', 'lk:be-agree', 'lk:modal-to']);
    function usageOf(x) {
      const I = window.LK_USAGE_IDX; if (!I) return '';
      const has = k => I.w[k] || I.id[k];
      if (USE_RULE[x.rule]) return has(USE_RULE[x.rule]) ? USE_RULE[x.rule] : '';
      if (!USE_SCAN.has(x.rule)) return '';
      const inSpan = (text.slice(x.s, x.e).toLowerCase().match(/[a-z]+/g) || []).reverse(), before = (text.slice(Math.max(0, x.s - 40), x.s).toLowerCase().match(/[a-z]+/g) || []).slice(-3).reverse();
      for (const w of [...inSpan, ...before]) for (const c of [w, w.replace(/ies$/, 'y'), w.replace(/ied$/, 'y'), w.replace(/e?s$/, ''), w.replace(/e?d$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), { made: 'make', went: 'go' }[w] || '']) if (c && c.length > 1 && I.w[c]) return c;
      return '';
    }
    function pick(i, focusCard) {
      sel = i; draw();
      if (focusCard) { const b = $('#fxCard [data-rep]'); if (b) b.focus(); }
    }
    // Áp dụng sửa từ cuối lên đầu → vị trí các lỗi phía trước không lệch
    function apply(list, next) {
      if (!list.length) return;
      undo.push(text); if (undo.length > 30) undo.shift();
      const at = list[0].x.s;
      [...list].sort((a, b) => b.x.s - a.x.s).forEach(({ x, rep }) => { text = text.slice(0, x.s) + rep + text.slice(x.e); });
      ta.value = text; sel = -1; save(); check();
      if (next) { const vis = visible(), nx = vis.find(y => y.s >= at); if (nx) sel = issues.indexOf(nx), draw(); }
      toast(list.length > 1 ? t('Đã sửa {n} lỗi', { n: list.length }) : t('Đã sửa'));
    }
    const fixedText = () => { let s = text; visible().filter(safe).sort((a, b) => b.s - a.s).forEach(x => { s = s.slice(0, x.s) + x.reps[0] + s.slice(x.e); }); return s; };
    function save() { clearTimeout(saveT); saveT = setTimeout(() => Store.set('fixDraft', text.slice(0, MAXLEN)), 500); }
    // AI: chỉ gửi đúng câu có lỗi, khi người học tự bấm
    async function explainAI(x) {
      const out = $('#fxAiOut'), btn = $('#fxAi');
      if (!window.AI || !AI.ask) { out.innerHTML = `<p class="small muted">${t('AI chưa sẵn sàng trên thiết bị này.')}</p>`; return; }
      const a = Math.max(text.lastIndexOf('.', x.s - 1), text.lastIndexOf('!', x.s - 1), text.lastIndexOf('?', x.s - 1), text.lastIndexOf('\n', x.s - 1)) + 1;
      const ends = ['.', '!', '?', '\n'].map(c => text.indexOf(c, x.e)).filter(i => i >= 0), b = ends.length ? Math.min(...ends) + 1 : text.length;
      const sentence = text.slice(a, b).trim().slice(0, 400), wrong = text.slice(x.s, x.e);
      const L = I18N.learnLang(), lang = L === 'vi' ? 'Vietnamese' : ((I18N.LANGS[L] || ['English'])[0]);
      btn.disabled = true; out.innerHTML = `<p class="small muted">⏳ ${t('AI đang giải thích…')}</p>`;
      try {
        const r = await AI.ask(`An English learner wrote this sentence: "${sentence}". An automatic checker flagged "${wrong}" (${x.type}) and suggests: ${x.reps.map(s => `"${s}"`).join(' or ') || 'removing it'}. Explain the mistake simply for a learner, in ${lang}. Return ONLY JSON: {"explain": string (2-3 short sentences, in ${lang}), "corrected": string (the full corrected sentence in English), "examples": [string] (2 short correct English example sentences using the same rule), "tip": string (one memory tip, in ${lang})}`);
        out.innerHTML = `<div class="ai-ex small" translate="no"><p style="margin:.2rem 0">${esc(r.explain || '')}</p>${r.corrected ? `<p style="margin:.3rem 0">✓ <b lang="en">${esc(r.corrected)}</b></p>` : ''}${(r.examples || []).slice(0, 3).map(e => `<div lang="en">• ${esc(e)}</div>`).join('')}${r.tip ? `<p style="margin:.4rem 0 0">💡 ${esc(r.tip)}</p>` : ''}</div>`;
      } catch (e) {
        if (e.message === 'PROXY_QUOTA') UI.quota(e.q);
        out.innerHTML = `<p class="small">⚠️ ${esc(e.message === 'PROXY_QUOTA' ? UI.quotaText(e.q) : AI.errText(e))}${e.message === 'BAD_KEY' ? ` <button type="button" class="btn sm" id="fxKey">${t('Nhập khóa')}</button>` : ''}</p>`;
        const k = $('#fxKey'); if (k) k.onclick = () => AI.keyDialog();
      } finally { btn.disabled = false; }
    }
    // ----- sự kiện -----
    ta.oninput = () => { text = ta.value; save(); grow(); clearTimeout(timer); timer = setTimeout(check, 280); hl.innerHTML = esc(text) + '\n '; };
    const caret = () => { const p = ta.selectionStart; if (ta.selectionEnd !== p) return; const i = issues.findIndex(x => !off.has(x.type) && p >= x.s && p <= x.e && x.e > x.s); if (i >= 0 && i !== sel) { sel = i; draw(); } };
    ta.onclick = caret; ta.onkeyup = e => { if (/^Arrow|Home|End/.test(e.key)) caret(); };
    $('#fxLg').onclick = e => { const b = e.target.closest('[data-ty]'); if (!b) return; const k = b.dataset.ty; off.has(k) ? off.delete(k) : off.add(k); ss('fx.off', JSON.stringify([...off])); draw(); };
    $('#fxList').onclick = e => { const b = e.target.closest('[data-i]'); if (b) pick(+b.dataset.i, true); };
    $('#fxAll').onclick = () => apply(visible().filter(safe).map(x => ({ x, rep: x.reps[0] })), false);
    $('#fxUndo').onclick = () => { if (!undo.length) return; text = undo.pop(); ta.value = text; sel = -1; save(); check(); };
    $('#fxCopy').onclick = async () => { const s = fixedText(); try { await navigator.clipboard.writeText(s); toast('✓ ' + t('Đã sao chép bản đã sửa')); } catch (e) { UI.modal(`<h2 style="margin-top:0">📋 ${t('Bản đã sửa')}</h2><textarea class="input" rows="8" lang="en" aria-label="${t('Bản đã sửa')}" readonly>${esc(s)}</textarea>`); } };
    $('#fxSample').onclick = () => { if (text.trim()) undo.push(text); text = SAMPLE; ta.value = text; sel = -1; save(); check(); };
    $('#fxClear').onclick = () => { if (!text) return; undo.push(text); text = ''; ta.value = ''; sel = -1; save(); check(); ta.focus(); };
    check();
    if (!text) ta.focus();
    App.cleanups.push(() => { clearTimeout(timer); if (saveT) { clearTimeout(saveT); Store.set('fixDraft', text.slice(0, MAXLEN)); } });
  });
})();
