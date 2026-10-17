/* 🔤 Chia động từ – #/verb/<động từ>: tìm (gõ cả dạng đã chia: went, studies), 5 dạng + quy tắc chính tả + cách đọc -ed/-s,
 * bảng 12 thì + tương lai trong quá khứ + modal perfect (khẳng định/phủ định/nghi vấn, rút gọn, mọi ngôi), bị động, ví dụ có âm thanh,
 * lỗi hay gặp. #/verb (trống) = bảng động từ bất quy tắc có lọc. Bộ máy: web/js/verbs-core.js (LK_VERBS). */
(function () {
  const { $, $$, esc, speak } = UI;
  const App = window.App, { state, routes } = App, view = App.view, V = window.LK_VERBS;
  if (!V) return;
  const EN = s => `<span lang="en" translate="no">${esc(s)}</span>`;
  const ss = (k, v) => { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  // Động từ trong kho từ của app → gợi ý & nhận diện từ gốc tốt hơn
  if (window.IELTS_DATA) V.addKnown(Object.values(IELTS_DATA.INDEX).filter(w => /^v\b|verb/.test(w.pos || '') && /^[a-z]+$/.test(w.word)).map(w => w.word));

  let css = false;
  function style() {
    if (css) return; css = true;
    const s = document.createElement('style');
    s.textContent = `.vb-search{position:relative;max-width:640px}.vb-search .search{margin:0}
.vb-list{position:absolute;z-index:30;left:0;right:0;top:calc(100% + 6px);margin:0;padding:.3rem;list-style:none;background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow-lg);max-height:min(340px,60vh);overflow:auto}
.vb-opt{display:flex;gap:.6rem;align-items:baseline;padding:.6rem .8rem;border-radius:10px;cursor:pointer}.vb-opt b{font-size:1.02rem}.vb-opt small{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vb-opt[aria-selected=true],.vb-opt:hover{background:var(--primary-soft)}
.vb-hero{margin-top:1rem;position:relative;overflow:hidden;background:linear-gradient(135deg,color-mix(in srgb,var(--accent) 12%,var(--surface)),var(--surface) 62%)}
.vb-top{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap}
.vb-word{font-size:clamp(2rem,6vw,2.7rem);font-weight:800;letter-spacing:-.02em;line-height:1.05;margin:0}
.vb-badges{display:flex;flex-wrap:wrap;gap:.35rem;margin-top:.5rem}
.vb-b{display:inline-flex;align-items:center;gap:.25rem;padding:.18rem .6rem;border-radius:999px;font-size:.78rem;font-weight:700;background:var(--surface-2);color:var(--muted)}
.vb-b.irr{background:var(--gold-soft);color:#8a4405}.vb-b.reg{background:var(--good-soft);color:var(--good-text)}.vb-b.warn{background:var(--again-soft);color:var(--again-text)}
:root[data-theme=dark] .vb-b.irr{color:var(--gold)}@media (prefers-color-scheme:dark){:root:not([data-theme=light]) .vb-b.irr{color:var(--gold)}}
.vb-mean{margin:.6rem 0 0;color:var(--muted)}
.vb-forms{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:.6rem;margin-top:1.1rem}
.vb-form{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:.75rem .8rem;display:flex;flex-direction:column;gap:.2rem;min-width:0;transition:transform .15s,box-shadow .15s}
.vb-form:hover{transform:translateY(-2px);box-shadow:var(--shadow)}
.vb-form .lb{font-size:.72rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em}
.vb-form .w{font-size:1.15rem;font-weight:800;overflow-wrap:anywhere}.vb-form .w small{font-weight:600;color:var(--muted);font-size:.7rem;margin-left:.2rem}
.vb-form .ft{display:flex;align-items:center;justify-content:space-between;gap:.3rem;margin-top:auto;padding-top:.25rem}
.vb-rc{font-size:.7rem;font-weight:700;color:var(--accent-text);background:var(--accent-soft);border-radius:999px;padding:.08rem .5rem}
.vb-grid2{display:grid;grid-template-columns:1fr 1fr;gap:.8rem;margin-top:1rem}
.vb-box{background:var(--surface-2);border-radius:14px;padding:.85rem 1rem}.vb-box h3{font-size:.95rem;margin:0 0 .4rem}
.vb-ipa{font-family:var(--ipa);font-weight:800;font-size:1.25rem;color:var(--primary)}
.vb-rules{margin:.2rem 0 0;padding-left:1.1rem}.vb-rules li{margin:.25rem 0}
.vb-bar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.6rem;margin:1.6rem 0 .8rem}
.vb-bar h2{margin:0}.vb-ctl{display:flex;flex-wrap:wrap;gap:.5rem}
.vb-seg{display:inline-flex;gap:.2rem;padding:.25rem;background:var(--surface-2);border-radius:12px}
.vb-seg button{border:0;background:transparent;padding:.4rem .75rem;border-radius:9px;font-weight:700;color:var(--muted);cursor:pointer;min-height:36px}
.vb-seg button[aria-pressed=true]{background:var(--surface);color:var(--text);box-shadow:var(--shadow-sm)}
.vb-pol{display:none;margin-bottom:.7rem}
.vb-t{background:var(--surface);border:1px solid var(--line);border-radius:16px;margin-bottom:.6rem;overflow:hidden}
.vb-t>summary{list-style:none;display:flex;align-items:center;gap:.7rem;padding:.85rem 1rem;cursor:pointer;flex-wrap:wrap}.vb-t>summary::-webkit-details-marker{display:none}
.vb-t>summary:focus-visible{outline:3px solid var(--primary);outline-offset:-3px;border-radius:16px}
.vb-t>summary::after{content:"";width:.55rem;height:.55rem;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:rotate(45deg);margin-left:auto;transition:transform .2s}
.vb-t[open]>summary::after{transform:rotate(-135deg)}.vb-t[open]>summary{border-bottom:1px solid var(--line)}
.vb-tn{display:flex;flex-direction:column;min-width:0}.vb-tn small{color:var(--muted);font-size:.8rem}
.vb-f{font-family:inherit;font-size:.78rem;font-weight:700;background:var(--primary-soft);color:var(--primary-text);border-radius:8px;padding:.15rem .5rem}
.vb-tb{padding:.8rem 1rem 1rem;animation:vbIn .25s ease}@keyframes vbIn{from{opacity:0;transform:translateY(-4px)}}
.vb-use{margin:0 0 .6rem;color:var(--muted);font-size:.9rem}
.vb-tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px}
.vb-table{width:100%;border-collapse:collapse;font-size:.93rem}.vb-table th,.vb-table td{padding:.5rem .65rem;text-align:left;vertical-align:top;border-bottom:1px solid var(--line)}
.vb-table tr:last-child>*{border-bottom:0}.vb-table thead th{background:var(--surface-2);font-size:.75rem;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.vb-table tbody th{color:var(--accent-text);font-weight:800;white-space:nowrap;width:1%}.vb-table td>span{display:block}.vb-table .vb-c{color:var(--muted);font-size:.84rem}
.vb-table tbody tr{transition:background .15s}.vb-table tbody tr:hover{background:color-mix(in srgb,var(--primary-soft) 45%,transparent)}
.vb-ex{display:flex;align-items:center;gap:.5rem;margin:.75rem 0 0;padding:.6rem .8rem;border-left:4px solid var(--accent);background:var(--accent-soft);border-radius:0 12px 12px 0}
.vb-ex span{flex:1}.vb-note{margin:.6rem 0 0;padding:.55rem .8rem;background:var(--gold-soft);border-radius:12px;font-size:.88rem}
.vb-acts{display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.7rem}
.vb-mis{display:grid;gap:.5rem}.vb-mis>div{background:var(--surface);border:1px solid var(--line);border-left:4px solid var(--again);border-radius:0 14px 14px 0;padding:.6rem .9rem}
.vb-mis .bad{color:var(--again-text);font-weight:800}.vb-mis .good{color:var(--good-text);font-weight:800}
.vb-chips{display:flex;flex-wrap:wrap;gap:.4rem}.vb-chips a{font-size:.9rem;padding:.3rem .8rem;border-radius:999px;background:var(--surface);border:1px solid var(--line);color:var(--text);font-weight:600;transition:border-color .15s,transform .15s}
.vb-chips a:hover{border-color:var(--primary);transform:translateY(-1px)}
.vb-irr{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:.4rem;margin-top:.8rem}
.vb-ir{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.4rem;padding:.55rem .8rem;border:1px solid var(--line);border-radius:12px;background:var(--surface);color:var(--text);transition:border-color .15s,background .15s}
.vb-ir:hover{border-color:var(--primary);background:var(--primary-soft)}.vb-ir b{color:var(--text)}.vb-ir span{color:var(--muted);overflow-wrap:anywhere}
.vb-modal{display:grid;gap:.5rem;margin-top:.8rem}.vb-modal>div{display:flex;gap:.8rem;justify-content:space-between;padding:.6rem .8rem;background:var(--surface-2);border-radius:12px;flex-wrap:wrap}
@media (max-width:720px){.vb-forms{grid-template-columns:repeat(2,minmax(0,1fr))}.vb-forms .vb-form:first-child{grid-column:1/-1}.vb-grid2{grid-template-columns:1fr}
.vb-pol{display:inline-flex}.vb-ts[data-pol=aff] .c-neg,.vb-ts[data-pol=aff] .c-q,.vb-ts[data-pol=neg] .c-aff,.vb-ts[data-pol=neg] .c-q,.vb-ts[data-pol=q] .c-aff,.vb-ts[data-pol=q] .c-neg{display:none}}`;
    document.head.appendChild(s);
  }

  // ---------- Chữ giao diện ----------
  const GN = () => ({ present: t('Hiện tại'), past: t('Quá khứ'), future: t('Tương lai'), modal: t('Khuyết thiếu') });
  const TN = () => ({ ps: t('Hiện tại đơn'), pc: t('Hiện tại tiếp diễn'), pp: t('Hiện tại hoàn thành'), ppc: t('Hiện tại hoàn thành tiếp diễn'), pas: t('Quá khứ đơn'), pac: t('Quá khứ tiếp diễn'), pap: t('Quá khứ hoàn thành'), papc: t('Quá khứ hoàn thành tiếp diễn'), fs: t('Tương lai đơn'), gt: t('Tương lai gần'), fc: t('Tương lai tiếp diễn'), fp: t('Tương lai hoàn thành'), fpc: t('Tương lai hoàn thành tiếp diễn'), fip: t('Tương lai trong quá khứ'), fipg: t('Dự định trong quá khứ'), 'm-should': t('Lẽ ra nên'), 'm-could': t('Lẽ ra đã có thể'), 'm-would': t('Lẽ ra đã'), 'm-might': t('Có lẽ đã'), 'm-may': t('Có thể đã'), 'm-must': t('Chắc hẳn đã') });
  const USE = () => ({ ps: t('Thói quen, sự thật, lịch trình.'), pc: t('Việc đang diễn ra lúc nói hoặc kế hoạch gần đã sắp xếp.'), pp: t('Trải nghiệm, kết quả còn ở hiện tại, việc vừa xảy ra.'), ppc: t('Việc kéo dài từ quá khứ đến giờ, nhấn mạnh quá trình.'), pas: t('Việc đã xong tại thời điểm xác định trong quá khứ.'), pac: t('Việc đang diễn ra tại một thời điểm trong quá khứ.'), pap: t('Việc xảy ra trước một việc khác trong quá khứ.'), papc: t('Quá trình kéo dài trước một mốc trong quá khứ.'), fs: t('Quyết định tức thì, dự đoán, lời hứa.'), gt: t('Dự định có sẵn, dự đoán có căn cứ.'), fc: t('Việc đang diễn ra tại một thời điểm trong tương lai.'), fp: t('Việc sẽ xong trước một mốc trong tương lai.'), fpc: t('Quá trình kéo dài đến một mốc trong tương lai.'), fip: t('Tương lai nhìn từ quá khứ (câu tường thuật).'), fipg: t('Dự định trong quá khứ (thường không thành).'), 'm-should': t('Tiếc nuối, chê trách: lẽ ra nên làm nhưng đã không làm.'), 'm-could': t('Khả năng trong quá khứ nhưng đã không xảy ra.'), 'm-would': t('Kết quả không có thật trong quá khứ (câu điều kiện loại 3).'), 'm-might': t('Phỏng đoán không chắc chắn về quá khứ.'), 'm-may': t('Phỏng đoán có thể đúng về quá khứ.'), 'm-must': t('Suy luận gần như chắc chắn về quá khứ.') });
  const RULE = () => ({ double: [t('Gấp đôi phụ âm'), t('Từ kết thúc bằng phụ âm – nguyên âm – phụ âm và trọng âm ở âm tiết cuối thì gấp đôi phụ âm cuối (stop → stopped, begin → beginning).')], 'double-uk': [t('Gấp đôi -l (UK)'), t('Anh–Anh gấp đôi -l cuối (travelled), Anh–Mỹ thì không (traveled).')], y: [t('-y → -i'), t('Phụ âm + y: đổi y thành i rồi thêm -ed/-es (studied, studies). Nguyên âm + y thì giữ y (played).')], e: [t('Bỏ -e câm'), t('Bỏ -e câm trước -ing, chỉ thêm -d khi chia -ed (making, loved).')], 'keep-e': [t('Giữ -e'), t('Từ tận cùng -ee, -oe, -ye giữ nguyên -e khi thêm -ing (agreeing, canoeing).')], ie: [t('-ie → -y'), t('-ie đổi thành -y trước -ing (dying, lying).')], ic: [t('-ic → -ck'), t('-ic thêm k trước -ed/-ing để giữ âm /k/ (panicked, panicking).')], es: [t('Thêm -es'), t('Thêm -es sau s, x, z, ch, sh và phụ âm + o (watches, goes).')] });
  const ED_WHY = () => ({ td: t('Âm cuối là /t/ hoặc /d/ → thêm một âm tiết /ɪd/.'), vl: t('Âm cuối là âm vô thanh (/p k f s ʃ tʃ θ/) → đọc /t/.'), vd: t('Âm cuối là nguyên âm hoặc âm hữu thanh (/b g v z m n l r/…) → đọc /d/.') });
  const S_WHY = () => ({ sib: t('Sau âm gió /s z ʃ ʒ tʃ dʒ/ → thêm một âm tiết /ɪz/.'), vl: t('Sau âm vô thanh /p t k f θ/ → đọc /s/.'), vd: t('Sau nguyên âm và âm hữu thanh → đọc /z/.'), irr: t('Cách đọc đặc biệt, cần nhớ riêng.') });
  const MIS = () => ({ overreg: t('Động từ bất quy tắc không thêm -ed.'), 'did-v2': t('Sau did / didn’t dùng động từ nguyên mẫu.'), 'have-v2': t('Sau have / has / had dùng quá khứ phân từ (V3), không dùng V2.'), 'doesnt-s': t('Sau does / doesn’t, động từ không thêm -s.'), stative: t('Động từ trạng thái thường không dùng ở thì tiếp diễn.'), sp: t('Lỗi chính tả – xem quy tắc chính tả ở trên.'), agree: t('“agree” là động từ – không dùng với am/is/are.'), 'listen-to': t('listen cần “to” trước tân ngữ.'), discuss: t('discuss không đi với “about”.'), explain: t('explain + điều gì + to + người.'), ving: t('Động từ này đi với V-ing, không đi với to V.'), marry: t('marry + người, không có “with”.'), enter: t('enter + nơi chốn, không có “into”.'), arrive: t('arrive in (thành phố, nước) / arrive at (địa điểm), không dùng “to”.'), depend: t('depend on, không phải depend of.'), 'lie-lay': t('lie (nằm) – lay – lain: không có tân ngữ; lay (đặt) – laid – laid: cần tân ngữ.'), 'rise-raise': t('rise (tự tăng) không có tân ngữ; raise (nâng, tăng cái gì) cần tân ngữ.'), born: t('“be born” là dạng cố định: I was born.'), 'want-to': t('want + to V.'), let: t('let / make + người + V nguyên mẫu (không có “to”).'), 'be-do': t('“be” tự làm trợ động từ – không mượn do / does / did.'), sva: t('Ngôi he/she/it dùng has.'), 'look-forward': t('look forward to + V-ing (“to” là giới từ).'), suggest: t('suggest / recommend + that + S + V (hoặc + V-ing), không dùng “sb to V”.'), 'will-can': t('Không dùng hai động từ khuyết thiếu liền nhau: will be able to.'), 'lend-borrow': t('lend = cho mượn, borrow = mượn của ai.'), 'say-tell': t('tell + người; say + điều gì (say to sb).'), gotten: t('Anh–Anh dùng “have got”; “gotten” là Anh–Mỹ.'), 'modal-base': t('Sau động từ khuyết thiếu dùng V nguyên mẫu, không thêm -s.'), 'modal-to': t('Sau can / must / should… không có “to”.'), 'modal-q': t('Động từ khuyết thiếu tự đảo lên đầu câu hỏi, không mượn do.') });
  const FROM = () => ({ past: t('quá khứ'), pp: t('quá khứ phân từ'), ing: t('dạng -ing'), s: t('ngôi thứ ba số ít'), present: t('dạng hiện tại') });
  const PAIRS = { lie: 'lay', lay: 'lie', rise: 'raise', raise: 'rise', say: 'tell', tell: 'say', lend: 'borrow', borrow: 'lend', sit: 'set', set: 'sit', fall: 'feel', feel: 'fall', bring: 'take', take: 'bring', learn: 'teach', teach: 'learn', see: 'look', look: 'see', hear: 'listen', listen: 'hear', do: 'make', make: 'do' };

  const region = () => ss('vb.region') || (state.settings.accent === 'en-US' ? 'US' : 'UK');
  const accent = () => (region() === 'US' ? 'en-US' : 'en-GB');
  const say = txt => speak(txt, accent());
  const sayBtn = (txt, label) => `<button type="button" class="icon-btn sm" data-vsay="${esc(txt)}" aria-label="${esc((label || t('Nghe')) + ': ' + txt.slice(0, 80))}">🔊</button>`;
  const vars = list => list.map(x => `${EN(x.w)}${x.tag ? `<small>${x.tag}</small>` : ''}`).join(' / ');
  const meaning = b => { const w = window.IELTS_DATA && IELTS_DATA.INDEX[b]; if (!w || !/^v\b|verb/.test(w.pos || '')) return ''; return I18N.meanLang() === 'vi' ? w.vi : w.def; };

  // ---------- Ô tìm kiếm có gợi ý (combobox) ----------
  function searchBox(val) {
    return `<div class="vb-search"><form class="search" id="vbForm" role="search" autocomplete="off">
      <input class="input" id="vbQ" value="${esc(val)}" placeholder="${t('Gõ động từ, ví dụ: go, went, studies')}" aria-label="${t('Tìm động từ')}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="vbList" spellcheck="false" autocapitalize="off" autocorrect="off">
      <button class="btn primary lg">${t('Chia')}</button></form><ul class="vb-list" id="vbList" role="listbox" aria-label="${t('Gợi ý động từ')}" hidden></ul></div>`;
  }
  function bindSearch() {
    const inp = $('#vbQ'), list = $('#vbList'); let items = [], cur = -1, timer = 0;
    const go = v => { v = String(v || '').trim(); if (!v) return; const r = V.resolve(v); if (!r) return; location.hash = '#/verb/' + encodeURIComponent(r.modal ? r.base : (r.base + (r.tail ? ' ' + r.tail : ''))); };
    const close = () => { list.hidden = true; inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); cur = -1; };
    const mark = i => { cur = i; $$('.vb-opt', list).forEach((o, k) => o.setAttribute('aria-selected', String(k === i))); if (i >= 0) { inp.setAttribute('aria-activedescendant', 'vbo' + i); const o = $('#vbo' + i); if (o && o.scrollIntoView) o.scrollIntoView({ block: 'nearest' }); } };
    const draw = () => {
      items = V.suggest(inp.value, 8);
      if (!items.length || !inp.value.trim()) return close();
      list.innerHTML = items.map((x, i) => { const m = x.via ? t('“{w}” → {b}', { w: x.via, b: x.base }) : meaning(x.base); return `<li class="vb-opt" id="vbo${i}" role="option" aria-selected="false" data-v="${esc(x.base)}"><b lang="en" translate="no">${esc(x.base)}</b>${m ? `<small>${esc(m)}</small>` : ''}${V.isIrregular(x.base) ? '<span class="vb-b irr" style="margin-left:auto">' + t('Bất quy tắc') + '</span>' : ''}</li>`; }).join('');
      list.hidden = false; inp.setAttribute('aria-expanded', 'true'); cur = -1;
    };
    inp.oninput = () => { clearTimeout(timer); timer = setTimeout(draw, 80); };
    inp.onkeydown = e => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); if (list.hidden) draw(); mark((cur + 1) % items.length); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); mark(cur <= 0 ? items.length - 1 : cur - 1); }
      else if (e.key === 'Escape') close();
      else if (e.key === 'Enter' && cur >= 0) { e.preventDefault(); go(items[cur].base); }
    };
    inp.onblur = () => setTimeout(close, 150);
    list.onmousedown = e => { const o = e.target.closest('.vb-opt'); if (o) { e.preventDefault(); go(o.dataset.v); } };
    $('#vbForm').onsubmit = e => { e.preventDefault(); go(inp.value); };
  }
  const head = () => `<div class="page-head"><div><h1>🔤 ${t('Chia động từ tiếng Anh')}</h1><p class="muted">${t('5 dạng của động từ, quy tắc chính tả, cách đọc -ed/-s và bảng chia mọi thì – kể cả bị động.')}</p></div></div>`;

  // ---------- Trang chính: bảng động từ bất quy tắc ----------
  function landing() {
    const list = V.irregularList(), PAT = { AAA: t('3 dạng giống nhau'), ABB: t('V2 = V3'), ABA: t('V1 = V3'), ABC: t('3 dạng khác nhau') };
    const chip = w => `<a href="#/verb/${encodeURIComponent(w)}" lang="en" translate="no">${esc(w)}</a>`;
    view.innerHTML = head() + searchBox('') + `
      <h3 class="set-h hub-h">⭐ ${t('Hay tra nhất')}</h3><div class="vb-chips">${'be have do go get make take come see know think say give find tell'.split(' ').map(chip).join('')}</div>
      <h3 class="set-h hub-h">🧠 ${t('Dễ nhầm')}</h3><div class="vb-chips">${'lie lay rise raise learn dream can must study stop panic travel'.split(' ').map(chip).join('')}</div>
      <div class="vb-bar"><h2>📋 ${t('Bảng {n} động từ bất quy tắc', { n: list.length })}</h2>
        <input class="input" id="vbF" style="max-width:240px" placeholder="${t('Lọc nhanh…')}" aria-label="${t('Lọc động từ bất quy tắc')}" spellcheck="false" autocapitalize="off"></div>
      <div class="vb-seg" role="group" aria-label="${t('Lọc theo mẫu')}" id="vbPat">${[['', t('Tất cả')], ...Object.entries(PAT)].map(([k, l], i) => `<button type="button" data-p="${k}" aria-pressed="${i === 0}">${esc(l)}</button>`).join('')}</div>
      <p class="small muted" id="vbCnt" aria-live="polite"></p>
      <div class="vb-irr" id="vbIrr"></div>`;
    let pat = '';
    const draw = () => {
      const q = ($('#vbF').value || '').trim().toLowerCase();
      const rows = list.filter(x => (!pat || x.pattern === pat) && (!q || [x.base, ...x.past.map(y => y.w), ...x.pp.map(y => y.w)].some(w => w.startsWith(q))));
      $('#vbIrr').innerHTML = rows.map(x => `<a class="vb-ir" href="#/verb/${encodeURIComponent(x.base)}" lang="en" translate="no" aria-label="${esc(x.base + ', ' + x.past.map(y => y.w).join('/') + ', ' + x.pp.map(y => y.w).join('/'))}"><b>${esc(x.base)}</b><span>${esc(x.past.map(y => y.w).join('/'))}</span><span>${esc(x.pp.map(y => y.w).join('/'))}</span></a>`).join('') || `<p class="muted">${t('Không có động từ phù hợp.')}</p>`;
      $('#vbCnt').textContent = t('{n} động từ', { n: rows.length });
    };
    $('#vbF').oninput = draw;
    $$('#vbPat button').forEach(b => b.onclick = () => { pat = b.dataset.p; $$('#vbPat button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); });
    draw(); bindSearch(); $('#vbQ').focus();
  }

  // ---------- Động từ khuyết thiếu ----------
  function modalPage(base) {
    const m = V.modal(base), ex = base === 'ought to' ? 'You ought to rest.' : `You ${base} go.`;
    view.innerHTML = head() + searchBox(base) + `<div class="card vb-hero"><div class="vb-top"><div><h2 class="vb-word" lang="en" translate="no">${esc(base)}</h2>
      <div class="vb-badges"><span class="vb-b irr">${t('Động từ khuyết thiếu')}</span></div></div>${sayBtn(base)}</div>
      <p class="vb-note">💡 ${t('Động từ khuyết thiếu không chia theo ngôi (he can, không có “cans”), không có dạng to V hay V-ing, luôn đi với V nguyên mẫu không “to”.')}</p>
      <div class="vb-modal">
        <div><b>${t('Khẳng định')}</b>${EN(ex)}</div>
        <div><b>${t('Phủ định')}</b>${EN(m[0] + (m[1] ? ' / ' + m[1] : ''))}</div>
        <div><b>${t('Nghi vấn')}</b>${EN(cap(base.split(' ')[0]) + ' I …?')}</div>
        ${m[2] ? `<div><b>${t('Quá khứ / điều kiện')}</b>${EN(m[2])}</div>` : ''}
        ${m[3] ? `<div><b>${t('Thay thế ở các thì khác')}</b>${EN(m[3])}</div>` : ''}
      </div></div>` + mistakesHtml(base);
    bindSearch(); bindSay();
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- Trang động từ ----------
  function mistakesHtml(base) {
    const ms = V.mistakes(base), W = MIS();
    if (!ms.length) return '';
    return `<h2 style="margin-top:1.6rem">⚠️ ${t('Lỗi người học hay mắc')}</h2><div class="vb-mis">${ms.map(x => `<div><div><span class="bad" aria-hidden="true">✗</span> <s>${EN(x.wrong)}</s></div><div><span class="good" aria-hidden="true">✓</span> <b>${EN(x.right)}</b></div><div class="small muted">${esc(W[/^sp-/.test(x.code) ? 'sp' : x.code] || '')}</div></div>`).join('')}</div>`;
  }
  function verbPage(arg, query) {
    const r = V.resolve(arg);
    if (!r) return landing();
    if (r.modal) return modalPage(r.base);
    const full = r.base + (r.tail ? ' ' + r.tail : ''), reg = region(), f = V.forms(r.base, { region: reg });
    const tl = r.tail ? ' ' + r.tail : '', R = RULE(), FR = FROM();
    const formBox = (lb, list, rule) => `<div class="vb-form"><span class="lb">${lb}</span><span class="w">${list.map(x => `${EN(x.w + tl)}${x.tag ? `<small>${x.tag}</small>` : ''}`).join('<br>')}</span><span class="ft">${rule && R[rule] ? `<span class="vb-rc" title="${esc(R[rule][1])}">${esc(R[rule][0])}</span>` : '<span></span>'}${sayBtn(list.map(x => x.w + tl).join(', '))}</span></div>`;
    const rules = [...new Set([f.rules.ed, f.rules.ing, f.rules.s].filter(k => R[k]))];
    const tags = [...f.past, ...f.pp].filter(x => x.tag);
    const m = meaning(r.base);
    const notice = r.from !== 'base' && r.input && r.input.split(' ')[0] !== r.base ? `<p class="vb-note" role="status">💡 ${t('“{w}” là {form} của “{b}”.', { w: r.input.split(' ')[0], form: FR[r.from] || FR.present, b: r.base })}</p>` : '';
    const alts = (r.alts || []).filter(a => a.base !== r.base);
    view.innerHTML = head() + searchBox(full) + notice
      + (alts.length ? `<p class="small">${t('Hoặc ý bạn là:')} ${alts.map(a => `<a class="chip" href="#/verb/${encodeURIComponent(a.base)}" lang="en" translate="no">${esc(a.base)}</a>`).join(' ')}</p>` : '')
      + `<section class="card vb-hero" aria-labelledby="vbW"><div class="vb-top"><div>
        <h2 class="vb-word" id="vbW" lang="en" translate="no">${esc(full)}</h2>
        <div class="vb-badges">${f.irregular ? `<span class="vb-b irr">⚡ ${t('Bất quy tắc')}</span>` : `<span class="vb-b reg">✓ ${t('Có quy tắc')}</span>`}
          ${f.partial ? `<span class="vb-b">${t('Có cả dạng -ed')}</span>` : ''}${f.stative ? `<span class="vb-b">${t('Động từ trạng thái')}</span>` : ''}
          ${f.transitive ? '' : `<span class="vb-b">${t('Nội động từ')}</span>`}${r.unknown || r.guess ? `<span class="vb-b warn">${t('Chưa có trong danh sách – chia theo quy tắc')}</span>` : ''}</div>
        ${m ? `<p class="vb-mean">${esc(m)}</p>` : ''}</div>
        <div class="vb-ctl"><div class="vb-seg" role="group" aria-label="${t('Giọng Anh – Anh hay Anh – Mỹ')}" id="vbReg">${['UK', 'US'].map(k => `<button type="button" data-r="${k}" aria-pressed="${reg === k}">${k === 'UK' ? '🇬🇧' : '🇺🇸'} ${k}</button>`).join('')}</div>
        <a class="btn sm" href="#/dict/${encodeURIComponent(full)}">📖 ${t('Tra nghĩa')}</a></div></div>
        <div class="vb-forms">${formBox(t('V1 · Nguyên mẫu'), [{ w: r.base }], '')}${formBox(t('V2 · Quá khứ'), f.past, f.rules.ed)}${formBox(t('V3 · Quá khứ phân từ'), f.pp, f.rules.ed)}${formBox('V-ing', f.ing, f.rules.ing)}${formBox(t('V-s/es · Ngôi 3 số ít'), f.s, f.rules.s)}</div>
        ${tags.length ? `<p class="small muted" style="margin:.7rem 0 0">🌍 ${t('UK = cách dùng Anh – Anh, US = Anh – Mỹ. Bảng chia bên dưới theo giọng bạn chọn.')}</p>` : ''}
        <div class="vb-grid2">
          <div class="vb-box"><h3>✍️ ${t('Quy tắc chính tả')}</h3>${rules.length ? `<ul class="vb-rules">${rules.map(k => `<li><b>${esc(R[k][0])}:</b> ${esc(R[k][1])}</li>`).join('')}</ul>` : `<p class="small" style="margin:0">${f.irregular && !f.partial ? t('Động từ bất quy tắc: V2 và V3 cần học thuộc. Dạng -ing và -s vẫn theo quy tắc chung.') : t('Thêm -ed, -ing, -s bình thường – không đổi chính tả.')}</p>`}</div>
          <div class="vb-box"><h3>🗣️ ${t('Cách đọc đuôi')}</h3>
            ${f.ed ? `<p class="small" style="margin:0 0 .4rem"><b>-ed</b> <span class="vb-ipa" translate="no">${f.ed.ipa}</span> · ${esc(ED_WHY()[f.ed.why])}${V.endIpa(f.ed.end) ? ` <span class="muted">(${t('âm cuối {s}', { s: V.endIpa(f.ed.end) })})</span>` : ''}</p>` : `<p class="small" style="margin:0 0 .4rem"><b>-ed</b> · ${t('Không có đuôi -ed (dạng bất quy tắc).')}</p>`}
            <p class="small" style="margin:0"><b>-s</b> <span class="vb-ipa" translate="no">${f.sz.ipa}</span> · ${esc(S_WHY()[f.sz.why])}</p>
            <a class="small" style="color:var(--primary-text)" href="#/grammar/ed-s-endings">📐 ${t('Bài học: cách đọc -ed và -s')} →</a></div>
        </div></section>
      <div class="vb-bar"><h2>📚 ${t('Bảng chia theo thì')}</h2><div class="vb-ctl" id="vbVoiceW"></div></div>
      <div class="tabs" role="tablist" id="vbTabs" aria-label="${t('Nhóm thì')}"></div>
      <div class="vb-seg vb-pol" role="group" aria-label="${t('Dạng câu')}" id="vbPol" style="margin-top:.7rem"></div>
      <div class="vb-ts" id="vbTs" role="tabpanel" style="margin-top:.8rem"></div>`
      + mistakesHtml(r.base)
      + (PAIRS[r.base] ? `<h3 class="set-h hub-h">🔁 ${t('Hay nhầm với')}</h3><div class="vb-chips"><a href="#/verb/${PAIRS[r.base]}" lang="en" translate="no">${PAIRS[r.base]}</a></div>` : '');
    // ----- bảng thì -----
    const G = GN(), N = TN(), U = USE(), groups = V.table(r, { region: reg });
    const want = query && query.get('t'), wantG = want && (groups.find(g => g.tenses.some(x => x.id === want)) || {}).id;
    let grp = wantG || ss('vb.g') || 'present', voice = 'act', pol = ss('vb.pol') || 'aff';
    if (!groups.some(g => g.id === grp)) grp = 'present';
    const open = new Set([want || '', 'ps', 'pas', 'fs', 'm-should']);
    const canPas = f.passive && !r.tail;
    const vi = I18N.lang() === 'vi';
    const cellH = (cls, a, c) => `<td class="${cls}">${a ? `<span lang="en" translate="no">${esc(a)}</span>${c ? `<span class="vb-c" lang="en" translate="no">${esc(c)}</span>` : ''}` : '<span class="muted">—</span>'}</td>`;
    const tableH = rows => `<div class="vb-tw"><table class="vb-table"><thead><tr><th scope="col">${t('Ngôi')}</th><th scope="col" class="c-aff">${t('Khẳng định')}</th><th scope="col" class="c-neg">${t('Phủ định')}</th><th scope="col" class="c-q">${t('Nghi vấn')}</th></tr></thead><tbody>${rows.map(x => `<tr><th scope="row" lang="en" translate="no">${esc(x.subj)}</th>${cellH('c-aff', x.aff, x.affC)}${cellH('c-neg', x.neg, x.negC)}${cellH('c-q', x.q, '')}</tr>`).join('')}</tbody></table></div>`;
    const drawTenses = () => {
      $('#vbTabs').innerHTML = groups.map(g => `<button type="button" role="tab" id="vbt-${g.id}" aria-controls="vbTs" aria-selected="${g.id === grp}" tabindex="${g.id === grp ? 0 : -1}" class="${g.id === grp ? 'on' : ''}" data-g="${g.id}">${esc(G[g.id])}</button>`).join('');
      $('#vbTs').setAttribute('aria-labelledby', 'vbt-' + grp); $('#vbTs').dataset.pol = pol;
      $('#vbVoiceW').innerHTML = canPas ? `<div class="vb-seg" role="group" aria-label="${t('Thể')}" id="vbVoice">${[['act', t('Chủ động')], ['pas', t('Bị động')]].map(([k, l]) => `<button type="button" data-v="${k}" aria-pressed="${voice === k}">${l}</button>`).join('')}</div>` : '';
      $('#vbPol').innerHTML = [['aff', t('Khẳng định')], ['neg', t('Phủ định')], ['q', t('Nghi vấn')]].map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${pol === k}">${l}</button>`).join('');
      const g = groups.find(x => x.id === grp);
      $('#vbTs').innerHTML = g.tenses.map(x => {
        const pas = voice === 'pas', rows = pas ? x.passive : x.rows, ex = pas ? x.example.passive : x.example.en;
        const name = N[x.id], sub = vi || name !== x.en ? x.en : '';
        let body;
        if (x.rare) body = `<p class="vb-note">ℹ️ ${t('Hầu như không dùng trong tiếng Anh thực tế.')}</p>`;
        else if (pas && !Array.isArray(rows)) body = `<p class="vb-note">ℹ️ ${t('Bị động ở thì này hiếm dùng – nên chuyển sang thì khác.')}</p>`;
        else body = tableH(rows)
          + (ex ? `<p class="vb-ex">${EN(ex)} ${sayBtn(ex, t('Nghe câu ví dụ'))}</p>` : '')
          + (x.stative && !pas ? `<p class="vb-note">⚠️ ${t('Động từ trạng thái: thường không dùng ở thì tiếp diễn (I know, không phải I am knowing).')}</p>` : '')
          + (x.dual && !pas ? `<p class="vb-note">💡 ${t('Dùng tiếp diễn được khi mang nghĩa hành động (I’m thinking about it), không dùng khi chỉ ý kiến/trạng thái (I think so).')}</p>` : '')
          + (x.mustNote ? `<p class="vb-note">💡 ${t('Phủ định của suy luận “must have” là can’t have / couldn’t have; hầu như không dùng ở câu hỏi.')}</p>` : '');
        const listen = Array.isArray(rows) ? rows.map(y => y.aff).join('. ') : '';
        return `<details class="vb-t" data-id="${x.id}" ${open.has(x.id) ? 'open' : ''}><summary><span class="vb-tn"><b>${esc(name)}</b>${sub ? `<small lang="en" translate="no">${esc(sub)}</small>` : ''}</span><code class="vb-f" translate="no">${esc(pas && x.formulaP ? x.formulaP : x.formula)}</code></summary>
          <div class="vb-tb"><p class="vb-use">${esc(U[x.id])}</p>${body}
          <div class="vb-acts">${listen ? `<button type="button" class="btn sm ghost" data-vsay="${esc(listen)}">🔊 ${t('Nghe cả bảng')}</button>` : ''}<a class="btn sm ghost" href="#/grammar/${x.lesson}">📐 ${t('Học bài về thì này')}</a></div></div></details>`;
      }).join('');
      $$('#vbTs details').forEach(d => d.ontoggle = () => { d.open ? open.add(d.dataset.id) : open.delete(d.dataset.id); });
      const tabs = $$('#vbTabs [role=tab]');
      tabs.forEach((b, i) => {
        b.onclick = () => { grp = b.dataset.g; ss('vb.g', grp); drawTenses(); $('#vbt-' + grp).focus(); };
        b.onkeydown = e => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return; e.preventDefault(); tabs[(i + k + tabs.length) % tabs.length].click(); };
      });
      $$('#vbVoice button').forEach(b => b.onclick = () => { voice = b.dataset.v; drawTenses(); });
      $$('#vbPol button').forEach(b => b.onclick = () => { pol = b.dataset.p; ss('vb.pol', pol); drawTenses(); });
      if (want && open.has(want)) { const d = $(`#vbTs details[data-id="${want}"]`); if (d && d.scrollIntoView) setTimeout(() => d.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), 60); }
    };
    drawTenses();
    $$('#vbReg button').forEach(b => b.onclick = () => { ss('vb.region', b.dataset.r); verbPage(arg, query); });
    bindSearch(); bindSay();
  }
  function bindSay() { view.onclick = e => { const b = e.target.closest && e.target.closest('[data-vsay]'); if (b) { e.preventDefault(); say(b.dataset.vsay); } }; App.cleanups.push(() => { view.onclick = null; }); }

  routes.verb = function (arg, query) { style(); return arg ? verbPage(arg, query) : landing(); };
})();
