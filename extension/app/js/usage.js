/* 📘 Cách dùng từ – #/usage (trang chính + chuyên mục ?c=prep|verb|adv|struct|pair) và #/usage/<từ hoặc mã cấu trúc>.
 * Mỗi từ: từ loại & họ từ · giới từ đi kèm · mẫu động từ · trạng từ (dạng, vị trí) · cấu trúc câu · từ dễ nhầm · collocation · văn phong ·
 * lỗi hay gặp ❌/✅ · bài ngữ pháp liên quan · luyện nhanh 3–5 câu (ChoiceKit) · lưu cụm vào sổ · nghe (TTS). Từ chưa có dữ liệu → trang dự phòng.
 * Bộ máy & dữ liệu: web/js/usage-core.js (LK_USAGE), web/js/usage/*.js (tải theo nhóm, App.need('uP'…)), chỉ mục web/js/usage-index.js.
 * Ghi chú soạn tiếng Việt + tiếng Anh: giao diện tiếng Việt/tiếng Anh hiện đúng bản; ngôn ngữ khác → bản tiếng Việt qua contentTranslate
 * (cụm tiếng Anh bọc translate="no" nên không bị dịch), chưa dịch xong thì ẩn, quá 3,5 s thì hiện bản tiếng Anh – không bao giờ lộ tiếng Việt. */
(function () {
  const { $, $$, esc, toast, speak } = UI;
  const App = window.App, { state, routes } = App, view = App.view, U = window.LK_USAGE;
  if (!U) return;
  const BUNDLE = { p: 'uP', v: 'uV', a: 'uA', s: 'uS', c: 'uC' };
  const CAT = { prep: 'p', verb: 'v', adv: 'a', struct: 's', pair: 'c' };
  const need = kinds => App.need(...[...new Set(String(kinds || '').split(''))].filter(k => BUNDLE[k]).map(k => BUNDLE[k])).catch(() => {});
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  const enc = encodeURIComponent;
  const IDX = () => window.LK_USAGE_IDX || { w: {}, id: {}, l: {} };

  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.us-search{position:relative;max-width:640px}.us-search .search{margin:0}
.us-list{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 6px);margin:0;padding:.3rem;list-style:none;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);max-height:min(340px,60vh);overflow:auto}
.us-opt{display:flex;gap:.6rem;align-items:baseline;padding:.6rem .8rem;border-radius:10px;cursor:pointer}.us-opt b{font-size:1.02rem}.us-opt small{color:var(--muted);margin-left:auto;white-space:nowrap}
.us-opt[aria-selected=true],.us-opt:hover{background:var(--primary-soft)}
.us-hero{margin-top:1rem;position:relative;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--primary) 10%,var(--surface)),var(--surface) 62%)}
.us-top{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem;flex-wrap:wrap}
.us-word{font-size:clamp(2rem,6vw,2.6rem);font-weight:800;letter-spacing:-.02em;line-height:1.05;margin:0;overflow-wrap:anywhere}
.us-badges{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem}
.us-b{display:inline-flex;align-items:center;gap:.25rem;padding:.18rem .6rem;border-radius:999px;font-size:.78rem;font-weight:700;background:var(--surface-2);color:var(--muted)}
.us-b.p{background:var(--primary-soft);color:var(--primary-text)}.us-b.a{background:var(--accent-soft);color:var(--accent-text)}.us-b.g{background:var(--good-soft);color:var(--good-text)}
.us-mean{margin:.55rem 0 0;color:var(--muted)}
.us-acts{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.8rem}
.us-jump{display:flex;gap:.35rem;overflow-x:auto;margin:.9rem -.2rem 0;padding:.2rem;scrollbar-width:none}.us-jump::-webkit-scrollbar{display:none}
.us-jump a{flex:none;font-size:.82rem;font-weight:700;padding:.35rem .75rem;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--text);min-height:36px;display:inline-flex;align-items:center}
.us-jump a:hover,.us-jump a:focus-visible{border-color:var(--primary);color:var(--primary-text)}
.us-sec{margin-top:1rem;scroll-margin-top:5rem}.us-sec>h2{display:flex;align-items:center;gap:.45rem;font-size:1.15rem;margin:0 0 .3rem}
.us-sec>.us-sub{margin:0 0 .8rem;color:var(--muted);font-size:.9rem}
.us-items{display:grid;gap:.6rem}
.us-it{border:1px solid var(--line);border-radius:14px;padding:.75rem .9rem;background:var(--surface)}
.us-ih{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
.us-ph{font-size:1.08rem;font-weight:800}.us-ph .pr{color:var(--primary-text)}
.us-f{font-family:inherit;font-size:.82rem;font-weight:800;background:var(--accent-soft);color:var(--accent-text);border-radius:8px;padding:.15rem .55rem;white-space:normal}
.us-im{margin:.3rem 0 0;font-size:.93rem}
.us-ex{display:flex;align-items:flex-start;gap:.4rem;margin:.5rem 0 0;padding:.45rem .7rem;border-left:4px solid var(--accent);background:var(--accent-soft);border-radius:0 12px 12px 0}
.us-ex>span{flex:1;min-width:0}.us-ex mark{background:transparent;color:var(--primary-text);font-weight:800;text-decoration:underline;text-decoration-thickness:2px;text-underline-offset:3px}
.us-it .us-save{margin-left:auto}
.us-tip{margin:.7rem 0 0;padding:.6rem .85rem;background:var(--gold-soft);border-radius:12px;font-size:.92rem}
.us-tip b,.us-k{font-weight:700}.us-k{font-style:normal;color:var(--primary-text)}
.us-tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.us-table{width:100%;border-collapse:collapse;font-size:.93rem}.us-table th,.us-table td{padding:.55rem .7rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
.us-table tr:last-child>*{border-bottom:0}.us-table thead th{background:var(--surface-2);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.us-table tbody th{font-weight:800;color:var(--accent-text);white-space:nowrap}
.us-pos{display:flex;flex-wrap:wrap;gap:.4rem;margin:.6rem 0 0}.us-pos span{font-size:.8rem;font-weight:700;border-radius:8px;padding:.2rem .55rem;background:var(--primary-soft);color:var(--primary-text)}
.us-formula{display:block;font-size:1.02rem;font-weight:800;padding:.6rem .8rem;border-radius:12px;background:var(--surface-2);border:1px dashed var(--line);overflow-wrap:anywhere}
.us-mis{display:grid;gap:.5rem}.us-mis>div{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--again);border-radius:0 14px 14px 0;padding:.6rem .9rem}
.us-mis .bad{color:var(--again-text);font-weight:800}.us-mis .good{color:var(--good-text);font-weight:800}.us-mis s{text-decoration-thickness:2px}
.us-chips{display:flex;flex-wrap:wrap;gap:.4rem}.us-chips a,.us-chips button{font:inherit;font-size:.9rem;padding:.35rem .8rem;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--text);font-weight:600;cursor:pointer;min-height:36px;display:inline-flex;align-items:center;gap:.3rem;transition:border-color .15s,transform .15s}
.us-chips a:hover,.us-chips button:hover{border-color:var(--primary);transform:translateY(-1px)}.us-chips small{color:var(--muted);font-weight:600}
.us-reg{display:grid;gap:.5rem}.us-reg>div{display:flex;gap:.6rem;align-items:flex-start}
.us-cats{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.7rem;margin-top:1rem}
.us-cat{display:flex;flex-direction:column;gap:.35rem;padding:1rem;border-radius:18px;border:1px solid var(--line);background:var(--surface);color:var(--text);transition:transform .15s,box-shadow .15s,border-color .15s}
.us-cat:hover,.us-cat:focus-visible{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--primary)}
.us-cat .ic{font-size:1.6rem}.us-cat b{font-size:1.05rem}.us-cat small{color:var(--muted)}.us-cat .n{margin-top:auto;font-size:.8rem;font-weight:800;color:var(--accent-text)}
.us-bar{display:flex;flex-wrap:wrap;align-items:center;gap:.6rem;margin:1rem 0 .6rem}
.us-seg{display:flex;flex-wrap:wrap;gap:.25rem;padding:.25rem;background:var(--surface-2);border-radius:12px}
.us-seg button{border:0;background:transparent;padding:.4rem .75rem;border-radius:9px;font-weight:700;color:var(--muted);cursor:pointer;min-height:36px;font-size:.88rem}
.us-seg button[aria-pressed=true]{background:var(--surface);color:var(--text);box-shadow:var(--shadow-sm)}
.us-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:.45rem}
.us-row{display:flex;flex-direction:column;gap:.15rem;padding:.6rem .8rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);min-width:0;transition:border-color .15s,background .15s}
.us-row:hover,.us-row:focus-visible{border-color:var(--primary);background:var(--primary-soft)}
.us-row b{font-size:1rem}.us-row b .pr{color:var(--primary-text)}.us-row small{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.us-pair{display:flex;align-items:center;justify-content:center;gap:.5rem;flex-wrap:wrap;font-weight:800}.us-pair i{font-style:normal;color:var(--muted);font-weight:600}
.us-qs{list-style:none;margin:0;padding:0;display:grid;gap:.9rem;counter-reset:q}
.us-q{border:1px solid var(--line);border-radius:14px;padding:.8rem .9rem;background:var(--surface)}
.us-q>p{margin:0 0 .55rem;font-size:1.02rem;font-weight:600}.us-q>p::before{counter-increment:q;content:counter(q) ". ";color:var(--muted)}
.us-blank{display:inline-block;min-width:4.5em;border-bottom:2px solid var(--muted);margin:0 .15em}
.us-opts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:.4rem}
.us-opts label{display:flex;align-items:center;gap:.5rem;padding:.55rem .75rem;border:1px solid var(--line);border-radius:12px;cursor:pointer;min-height:44px;background:var(--surface);transition:border-color .15s,background .15s}
.us-opts label:hover{border-color:var(--primary)}.us-opts label:focus-within{outline:3px solid var(--primary);outline-offset:1px}
.us-opts input{accent-color:var(--primary);width:1.1rem;height:1.1rem;flex:none;margin:0}
.us-opts .k{font-size:.72rem;font-weight:800;color:var(--muted);border:1px solid var(--line);border-radius:6px;padding:0 .35rem}
.us-opts label.ok{border-color:var(--good);background:var(--good-soft);color:var(--good-text);font-weight:800}
.us-opts label.bad{border-color:var(--again);background:var(--again-soft);color:var(--again-text)}
.us-opts label.struck{text-decoration:line-through;opacity:.7}
.us-fb{margin:.5rem 0 0;font-size:.92rem}.us-fb .ok{color:var(--good-text);font-weight:800}.us-fb .bad{color:var(--again-text);font-weight:800}
.us-score{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;margin-top:.9rem;padding:.7rem .9rem;border-radius:14px;background:var(--surface-2)}
.us-score b{font-size:1.3rem}
.us-empty{text-align:center;padding:1.4rem 1rem}
.us-posx{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.6rem}.us-posx>div{background:var(--surface-2);border-radius:14px;padding:.75rem .85rem}.us-posx h3{font-size:.95rem;margin:0 0 .3rem}
@media (max-width:720px){.us-posx{grid-template-columns:1fr}.us-table{font-size:.88rem}.us-opts{grid-template-columns:1fr 1fr}}@media (max-width:560px){.us-table thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.us-table,.us-table tbody,.us-table tr,.us-table th,.us-table td{display:block;width:auto}.us-table tr{padding:.6rem .75rem;border-bottom:1px solid var(--line)}.us-table tr:last-child{border-bottom:0}.us-table tbody th,.us-table td{padding:.15rem 0;border:0;white-space:normal}.us-table td:last-child{color:var(--muted)}}
@media (prefers-reduced-motion:reduce){.us-cat,.us-chips a,.us-chips button{transition:none}.us-cat:hover,.us-chips a:hover{transform:none}}`;
    document.head.appendChild(s);
  }

  // ---------- Chữ: ghi chú vi/en theo ngôn ngữ người học ----------
  const L = () => (window.I18N && I18N.learnLang ? I18N.learnLang() : 'vi');
  // *cụm tiếng Anh* → giữ nguyên khi dịch; **đậm**
  const fmt = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\*([^*]+)\*/g, '<i class="us-k" lang="en" translate="no">$1</i>');
  let pend = [], settleT = 0;
  function tx(vi, en) {
    const l = L();
    if (!vi && !en) return '';
    if (l === 'vi' && vi) return `<span class="us-tx">${fmt(vi)}</span>`;
    if (l === 'en' || !vi) return `<span class="us-tx" lang="en">${fmt(en || vi)}</span>`;
    pend.push(en || '');
    return `<span class="us-tx tr-wait" data-uen="${pend.length - 1}">${fmt(vi)}</span>`;
  }
  // Nghĩa: người Việt chọn "định nghĩa tiếng Anh" → hiện bản tiếng Anh
  const mean = (vi, en) => (L() === 'vi' && I18N.meanLang && I18N.meanLang() === 'en' && en ? `<span class="us-tx" lang="en">${fmt(en)}</span>` : tx(vi, en));
  // Ngôn ngữ khác: chờ contentTranslate dịch phần tiếng Việt; quá 3,5 s (offline/lỗi) → hiện bản tiếng Anh
  function settle() {
    clearTimeout(settleT);
    if (!pend.length) return;
    const list = pend;
    settleT = setTimeout(() => { $$('.us-tx.tr-wait[data-uen]', view).forEach(el => { const en = list[+el.dataset.uen]; if (en != null && en !== '') { el.innerHTML = fmt(en); el.setAttribute('lang', 'en'); } el.classList.remove('tr-wait'); }); }, 3500);
  }
  const EN = s => `<span lang="en" translate="no">${esc(s)}</span>`;
  const accent = () => state.settings.accent || 'en-GB';
  const sayBtn = (txt, label) => `<button type="button" class="icon-btn sm" data-usay="${esc(txt)}" aria-label="${esc((label || t('Nghe')) + ': ' + String(txt).slice(0, 80))}">🔊</button>`;
  // Ví dụ: "She is interested [in] art." → tô đậm phần trọng tâm, nút nghe
  const exHtml = s => { const x = U.example(s); return `<p class="us-ex"><span lang="en" translate="no">${esc(x.pre)}${x.ans ? `<mark>${esc(x.ans)}</mark>` : ''}${esc(x.post)}</span>${sayBtn(x.text, t('Nghe câu ví dụ'))}</p>`; };
  const exText = s => U.example(s).text;
  const POSL = () => ({ a: 'tính từ', v: 'động từ', n: 'danh từ', adv: 'trạng từ' });
  const posName = p => (I18N.lang() === 'vi' ? p : ({ 'tính từ': 'adjective', 'động từ': 'verb', 'danh từ': 'noun', 'trạng từ': 'adverb' }[p] || p)); // thuật ngữ từ loại chuẩn tiếng Anh ở giao diện khác (như UI.posChip)
  const posOf = h => { const m = /\(([^)]+)\)\s*$/.exec(h || ''); return m ? m[1] : ''; };
  const headOf = h => String(h || '').replace(/\s*\([^)]*\)\s*$/, '');
  // Mã mẫu động từ → công thức tiếng Anh (nội dung học, không dịch) + tên gọi
  const VF = { to: '+ to-V', ing: '+ V-ing', oto: '+ O + to-V', obare: '+ O + V', bare: '+ V', that: '+ that-clause', sub: '+ that + S + (should) V', oing: '+ O + V-ing', ov3: '+ O + V3', wh: '+ how/what… + to-V', pass: 'be + V3 + to-V', ping: '+ preposition + V-ing', oo: '+ O + O', o: '+ O' };
  const VN = () => ({ to: t('động từ nguyên mẫu có to'), ing: t('danh động từ (V-ing)'), oto: t('tân ngữ + to-V'), obare: t('tân ngữ + V nguyên mẫu (không to)'), bare: t('V nguyên mẫu (không to)'), that: t('mệnh đề that'), sub: t('that + chủ ngữ + V nguyên mẫu'), oing: t('tân ngữ + V-ing'), ov3: t('tân ngữ + V3 (nhờ người khác làm)'), wh: t('từ để hỏi + to-V'), pass: t('dạng bị động'), ping: t('giới từ + V-ing'), oo: t('hai tân ngữ'), o: t('tân ngữ trực tiếp, không giới từ') });
  const AT = () => ({ irr: t('Dạng đặc biệt'), freq: t('Tần suất'), deg: t('Mức độ'), time: t('Thời gian'), link: t('Từ nối'), focus: t('Nhấn mạnh'), view: t('Quan điểm'), man: t('Cách thức') });
  const POSN = () => ({ front: [t('Đầu câu'), t('Trước chủ ngữ, thường có dấu phẩy.')], mid: [t('Giữa câu'), t('Trước động từ thường; sau be và trợ động từ.')], end: [t('Cuối câu'), t('Sau động từ và tân ngữ.')] });
  const REG = () => ({ formal: ['🎩', t('Trang trọng')], informal: ['💬', t('Thân mật')], academic: ['🎓', t('Học thuật · hợp IELTS Writing')], spoken: ['🗣️', t('Văn nói')], neutral: ['⚖️', t('Trung tính')] });
  const PREP_SUB = () => ({ a: t('Tính từ + giới từ'), v: t('Động từ + giới từ'), n: t('Danh từ + giới từ') });
  // Tên bài ngữ pháp (chỉ mục sinh sẵn: id → [vi, en]); ngôn ngữ khác: bản dịch giao diện nếu có, không thì tiếng Anh
  const lessonName = id => { const x = (IDX().l || {})[id]; if (!x) return id; if (I18N.lang() === 'vi') return x[0]; const tr = t(x[0]); return tr !== x[0] ? tr : x[1]; };
  const lessonLink = id => `<a class="btn sm ghost" href="#/grammar/${esc(id)}">📐 ${esc(lessonName(id))}</a>`;
  const wordLink = (w, label) => { const k = U.resolve(w); return `<a href="#/${k ? 'usage' : 'dict'}/${enc(k || w)}" lang="en" translate="no">${esc(label || w)}</a>`; };

  // ---------- Lưu cụm/từ vào sổ ----------
  let saves = [];
  const saveBtn = (word, vi, en, ex, big) => { saves.push({ word, vi, en, ex }); const on = App.inDeck && App.inDeck(word); return `<button type="button" class="btn sm ${big ? 'primary' : 'ghost'} us-save" data-usave="${saves.length - 1}" ${on ? 'disabled' : ''} aria-label="${esc((on ? t('Đã lưu') : t('Lưu vào sổ')) + ': ' + word)}">${on ? '✓ ' + t('Đã lưu') : '＋ ' + t('Lưu vào sổ')}</button>`; };
  async function doSave(b) {
    const x = saves[+b.dataset.usave]; if (!x) return;
    b.disabled = true;
    try {
      const lib = window.IELTS_DATA && IELTS_DATA.INDEX[x.word.toLowerCase()];
      const entry = lib && !/\s/.test(x.word) ? { ...lib } : { word: x.word, vi: x.vi || '', def: x.en || '', pos: /\s/.test(x.word) ? 'phrase' : '', ex: x.ex || '', emoji: '📘', topic: 'usage' };
      await App.addWord(entry, x.ex ? { text: x.ex, title: 'Lexkite' } : null);
      b.innerHTML = '✓ ' + t('Đã lưu'); b.setAttribute('aria-label', t('Đã lưu') + ': ' + x.word);
      toast('✓ ' + t('Đã lưu “{w}” vào sổ từ', { w: x.word }));
    } catch (e) { b.disabled = false; toast(t('Không lưu được – thử lại sau')); }
  }
  function bind() {
    view.onclick = e => {
      const s = e.target.closest && e.target.closest('[data-usay]'); if (s) { e.preventDefault(); speak(s.dataset.usay, accent()); return; }
      const v = e.target.closest && e.target.closest('[data-usave]'); if (v) { e.preventDefault(); doSave(v); }
    };
    App.onCleanup(() => { view.onclick = null; clearTimeout(settleT); });
  }

  // ---------- Ô tìm kiếm (combobox, gợi ý từ chỉ mục) ----------
  const KL = () => ({ p: t('giới từ'), v: t('mẫu động từ'), a: t('trạng từ'), s: t('cấu trúc'), c: t('dễ nhầm') });
  function searchBox(val) {
    return `<div class="us-search"><form class="search" id="usForm" role="search" autocomplete="off">
      <input class="input" id="usQ" value="${esc(val)}" placeholder="${t('Gõ một từ, ví dụ: interested, depend, stop')}" aria-label="${t('Tìm cách dùng của từ')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="usList" spellcheck="false" autocapitalize="off" autocorrect="off" lang="en">
      <button class="btn primary lg">${t('Xem')}</button></form><ul class="us-list" id="usList" role="listbox" aria-label="${t('Gợi ý từ')}" hidden></ul></div>`;
  }
  function bindSearch() {
    const inp = $('#usQ'), list = $('#usList'); if (!inp) return;
    let items = [], cur = -1, timer = 0;
    const go = v => { v = String(v || '').trim(); if (!v) return; location.hash = '#/usage/' + enc(U.resolve(v) || v.toLowerCase()); };
    const close = () => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); cur = -1; };
    const mark = i => { cur = i; $$('.us-opt', list).forEach((o, k) => o.setAttribute('aria-selected', String(k === i))); if (i >= 0) { inp.setAttribute('aria-activedescendant', 'uso' + i); const o = $('#uso' + i); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'nearest' }); } };
    const draw = () => {
      items = U.suggest(inp.value, 8); const K = KL();
      if (!items.length || !inp.value.trim()) return close();
      list.innerHTML = items.map((x, i) => `<li class="us-opt" id="uso${i}" role="option" aria-selected="false" data-v="${esc(x)}"><b lang="en" translate="no">${esc(x)}</b><small>${esc([...(IDX().w[x] || '')].map(k => K[k]).join(' · '))}</small></li>`).join('');
      list.hidden = false; inp.setAttribute('aria-expanded', 'true'); cur = -1;
    };
    inp.oninput = () => { clearTimeout(timer); timer = setTimeout(draw, 80); };
    inp.onkeydown = e => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); if (list.hidden) draw(); mark((cur + 1) % items.length); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); mark(cur <= 0 ? items.length - 1 : cur - 1); }
      else if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); go(items[cur]); }
    };
    inp.onblur = () => setTimeout(close, 150);
    list.onmousedown = e => { const o = e.target.closest('.us-opt'); if (o) { e.preventDefault(); go(o.dataset.v); } };
    $('#usForm').onsubmit = e => { e.preventDefault(); go(inp.value); };
  }
  const head = () => `<div class="page-head"><div><h1>📘 ${t('Cách dùng từ')}</h1><p class="muted">${t('Giới từ đi kèm, mẫu động từ, vị trí trạng từ, cấu trúc câu và từ dễ nhầm – có ví dụ, lỗi hay gặp và bài luyện nhanh.')}</p></div></div>`;
  const back = () => `<p class="small" style="margin:.6rem 0 0"><a href="#/usage" style="color:var(--primary-text)">‹ ${t('Mọi chuyên mục')}</a></p>`;
  const CATS = () => [
    ['prep', '🧷', t('Giới từ đi kèm'), t('Tính từ, động từ, danh từ + giới từ: interested in, depend on, reason for…'), 'p'],
    ['verb', '🧩', t('Động từ + to-V / V-ing'), t('enjoy doing, decide to do, stop/remember/try đổi nghĩa, make sb do…'), 'v'],
    ['adv', '📍', t('Trạng từ & vị trí'), t('hard/hardly, late/lately, always đứng đâu, -ly viết thế nào'), 'a'],
    ['struct', '🏗️', t('Cấu trúc câu hay (IELTS)'), t('It is + adj + to-V, too/enough, so/such…that, despite/although…'), 's'],
    ['pair', '⚖️', t('Từ dễ nhầm'), t('affect/effect, say/tell, make/do, borrow/lend…'), 'c'],
  ];
  const catCount = k => (k === 's' || k === 'c') ? Object.values(IDX().id).filter(x => x === k).length : Object.values(IDX().w).filter(x => x.includes(k)).length;

  // ---------- Trang chính ----------
  function landing() {
    const chip = w => `<a href="#/usage/${enc(w)}" lang="en" translate="no">${esc(w)}</a>`;
    view.innerHTML = head() + searchBox('')
      + `<h2 class="set-h hub-h">⭐ ${t('Hay tra nhất')}</h2><div class="us-chips">${'interested depend good arrive responsible stop remember suggest hard late affect despite'.split(' ').map(chip).join('')}</div>
      <h2 class="set-h hub-h">📚 ${t('Chuyên mục')}</h2><div class="us-cats">${CATS().map(([id, ic, n, d, k]) => `<a class="us-cat" href="#/usage?c=${id}"><span class="ic" aria-hidden="true">${ic}</span><b>${esc(n)}</b><small>${esc(d)}</small><span class="n">${t('{n} mục', { n: catCount(k) })} ›</span></a>`).join('')}</div>
      <section class="card us-sec"><h2>💡 ${t('Học cách dùng thế nào cho nhớ?')}</h2><ul style="margin:.3rem 0 0;padding-left:1.1rem;display:grid;gap:.3rem">
        <li>${t('Học cả cụm, không học từ lẻ: “interested in”, không chỉ “interested”.')}</li>
        <li>${t('Đọc to câu ví dụ – tai nhớ giới từ tốt hơn mắt.')}</li>
        <li>${t('Lưu cụm vào sổ để được nhắc ôn đúng lúc sắp quên.')}</li>
        <li>${t('Làm bài luyện nhanh ở cuối mỗi trang để kiểm tra lại ngay.')}</li></ul></section>`;
    bindSearch(); bind();
    const q = $('#usQ'); if (q && !matchMedia('(pointer: coarse)').matches) q.focus();
  }

  // ---------- Chuyên mục ----------
  async function category(id) {
    const k = CAT[id]; if (!k) return landing();
    const [, ic, name, desc] = CATS().find(x => x[0] === id);
    view.innerHTML = head() + `<div class="skel" style="height:240px;border-radius:18px;margin-top:1rem" aria-busy="true"></div>`;
    await need(k);
    const my = location.hash;
    if (!/^#\/usage/.test(my)) return;
    const all = U.list(k);
    let sub = ss('us.sub.' + id) || '', q = '';
    const FIL = {
      p: () => [['', t('Tất cả')], ...Object.entries(PREP_SUB())],
      v: () => [['', t('Tất cả')], ['to', '+ to-V'], ['ing', '+ V-ing'], ['both', t('Cả hai – đổi nghĩa')], ['oto', '+ O + to-V'], ['obare', '+ O + V'], ['that', '+ that'], ['o', t('Không giới từ')]],
      a: () => [['', t('Tất cả')], ...Object.entries(AT())],
      s: () => [['', t('Tất cả')], ['ielts', t('Hợp IELTS Writing')]],
      c: () => [['', t('Tất cả')]],
    }[k]();
    if (!FIL.some(f => f[0] === sub)) sub = '';
    const PR = k === 'p' ? ['in', 'on', 'at', 'for', 'to', 'of', 'with', 'about', 'from'] : [];
    let prep = '';
    view.innerHTML = head() + back() + `<h2 style="margin:.6rem 0 0">${ic} ${esc(name)}</h2><p class="muted" style="margin:.2rem 0 0">${esc(desc)}</p>`
      + (k === 'a' ? posExplainer() : '')
      + `<div class="us-bar">${FIL.length > 1 ? `<div class="us-seg" role="group" aria-label="${t('Lọc theo nhóm')}" id="usSub">${FIL.map(([v, l]) => `<button type="button" data-v="${esc(v)}" aria-pressed="${v === sub}">${esc(l)}</button>`).join('')}</div>` : ''}
        <input class="input" id="usF" style="max-width:220px" placeholder="${t('Lọc nhanh…')}" aria-label="${t('Lọc danh sách')}" spellcheck="false" autocapitalize="off" lang="en"></div>
      ${PR.length ? `<div class="us-chips" role="group" aria-label="${t('Lọc theo giới từ')}" id="usPr" style="margin-bottom:.6rem">${PR.map(p => `<button type="button" data-p="${p}" aria-pressed="false" lang="en" translate="no">${p}</button>`).join('')}</div>` : ''}
      <p class="small muted" id="usCnt" aria-live="polite"></p><div id="usRows"></div>
      <section class="card us-sec" id="usQz" aria-labelledby="usQzH"></section>`;
    const codes = e => new Set(e.items.map(x => x.h));
    const keep = e => {
      if (k === 'p' && sub && e.sub !== sub) return false;
      if (k === 'p' && prep && !e.items.some(x => U.norm(x.h).split(' ').pop() === prep)) return false;
      if (k === 'v' && sub) { const c = codes(e); if (sub === 'both' ? !(c.has('to') && c.has('ing') && e.notes.length) : !c.has(sub)) return false; }
      if (k === 'a' && sub && e.sub !== sub) return false;
      if (k === 's' && sub === 'ielts' && !e.reg.some(r => r.r === 'academic')) return false;
      if (q) { const hay = U.norm([e.key, e.f, ...e.items.map(x => x.h), ...e.k].join(' ')); if (!hay.includes(q)) return false; }
      return true;
    };
    const rowP = e => `<a class="us-row" href="#/usage/${enc(e.key)}"><b lang="en" translate="no">${esc(e.key)} <span class="pr">${esc(e.items.map(x => x.h).join(' / '))}</span></b><small>${e.items.map(x => mean(x.vi, x.en)).slice(0, 2).join(' · ')}</small></a>`;
    const rowV = e => `<a class="us-row" href="#/usage/${enc(e.key)}"><b lang="en" translate="no">${esc(e.key)}</b><small translate="no" lang="en">${esc([...codes(e)].map(c => VF[c]).join('  ·  '))}</small></a>`;
    const rowA = e => `<a class="us-row" href="#/usage/${enc(e.key)}"><b lang="en" translate="no">${esc([...new Set(e.items.map(x => x.h))].join(' / '))}</b><small>${mean(e.items[0].vi, e.items[0].en)}</small></a>`;
    const rowS = e => `<a class="us-row" href="#/usage/${enc(e.key)}"><b lang="en" translate="no">${esc(e.f)}</b><small>${e.notes[0] ? tx(e.notes[0].vi, e.notes[0].en) : ''}</small></a>`;
    const rowC = e => `<a class="us-row" href="#/usage/${enc(e.key)}"><b class="us-pair" lang="en" translate="no">${e.items.map(x => esc(headOf(x.h))).join(' <i aria-hidden="true">↔</i> ')}</b><small>${e.items.map(x => mean(x.vi, x.en)).join(' · ')}</small></a>`;
    const ROW = { p: rowP, v: rowV, a: rowA, s: rowS, c: rowC }[k];
    const draw = () => {
      pend = [];
      const rows = all.filter(keep).sort((a, b) => (k === 's' || k === 'c') ? 0 : a.key.localeCompare(b.key));
      $('#usRows').innerHTML = rows.length ? `<div class="us-grid">${rows.map(ROW).join('')}</div>` : `<p class="muted">${t('Không có mục phù hợp.')}</p>`;
      $('#usCnt').textContent = t('{n} mục', { n: rows.length });
      settle();
    };
    $('#usF').oninput = e => { q = U.norm(e.target.value); draw(); };
    $$('#usSub button').forEach(b => b.onclick = () => { sub = b.dataset.v; ss('us.sub.' + id, sub); $$('#usSub button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
    $$('#usPr button').forEach(b => b.onclick = () => { prep = prep === b.dataset.p ? '' : b.dataset.p; $$('#usPr button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.p === prep))); draw(); });
    draw();
    quizBox($('#usQz'), all, t('Luyện nhanh cả chuyên mục'));
    bind();
  }
  // Ba vị trí của trạng từ
  const posExplainer = () => { const P = POSN(); return `<section class="card us-sec" aria-labelledby="usPx"><h2 id="usPx">📍 ${t('Trạng từ đứng ở đâu?')}</h2><div class="us-posx">
    <div><h3>${esc(P.front[0])}</h3><p class="small" style="margin:0 0 .4rem">${esc(P.front[1])}</p>${exHtml('[Fortunately], nobody was hurt.')}</div>
    <div><h3>${esc(P.mid[0])}</h3><p class="small" style="margin:0 0 .4rem">${esc(P.mid[1])}</p>${exHtml('She [always] walks to work.')}${exHtml('He is [often] late.')}</div>
    <div><h3>${esc(P.end[0])}</h3><p class="small" style="margin:0 0 .4rem">${esc(P.end[1])}</p>${exHtml('Read the instructions [carefully].')}</div></div>
    <p class="us-tip">⚠️ ${t('Không đặt trạng từ giữa động từ và tân ngữ: “speak English well”, không phải “speak well English”.')}</p>${lessonLink('adverbs-position')}</section>`; };

  // ---------- Lời giải đáp án (js/explain-card.js + js/explain/usage-<kind>/<lang>.json, docs/EXPLAIN.md) ----------
  let xcLoad = null;
  const xcScript = () => (window.ExplainCard ? Promise.resolve() : xcLoad || (xcLoad = new Promise((y, n) => { const s = document.createElement('script'); s.src = 'js/explain-card.js'; s.onload = y; s.onerror = () => { xcLoad = null; s.remove(); n(); }; document.head.appendChild(s); })));
  const xcFor = qs => xcScript().then(() => Promise.all([ExplainCard.ready(), ...[...new Set(qs.map(q => q.kind))].map(k => ExplainCard.load('usage-' + k))])).then(([, ...maps]) => Object.assign({}, ...maps));
  const lastW = h => String(h || '').trim().split(/\s+/).pop();
  // Mẫu dự phòng khi chưa có lời giải: tính/động/danh từ + giới từ
  const xcPattern = q => { if (q.kind !== 'p' || !q.item) return ''; const sub = (U.byId('p', q.key) || {}).sub; const k = q.key.replace(/\[|\]/g, ''); return sub === 'a' ? `be ${k} [${q.ans}] + N / V-ing` : sub === 'v' ? `${k} [${q.ans}] + N / V-ing` : `${k} [${q.ans}] + N`; };
  // Cùng nhóm: cụm khác dùng cùng giới từ (mở thẻ cách dùng)
  const xcFam = q => { if (q.kind !== 'p') return []; const p = lastW(q.ans), out = []; for (const e of U.load('p')) { if (e.key === q.key) continue; const it = e.items.find(x => lastW(x.h) === p); if (it) out.push({ w: e.key + ' ' + it.h, href: '#/usage/' + enc(e.key) }); if (out.length >= 6) break; } return out; };
  function xcHtml(q, map, ok, chosen, whyHtml) {
    const x = ExplainCard.pick(map[U.xid(q)]) || { p: xcPattern(q) };
    x.fam = xcFam(q);
    return ExplainCard.html(x, { ok, chosen, id: U.xid(q), whyHtml: x.why ? '' : whyHtml });
  }
  const xcHooks = qs => ({
    speak: s => speak(s, accent()),
    review: (id, b) => { const q = qs.find(z => U.xid(z) === id); if (!q) return; const w = (q.kind === 'p' ? q.key.replace(/\bsb\b\s*/, '') + ' ' + q.ans : q.ans).replace(/\s+/g, ' ').trim(); saves.push({ word: w, vi: q.item ? q.item.vi : '', en: q.item ? q.item.en : '', ex: q.pre + q.ans + q.post }); b.dataset.usave = saves.length - 1; doSave(b); },
    report: id => window.LexReportLoad && LexReportLoad().then(R => R && R.open({ cat: 'content', cid: 'explain:' + id })).catch(() => {})
  });

  // ---------- Bài luyện nhanh (ChoiceKit: phím A–D/1–4, nhấn giữ để gạch) ----------
  function quizBox(box, entries, title, n = 5) {
    if (!box) return;
    let seed = Date.now() % 100000;
    const run = () => {
      const qs = U.quiz(entries, n, seed);
      if (qs.length < 3) { box.remove(); return; }
      let done = 0, right = 0;
      box.innerHTML = `<h2 id="usQzH">🎯 ${esc(title || t('Luyện nhanh'))}</h2><p class="us-sub">${t('Chọn đáp án đúng – có kết quả ngay. Phím tắt: A–D hoặc 1–4.')}</p>
        <ol class="us-qs">${qs.map((q, i) => `<li class="us-q" data-i="${i}"><p lang="en" translate="no">${esc(q.pre)}<span class="us-blank"><span class="sr-only">${t('chỗ trống')}</span></span>${esc(q.post)}</p>
          <div class="us-opts" role="radiogroup" aria-label="${t('Câu {n}', { n: i + 1 })}">${q.choices.map((c, j) => `<label><input type="radio" name="usq${i}" value="${esc(c)}"><span class="k" aria-hidden="true">${'ABCD'[j]}</span><span lang="en" translate="no">${esc(c)}</span></label>`).join('')}</div>
          <div class="us-fb" aria-live="polite"></div></li>`).join('')}</ol><div id="usScore"></div>`;
      if (window.ChoiceKit) { try { ChoiceKit.attach(box.querySelector('.us-qs'), { key: 'usage:' + location.hash + ':' + seed }); } catch (e) { /* bỏ qua */ } }
      box.onchange = e => {
        const inp = e.target; if (!inp.matches || !inp.matches('input[type=radio]')) return;
        const li = inp.closest('.us-q'), q = qs[+li.dataset.i]; if (li.dataset.done) return;
        li.dataset.done = 1; done++;
        const ok = inp.value === q.ans; if (ok) right++;
        $$('input', li).forEach(x => { x.disabled = true; const lb = x.closest('label'); if (x.value === q.ans) lb.classList.add('ok'); else if (x === inp) lb.classList.add('bad'); });
        const full = q.pre + q.ans + q.post, why = q.item && (q.item.vi || q.item.en) ? mean(q.item.vi, q.item.en) : '';
        const fb = li.querySelector('.us-fb');
        pend = []; fb.innerHTML = `${ok ? `<span class="ok">✓ ${t('Chính xác!')}</span>` : `<span class="bad">✗ ${t('Chưa đúng.')}</span> ${t('Đáp án:')} <b lang="en" translate="no">${esc(q.ans)}</b>`} <span lang="en" translate="no">· ${esc(full)}</span> ${sayBtn(full, t('Nghe câu'))}${why ? `<br><span class="small muted us-why0">${why}</span>` : ''}`; settle();
        // Thẻ giải thích (mẫu · vì sao · vì sao sai · ví dụ · mẹo · cùng nhóm) – tải lười; lỗi mạng → giữ dòng nghĩa ở trên
        xcFor(qs).then(map => { if (!fb.isConnected) return; const card = xcHtml(q, map, ok, inp.value, why); if (!card) return; const w0 = fb.querySelector('.us-why0'); if (w0) { w0.previousElementSibling && w0.previousElementSibling.remove(); w0.remove(); } fb.insertAdjacentHTML('beforeend', card); ExplainCard.bind(box, xcHooks(qs)); }).catch(() => {});
        if (window.Sfx) { try { ok ? Sfx.correct && Sfx.correct() : Sfx.wrong && Sfx.wrong(); } catch (er) { /* bỏ qua */ } }
        if (done === qs.length) {
          $('#usScore', box).innerHTML = `<div class="us-score" role="status"><b>${right}/${qs.length}</b><span>${right === qs.length ? t('Tuyệt vời – bạn nắm chắc rồi!') : right >= qs.length - 1 ? t('Rất tốt! Xem lại câu sai một chút nhé.') : t('Đọc lại ví dụ ở trên rồi làm lại nhé.')}</span><button type="button" class="btn sm" id="usAgain">↻ ${t('Làm bộ câu khác')}</button></div>`;
          $('#usAgain', box).onclick = () => { seed++; run(); const f = box.querySelector('input'); if (f) f.focus(); };
          if (App.reward) { try { App.reward({ xp: right * 2 }); } catch (er) { /* bỏ qua */ } }
        }
      };
    };
    run();
  }

  // ---------- Khối nội dung ----------
  const sec = (id, ic, title, sub, body) => `<section class="card us-sec" id="us-${id}" aria-labelledby="us-${id}-h"><h2 id="us-${id}-h">${ic} ${esc(title)}</h2>${sub ? `<p class="us-sub">${sub}</p>` : ''}${body}</section>`;
  const notesHtml = es => es.flatMap(e => e.notes).map(n => `<p class="us-tip">💡 ${tx(n.vi, n.en)}</p>`).join('');
  function prepHtml(es) {
    return es.map(e => `<div class="us-items">${e.items.map(x => {
      const phrase = e.key + ' ' + x.h;
      return `<div class="us-it"><div class="us-ih"><span class="us-ph" lang="en" translate="no">${esc(e.key)} <span class="pr">${esc(x.h)}</span></span><span class="us-b">${esc(PREP_SUB()[e.sub])}</span>${sayBtn(phrase)}${saveBtn(phrase.replace(/\bsb\b /, ''), x.vi, x.en, x.ex[0] ? exText(x.ex[0]) : '')}</div>
        <p class="us-im">${mean(x.vi, x.en)}</p>${x.ex.map(exHtml).join('')}</div>`;
    }).join('')}</div>${e.ex.map(exHtml).join('')}`).join('') + notesHtml(es);
  }
  function verbHtml(es) {
    const N = VN();
    return es.map(e => `<div class="us-items">${e.items.map(x => `<div class="us-it"><div class="us-ih"><code class="us-f" translate="no" lang="en">${esc(e.key)} ${esc(VF[x.h] || x.h)}</code><span class="small muted">${esc(N[x.h] || '')}</span></div>
      ${x.vi || x.en ? `<p class="us-im">${mean(x.vi, x.en)}</p>` : ''}${x.ex.map(exHtml).join('')}</div>`).join('')}</div>${e.ex.map(exHtml).join('')}`).join('') + notesHtml(es);
  }
  function advHtml(es) {
    const A = AT(), P = POSN();
    return es.map(e => `<div class="us-tw" style="margin-bottom:.6rem"><table class="us-table"><thead><tr><th scope="col">${t('Dạng')}</th><th scope="col">${t('Nghĩa')}</th><th scope="col">${t('Ví dụ')}</th></tr></thead><tbody>
      ${e.items.map(x => `<tr><th scope="row" lang="en" translate="no">${esc(x.h)}</th><td>${mean(x.vi, x.en)}</td><td>${x.ex.map(s => `<span lang="en" translate="no">${esc(exText(s))}</span> ${sayBtn(exText(s))}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
      <div class="us-pos"><span>${esc(A[e.sub] || '')}</span>${e.pos.map(p => P[p] ? `<span title="${esc(P[p][1])}">📍 ${esc(P[p][0])}</span>` : '').join('')}</div>
      ${e.pos.length ? `<p class="small muted" style="margin:.4rem 0 0">${e.pos.map(p => P[p] ? `<b>${esc(P[p][0])}:</b> ${esc(P[p][1])}` : '').join(' ')}</p>` : ''}${e.ex.map(exHtml).join('')}`).join('') + notesHtml(es);
  }
  function structHtml(es) {
    return es.map(e => `<div class="us-it" style="margin-bottom:.6rem"><code class="us-formula" translate="no" lang="en">${esc(e.f)}</code>
      ${e.items.map(x => `<p class="us-im"><b lang="en" translate="no">${esc(x.h)}</b> – ${mean(x.vi, x.en)}</p>${x.ex.map(exHtml).join('')}`).join('')}
      ${e.notes.map(n => `<p class="us-im">${tx(n.vi, n.en)}</p>`).join('')}${e.ex.map(exHtml).join('')}
      <div class="us-acts">${e.key !== curKey ? `<a class="btn sm ghost" href="#/usage/${enc(e.key)}">${t('Xem chi tiết')} ›</a>` : ''}${e.lessons.map(lessonLink).join('')}</div></div>`).join('');
  }
  function pairHtml(es) {
    return es.map(e => `<div class="us-tw" style="margin-bottom:.6rem"><table class="us-table"><thead><tr><th scope="col">${t('Từ')}</th><th scope="col">${t('Nghĩa & cách dùng')}</th><th scope="col">${t('Ví dụ')}</th></tr></thead><tbody>
      ${e.items.map(x => `<tr><th scope="row">${wordLink(headOf(x.h))}${posOf(x.h) ? ` <small class="muted" lang="en" translate="no">(${esc(posOf(x.h))})</small>` : ''}</th><td>${mean(x.vi, x.en)}</td><td>${x.ex.map(s => `<span lang="en" translate="no">${esc(exText(s))}</span> ${sayBtn(exText(s))}`).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
      ${e.notes.map(n => `<p class="us-tip">💡 ${tx(n.vi, n.en)}</p>`).join('')}${e.key !== curKey ? `<p style="margin:.3rem 0 .8rem"><a class="btn sm ghost" href="#/usage/${enc(e.key)}">${t('Xem chi tiết')} ›</a></p>` : ''}`).join('');
  }
  const misHtml = list => `<div class="us-mis">${list.map(m => `<div><div><span class="bad" aria-hidden="true">✗</span><span class="sr-only">${t('Sai')}: </span> <s lang="en" translate="no">${esc(m.w)}</s></div><div><span class="good" aria-hidden="true">✓</span><span class="sr-only">${t('Đúng')}: </span> <b lang="en" translate="no">${esc(m.r)}</b> ${sayBtn(m.r)}</div>${m.vi || m.en ? `<div class="small" style="margin-top:.25rem">${tx(m.vi, m.en)}</div>` : ''}</div>`).join('')}</div>`;
  const regHtml = list => { const R = REG(); return `<div class="us-reg">${list.map(r => `<div><span class="us-b ${r.r === 'academic' ? 'g' : r.r === 'formal' ? 'a' : 'p'}">${R[r.r] ? R[r.r][0] + ' ' + esc(R[r.r][1]) : esc(r.r)}</span><span>${tx(r.vi, r.en)}</span></div>`).join('')}</div>`; };
  const colHtml = list => `<div class="us-chips">${list.map(c => `<button type="button" data-usay="${esc(c)}" lang="en" translate="no">${esc(c)} <span aria-hidden="true">🔊</span></button>`).join('')}</div>`;

  // Ghi chú từ (js/notes/<chữ>.json – cùng nguồn với thẻ "Hiểu sâu"): họ từ + mẹo nhớ + dùng khi thi
  const notesCache = {};
  const notesOf = w => { const c = /^[a-z]/.test(w) ? w[0] : '_'; return (notesCache[c] = notesCache[c] || fetch(`js/notes/${c}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({}))).then(m => (m && Object.hasOwn(m, w) ? m[w] : null)); };
  async function fillNotes(w, opts = {}) {
    const box = $('#usNotes'); if (!box) return;
    const n = await notesOf(w).catch(() => null);
    if (!n || !box.isConnected) return;
    let html = '';
    if (n.f && window.WordCard) {
      const fam = WordCard.parseFamily(n.f, w).filter(x => x.w);
      if (fam.length) html += sec('fam', '🌳', t('Họ từ'), t('Các dạng từ loại khác – bấm để xem cách dùng hoặc tra nghĩa.'), `<div class="us-chips">${fam.map(x => { const k = U.resolve(x.w.split('/')[0].trim()); return `<a href="#/${k ? 'usage' : 'dict'}/${enc(k || x.w.split('/')[0].trim())}"><span lang="en" translate="no">${esc(x.w)}</span>${x.pos ? `<small lang="en" translate="no">${esc(x.pos)}</small>` : ''}</a>`; }).join('')}</div>`);
    }
    if (window.WordCard && (n.m || n.u || (opts.errors && n.e))) html += `<div class="us-sec">${WordCard.notes({ m: n.m, u: n.u, e: opts.errors ? n.e : '' }, w)}</div>`;
    box.innerHTML = html;
  }

  // ---------- Trang một từ ----------
  let curKey = '';
  async function wordPage(arg) {
    const key = U.resolve(arg), raw = U.norm(arg);
    curKey = key || raw;
    if (!key) return fallback(raw);
    view.innerHTML = head() + searchBox(key) + `<div class="skel" style="height:260px;border-radius:18px;margin-top:1rem" aria-busy="true"></div>`;
    await Promise.all([need(U.chunksOf(key)), App.need('wordcard').catch(() => {})]);
    if (curKey !== key || !/^#\/usage\//.test(location.hash)) return;
    const idOnly = IDX().id[key] && !IDX().w[key];
    const r = idOnly ? (() => { const k = IDX().id[key], o = { key, p: [], v: [], a: [], s: [], c: [] }; const e = U.byId(k, key); if (e) o[k].push(e); o.count = e ? 1 : 0; return o; })() : U.lookup(key);
    if (!r.count) return fallback(raw);
    pend = []; saves = [];
    const all = U.KINDS.flatMap(k => r[k]);
    const lib = window.IELTS_DATA && IELTS_DATA.INDEX[key];
    const P = POSL(), pos = [...new Set([...r.p.map(e => P[e.sub]), ...(r.v.length ? [P.v] : []), ...(r.a.some(e => U.norm(e.key) === key || e.items.some(x => U.norm(x.h) === key)) ? [P.adv] : [])])];
    const title = idOnly ? (r.s[0] ? r.s[0].f : r.c[0].items.map(x => headOf(x.h)).join(' / ')) : key;
    const isVerb = window.LK_VERBS && !idOnly && /^[a-z]+$/.test(key) && (r.v.length || r.p.some(e => e.sub === 'v')) ? key : '';
    const meanTxt = lib ? App.meanOf(lib) : '';
    const sections = [];
    if (r.p.length) sections.push(['prep', '🧷', t('Giới từ đi kèm'), t('Giới từ thay đổi thì nghĩa thay đổi – học cả cụm.'), prepHtml(r.p)]);
    if (r.v.length) sections.push(['verb', '🧩', t('Mẫu động từ'), t('Theo sau động từ này là gì: to-V, V-ing, tân ngữ…?'), verbHtml(r.v)]);
    if (r.a.length) sections.push(['adv', '📍', t('Trạng từ: dạng & vị trí'), '', advHtml(r.a)]);
    if (r.c.length) sections.push(['pair', '⚖️', idOnly ? t('So sánh') : t('Dễ nhầm với'), '', pairHtml(r.c)]);
    if (r.s.length) sections.push(['struct', '🏗️', t('Cấu trúc câu'), idOnly ? '' : t('Các cấu trúc hay dùng với từ này.'), structHtml(r.s)]);
    const cols = [...new Set([...all.flatMap(e => e.col), ...((lib && lib.col) || [])])].slice(0, 16);
    if (cols.length) sections.push(['col', '🔗', t('Collocation – cụm hay đi cùng'), t('Bấm để nghe.'), colHtml(cols)]);
    const regs = all.flatMap(e => e.reg);
    if (regs.length) sections.push(['reg', '🎓', t('Văn phong & IELTS'), '', regHtml(regs)]);
    const seen = new Set(), mis = all.flatMap(e => e.mis).filter(m => !seen.has(m.w) && seen.add(m.w));
    if (mis.length) sections.push(['mis', '⚠️', t('Lỗi hay gặp'), t('Lỗi người học hay mắc – nhất là khi dịch từng chữ.'), misHtml(mis)]);
    const lessons = [...new Set(all.flatMap(e => e.lessons))].filter(id => (IDX().l || {})[id]);
    const rel = [...new Set(all.flatMap(e => e.rel))].filter(w => w !== key);
    view.innerHTML = head() + searchBox(idOnly ? '' : key) + back()
      + `<section class="card us-hero" aria-labelledby="usW"><div class="us-top"><div style="min-width:0">
          <h2 class="us-word" id="usW" lang="en" translate="no">${esc(title)}</h2>
          <div class="us-badges">${pos.map(p => `<span class="us-b p">${esc(posName(p))}</span>`).join('')}${U.KINDS.filter(k => r[k].length).map(k => `<span class="us-b">${esc(KL()[k])}</span>`).join('')}</div>
          ${meanTxt ? `<p class="us-mean">${esc(meanTxt)}</p>` : ''}</div>
          <div class="us-acts" style="margin:0">${idOnly ? '' : sayBtn(key)}${idOnly ? '' : saveBtn(key, lib ? lib.vi : '', lib ? lib.def : '', lib && lib.ex ? lib.ex : '', true)}</div></div>
        <div class="us-acts">${idOnly ? '' : `<a class="btn sm" href="#/dict/${enc(key)}">📖 ${t('Tra nghĩa')}</a>`}${isVerb ? `<a class="btn sm" href="#/verb/${enc(isVerb)}">🔤 ${t('Chia động từ')}</a>` : ''}</div>
        ${sections.length > 2 ? `<nav class="us-jump" aria-label="${t('Đi tới mục')}">${sections.map(s => `<a href="#/usage/${enc(key)}" data-jump="us-${s[0]}">${s[1]} ${esc(s[2])}</a>`).join('')}${lessons.length ? `<a href="#/usage/${enc(key)}" data-jump="us-gr">📐 ${t('Ngữ pháp')}</a>` : ''}<a href="#/usage/${enc(key)}" data-jump="usQz">🎯 ${t('Luyện nhanh')}</a></nav>` : ''}</section>`
      + sections.map(s => sec(...s)).join('')
      + `<div id="usNotes"></div>`
      + (lessons.length || rel.length ? sec('gr', '📐', t('Học tiếp'), '', (lessons.length ? `<div class="us-acts" style="margin:0">${lessons.map(lessonLink).join('')}</div>` : '') + (rel.length ? `<p class="small muted" style="margin:.8rem 0 .4rem">${t('Từ liên quan')}</p><div class="us-chips">${rel.map(w => wordLink(w)).join('')}</div>` : '')) : '')
      + `<section class="card us-sec" id="usQz" aria-labelledby="usQzH"></section>`;
    $$('[data-jump]').forEach(a => a.onclick = e => { e.preventDefault(); const el = document.getElementById(a.dataset.jump); if (el) { el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); const h = el.querySelector('h2'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); } } });
    quizBox($('#usQz'), all, t('Luyện nhanh'));
    settle(); bindSearch(); bind();
    if (!idOnly) fillNotes(key);
    document.title = (idOnly ? title : key) + ' – ' + t('Cách dùng từ') + ' – Lexkite';
  }

  // ---------- Từ chưa có dữ liệu riêng: hiện những gì app biết + gợi ý (không bao giờ trang trống) ----------
  async function fallback(w) {
    pend = []; saves = [];
    const near = U.near(w, 6), sug = U.suggest(w, 6).filter(x => !near.includes(x));
    const verb = window.LK_VERBS && /^[a-z]+$/.test(w) && (() => { const r = LK_VERBS.resolve(w); return r && !r.unknown && !r.guess ? r.base : ''; })();
    const draw = () => {
      const lib = window.IELTS_DATA && IELTS_DATA.INDEX[w];
      view.innerHTML = head() + searchBox(w) + back()
        + `<section class="card us-hero" aria-labelledby="usW"><div class="us-top"><div style="min-width:0"><h2 class="us-word" id="usW" lang="en" translate="no">${esc(w || '—')}</h2>
          ${lib ? `<div class="us-badges">${lib.pos ? UI.posChip(lib.pos) : ''}</div><p class="us-mean">${esc(App.meanOf(lib))}</p>` : ''}</div>
          ${w ? `<div class="us-acts" style="margin:0">${sayBtn(w)}${/^[a-z' -]+$/.test(w) ? saveBtn(w, lib ? lib.vi : '', lib ? lib.def : '', lib && lib.ex ? lib.ex : '', true) : ''}</div>` : ''}</div>
          <p class="us-tip" role="status">ℹ️ ${t('Chưa có ghi chú cách dùng riêng cho “{w}”. Dưới đây là những gì Lexkite biết về từ này và các từ gần giống.', { w })}</p>
          <div class="us-acts"><a class="btn sm" href="#/dict/${enc(w)}">📖 ${t('Tra nghĩa')}</a>${verb ? `<a class="btn sm" href="#/verb/${enc(verb)}">🔤 ${t('Chia động từ')}</a>` : ''}</div></section>`
        + (lib && lib.ex ? sec('ex', '💬', t('Ví dụ'), '', `<p class="us-ex"><span lang="en" translate="no">${esc(lib.ex)}</span>${sayBtn(lib.ex)}</p>`) : '')
        + (lib && (lib.col || []).length ? sec('col', '🔗', t('Collocation – cụm hay đi cùng'), t('Bấm để nghe.'), colHtml(lib.col.slice(0, 12))) : '')
        + `<div id="usNotes"></div>`
        + (near.length || sug.length ? sec('near', '🔎', t('Có thể bạn muốn xem'), '', `<div class="us-chips">${[...near, ...sug].map(x => `<a href="#/usage/${enc(x)}" lang="en" translate="no">${esc(x)}</a>`).join('')}</div>`) : '')
        + `<h2 class="set-h hub-h">📚 ${t('Chuyên mục')}</h2><div class="us-cats">${CATS().map(([id, ic, n]) => `<a class="us-cat" href="#/usage?c=${id}"><span class="ic" aria-hidden="true">${ic}</span><b>${esc(n)}</b></a>`).join('')}</div>`;
      settle(); bindSearch(); bind();
      if (w) fillNotes(w, { errors: true });
    };
    draw();
    // Kho từ (nghĩa, ví dụ, collocation) nạp lười → vẽ lại khi có
    if (w && !(window.IELTS_DATA && IELTS_DATA.INDEX[w]) && !App.loaded('words')) { const k = curKey; App.need('words').then(() => { if (curKey === k && /^#\/usage/.test(location.hash) && window.IELTS_DATA && IELTS_DATA.INDEX[w]) draw(); }).catch(() => {}); }
  }

  routes.usage = function (arg, query) {
    style(); pend = []; saves = []; curKey = '';
    const c = query && query.get('c');
    if (arg) return wordPage(arg);
    if (c) return category(c);
    document.title = t('Cách dùng từ') + ' – Lexkite';
    return landing();
  };
})();
