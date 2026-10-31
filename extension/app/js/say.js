/* 🗣️ Say it like a native – thẻ phản xạ 2 mặt (docs/SAY-NATIVE.md). Dữ liệu web/data/say.json (scripts/say-native/build.mjs, cổng nội dung).
 * #/say = các loạt · #/say/<loạt>/<thẻ> = thẻ (chạm lật). Khung = Stitch v2 tự sinh (brand/stitch/v2/bind/say-front|say-back.json → ST2.mount),
 * giáo viên của loạt (Ama nữ / Carlos nam) CHỈ qua Chars.still(<giáo viên>, <tư thế của thẻ>); giọng 🔊 = giọng của đúng giáo viên đó (Chars.voice).
 * 🔊 nghe · 🎧 nghe từ tốn · 🎤 nói thử (UI.recognize, chấm % giống) · chia sẻ ảnh 1:1 / 4:5 vẽ Canvas trên máy (LKFile) + link sâu.
 * Câu thô ('đừng nói', sắc thái rude) đã được che bằng • khi dựng dữ liệu – không bao giờ đọc to, không vào ảnh chia sẻ.
 * Nạp lười: App.need('say') (BUNDLES.say trong app.js); chuỗi giao diện = nhóm i18n lười 'say' (+ 'v2'). */
(function (g) {
  'use strict';
  const { routes } = App, { $, esc, toast, modal } = UI;
  const SITE = 'https://lexkite.com/app/#/say', SEEN = 'lk.say.seen';
  const C = { teal: '#0F3D3E', teal2: '#17595A', coral: '#E5502F', cream: '#FFF7EA', mint: '#2dd4bf', ink: '#10191B', muted: '#5A7175' };
  let dataP = null;
  const data = () => dataP || (dataP = fetch('data/say.json', { cache: 'no-cache' }).then(r => { if (!r.ok) throw new Error('say ' + r.status); return r.json(); }).catch(e => { dataP = null; throw e; }));
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '{}') || {}; } catch (e) { return {}; } };
  const markSeen = k => { try { const s = seen(); s[k] = 1; localStorage.setItem(SEEN, JSON.stringify(s)); } catch (e) { /* bỏ qua */ } };
  // Nhãn theo dữ liệu (t() chỉ gọi lúc vẽ – I18N-PIPELINE §2.8)
  const REG = () => ({ polite: t('Lịch sự'), neutral: t('Sắc thái trung tính'), casual: t('Thân mật'), blunt: t('Cộc lốc'), rude: t('Thô lỗ') });
  const REACT = () => ({ polite: t('Khéo lắm! Không ai phật lòng.'), neutral: t('Rõ ràng mà vẫn thân thiện.'), casual: t('Thoải mái – hợp nói với bạn bè.') });
  const WHY = () => ({ blunt: t('Nghe gay gắt'), rude: t('Xúc phạm người nghe'), polite: t('Giữ hòa khí'), neutral: t('Tự nhiên, dễ nghe'), casual: t('Gần gũi') });
  const learn = () => (g.I18N && I18N.learnLang ? I18N.learnLang() : I18N.lang());
  const langName = l => { try { return new Intl.DisplayNames([I18N.lang()], { type: 'language' }).of(l); } catch (e) { return l; } };
  const navHtml = d => (ST2.shell ? `<div class="lg:hidden">${ST2.shell(Object.assign({ hdr: ST2.hdr() }, d)).nav}</div>` : ''); // shell cần d.hdr (mount tự thêm vào bản sao của nó)
  const teacher = (who, pose, alt) => Chars.img(who, { kind: 'still', pose, size: 140, alt: alt || '', cls: 'w-full h-full object-contain object-bottom select-none' });
  const say = (text, who, rate) => UI.tts(text, 'en-US', rate, { voice: Chars.voice(who) });
  const err = view => { view.innerHTML = `<div class="empty"><p>${esc(t('Không tải được – thử lại sau'))}</p><a class="btn" href="#/say">${esc(t('Thử lại'))}</a></div>`; };

  routes.say = async function (arg) {
    const view = $('#view');
    let D; try { D = await (App.W || (p => p))(data()); } catch (e) { return err(view); }
    const [sid, iid] = String(arg || '').split('/'), s = D.series.find(x => x.id === sid);
    if (!s) return list(view, D);
    const i = Math.max(0, s.items.findIndex(x => x.id === iid));
    if (!iid || s.items[i].id !== iid) { location.replace('#/say/' + s.id + '/' + s.items[i].id); return; }
    card(view, s, i);
  };

  // 📚 Các loạt (chưa có ref Stitch riêng → cùng token/khuôn thẻ của mặt trước; chủ duyệt ảnh)
  function list(view, D) {
    const sn = seen(), d = { tabs: ST2.tabs('train') };
    const rows = D.series.map(s => { const n = s.items.filter(x => sn[s.id + '/' + x.id]).length, first = s.items.find(x => !sn[s.id + '/' + x.id]) || s.items[0];
      return `<a href="#/say/${esc(s.id)}/${esc(first.id)}" class="flex items-center gap-3 p-3 pr-4 rounded-[1.25rem] border-2 min-h-[88px] lt:bg-[#ffffff] lt:border-[#eae1d8] lt:shadow-[0_5px_0_#e2d5c7] dk:bg-[#10252b] dk:border-[#234e57] dk:shadow-[0_6px_0_#051013]">
        <span class="w-16 h-16 shrink-0 rounded-[1rem] overflow-hidden flex items-end justify-center lt:bg-[#f6ece4] dk:bg-[#121d20]">${Chars.img(s.teacher, { kind: 'still', pose: s.items[0].pose, size: 64, alt: '', cls: 'w-full h-full object-contain object-bottom' })}</span>
        <span class="flex-1 min-w-0"><span class="block text-[17px] leading-[22px] font-extrabold tracking-tight lt:text-[#10191b] dk:text-[#e6f1f3]" lang="en">${esc(s.title)}</span>
        <span class="block text-[13px] leading-[18px] font-semibold mt-0.5 lt:text-[#46595c] dk:text-[#a9bec2]">${esc(t('{n}/{total} thẻ · với {name}', { n, total: s.items.length, name: Chars.name(s.teacher) }))}</span></span>
        <span class="material-symbols-outlined text-[22px] lt:text-[#00514d] dk:text-[#2dd4bf]" aria-hidden="true">arrow_forward</span></a>`; }).join('');
    ST2.mount(view, 'say-front', Object.assign(d, { series: '', step: '', regLbl: '', say: '', ipa: '', teacher: '', back: '#/train', pct: 0, n: 0, total: 0, nav: '', heard: '' }), null);
    const root = view.querySelector('.v2'), main = root.querySelector('main');
    main.innerHTML = `<p class="text-[15px] leading-[22px] font-semibold px-1 lt:text-[#46595c] dk:text-[#a9bec2]">${esc(t('Câu người bản xứ hay nói, kèm tình huống dùng và câu nên tránh. Chạm thẻ để lật.'))}</p>
      <div id="sayList" class="flex flex-col gap-3 pt-3 pb-28">${rows}</div>`;
    main.insertAdjacentHTML('afterend', navHtml(d));
    root.querySelector('header button[data-href]').setAttribute('aria-label', t('Quay về'));
    const fl = root.querySelector('#sFlag'); if (fl) { fl.classList.add('invisible'); fl.setAttribute('aria-hidden', 'true'); fl.tabIndex = -1; } // ⚑ chỉ có nghĩa trên một thẻ cụ thể; giữ chỗ để tiêu đề ở giữa
  }

  // 🃏 Thẻ: mặt trước ↔ mặt sau (cùng route, lật tại chỗ; giảm chuyển động → đổi ngay)
  function card(view, s, i) {
    const it = s.items[i], R = REG(), W = WHY(), total = s.items.length, who = s.teacher, l = learn();
    const nextIt = s.items[(i + 1) % total], key = s.id + '/' + it.id;
    const meaning = l !== 'en' && it.m && it.m[l] ? it.m[l] : it.mean, mLang = meaning === it.mean ? 'en' : l;
    const base = { tabs: ST2.tabs('train'), back: '#/say', say: it.say, regLbl: R[it.reg] || it.reg, heard: '<p id="sHeard" class="min-h-[20px] text-center text-[14px] leading-[20px] font-bold pt-2 lt:text-[#00514d] dk:text-[#2dd4bf]" aria-live="polite"></p>' };
    base.nav = navHtml(base);
    const navPad = base.nav + '<div class="h-[92px] shrink-0 lg:hidden" aria-hidden="true"></div>'; // mặt sau dài: chừa chỗ cho thanh tab cố định
    const front = Object.assign({}, base, { series: `${s.title} · ${i + 1}/${total}`, step: t('Thẻ {n}/{total}', { n: i + 1, total }), ipa: it.ipa ? `/${String(it.ipa).replace(/^\/|\/$/g, '')}/` : '',
      pct: Math.round((i + 1) / total * 1000) / 10, n: i + 1, total, teacher: teacher(who, it.pose) });
    // real = nghĩa tiếng Anh dễ hiểu kèm nghĩa bản ngữ (en: nghĩa dễ hiểu đã là dòng chính → ẩn)
    const back = Object.assign({}, base, { react: REACT()[it.reg] || '', def: it.def || '', mLbl: mLang === 'en' ? t('Nghĩa dễ hiểu') : t('Nghĩa ({lang})', { lang: langName(l) }), mLang, meaning,
      real: mLang === 'en' ? '' : t('Thực ra là: {s}', { s: it.mean }), when: it.when, dont: it.dont ? it.dont.text : '', dontReg: it.dont ? R[it.dont.reg] : '', dontWhy: it.dont ? W[it.dont.reg] : '',
      dontAria: it.dont ? (it.dont.masked ? t('Câu thô lỗ – đã che') : it.dont.text) : '', swap: it.swap ? it.swap.text : '', swapReg: it.swap ? R[it.swap.reg] : '', swapWhy: it.swap ? W[it.swap.reg] : '',
      next: '#/say/' + s.id + '/' + nextIt.id, teacher: teacher(who, it.pose), nav: navPad });
    markSeen(key);
    let face = 'front', rec = null;
    const stopRec = () => { if (rec) { try { rec.stop(); } catch (e) { /* bỏ qua */ } rec = null; } };
    App.onCleanup && App.onCleanup(() => { stopRec(); UI.stopSpeak(); });
    const paint = (f, anim) => {
      stopRec(); UI.stopSpeak(); face = f;
      const root = ST2.mount(view, f === 'front' ? 'say-front' : 'say-back', f === 'front' ? front : back, null);
      const c = $('#sCard', root);
      if (anim && !matchMedia('(prefers-reduced-motion: reduce)').matches && c.animate) c.animate([{ transform: 'perspective(900px) rotateY(80deg)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'ease-out' });
      wire(root);
    };
    const flip = () => { paint(face === 'front' ? 'back' : 'front', true); const b = $(face === 'front' ? '#sFlip' : '#sSpk'); if (b) b.focus({ preventScroll: true }); };
    const mic = btn => {
      const out = $('#sHeard'); if (rec) return stopRec();
      if (!UI.recognize) return toast(t('Trình duyệt này chưa hỗ trợ nhận giọng nói'));
      btn.setAttribute('aria-pressed', 'true'); out.textContent = t('Đang nghe… hãy nói câu trên');
      rec = UI.recognize(it.say, 'en-US', {
        result: ({ heard, score }) => { out.textContent = (score >= 85 ? t('Chuẩn như người bản xứ! {p}%', { p: score }) : score >= 60 ? t('Gần đúng rồi – {p}%. Nghe lại và thử lần nữa nhé.', { p: score }) : t('Chưa giống lắm ({p}%). Nghe từ tốn rồi nói lại nhé.', { p: score })) + (heard ? ' · “' + heard + '”' : ''); },
        error: code => { out.textContent = code === 'not-allowed' ? t('Hãy cho phép dùng micro để luyện nói') : code === 'unsupported' ? t('Trình duyệt này chưa hỗ trợ nhận giọng nói') : t('Không nghe rõ – thử lại nhé'); },
        end: () => { rec = null; btn.setAttribute('aria-pressed', 'false'); },
      });
    };
    function wire(root) {
      const c = $('#sCard', root);
      if (face === 'front') c.addEventListener('click', e => { if (!e.target.closest('button:not(#sFlip)')) flip(); });
      const on = (id, fn) => { const b = $(id, root); if (b) b.onclick = e => { e.stopPropagation(); fn(b); }; };
      on('#sFlip', flip);
      on('#sSpk', () => say(it.say, who));
      on('#sSlow', () => say(it.say, who, 0.7));
      on('#sMic', mic);
      on('#sShare', () => share(s, it, meaning));
      on('#sFlag', () => g.LexReportLoad && LexReportLoad().then(Rp => Rp && Rp.open({ cat: 'content', cid: 'say:' + key })).catch(() => {}));
      const bk = root.querySelector('header button[data-href]'); if (bk) bk.setAttribute('aria-label', t('Quay về'));
    }
    document.onkeydown = e => { if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return; if (e.key === 'ArrowRight') location.hash = back.next; else if (e.key === 'f' || e.key === 'F') flip(); };
    paint('front', false);
  }

  // 📤 Ảnh chia sẻ 1:1 (1080×1080) / 4:5 (1080×1350) – chỉ chữ của thẻ (không có câu 'đừng nói'), giáo viên = ảnh Chars, link sâu + QR
  const wrap = (ctx, s, maxW) => { const out = []; let line = ''; for (const w of String(s).split(/\s+/)) { const tryL = line ? line + ' ' + w : w; if (ctx.measureText(tryL).width > maxW && line) { out.push(line); line = w; } else line = tryL; } if (line) out.push(line); return out; };
  const loadImg = src => new Promise(r => { const im = new Image(); im.onload = () => r(im); im.onerror = () => r(null); im.src = src; });
  async function render(cv, s, it, meaning, tall) {
    const W = 1080, H = tall ? 1350 : 1080, ctx = cv.getContext('2d'), F = '"Plus Jakarta Sans",system-ui,sans-serif', P = 72, url = `${SITE}/${s.id}/${it.id}`;
    cv.width = W; cv.height = H; if (document.fonts && document.fonts.ready) await document.fonts.ready.catch(() => {});
    ctx.fillStyle = C.teal; ctx.fillRect(0, 0, W, H);
    const cy = 150, ch = H - cy - 250; ctx.fillStyle = C.cream; ctx.beginPath(); ctx.roundRect(P, cy, W - 2 * P, ch, 56); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 40px ${F}`; ctx.textBaseline = 'middle'; ctx.fillText(t('Nói như người bản xứ'), P, 84);
    ctx.font = `800 30px ${F}`; const reg = REG()[it.reg] || it.reg, rw = ctx.measureText(reg).width + 56;
    ctx.fillStyle = C.teal2; ctx.beginPath(); ctx.roundRect(P + 48, cy + 48, rw, 56, 28); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(reg, P + 76, cy + 77);
    ctx.fillStyle = C.ink; ctx.font = `800 ${tall ? 76 : 68}px ${F}`; let y = cy + 200;
    for (const ln of wrap(ctx, '“' + it.say + '”', W - 2 * P - 96).slice(0, 4)) { ctx.fillText(ln, P + 48, y); y += tall ? 92 : 82; }
    ctx.fillStyle = C.coral; ctx.font = `700 40px ${F}`; y += 16;
    for (const ln of wrap(ctx, meaning, W - 2 * P - 96 - 300).slice(0, 3)) { ctx.fillText(ln, P + 48, y); y += 54; }
    ctx.fillStyle = C.muted; ctx.font = `600 32px ${F}`; y += 12;
    for (const ln of wrap(ctx, t('Dùng khi') + ': ' + it.when, W - 2 * P - 96 - 300).slice(0, 3)) { ctx.fillText(ln, P + 48, y); y += 44; }
    const im = await loadImg(Chars.still(s.teacher, it.pose)); // giáo viên đứng trên đáy thẻ kem (chạm nền, không khung)
    if (im) { const ih = Math.min(ch * 0.62, 460), iw = im.width / im.height * ih; ctx.drawImage(im, W - P - iw - 24, cy + ch - ih, iw, ih); }
    const qs = 150, qx = P, qy = H - 200;
    if (g.LKQR) try { const q = LKQR.make(url), n = q.size + 4, c = qs / n; ctx.fillStyle = '#fff'; ctx.fillRect(qx, qy, qs, qs); ctx.fillStyle = C.teal; for (let r = 0; r < q.size; r++) for (let k = 0; k < q.size; k++) if (q.matrix[r][k]) ctx.fillRect(Math.floor(qx + (k + 2) * c), Math.floor(qy + (r + 2) * c), Math.ceil(c), Math.ceil(c)); } catch (e) { /* bỏ qua QR */ }
    ctx.fillStyle = '#fff'; ctx.font = `800 40px ${F}`; ctx.fillText('lexkite.com', qx + qs + 32, qy + 52);
    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.font = `600 28px ${F}`; ctx.fillText(t('Luyện nói câu này cùng {name}', { name: Chars.name(s.teacher) }), qx + qs + 32, qy + 104);
  }
  async function share(s, it, meaning) {
    await App.need('share').catch(() => {});
    const box = modal(`<div class="sc grid gap-3 justify-items-center text-center"><h2 id="sayShH" class="text-[20px] font-extrabold">${esc(t('Chia sẻ thẻ'))}</h2>
      <div role="tablist" class="inline-flex gap-1 p-1 rounded-full lt:bg-[#f6ece4] dk:bg-[#121d20]"><button type="button" role="tab" data-f="sq" aria-selected="true" class="min-h-[44px] px-4 rounded-full font-bold">${esc(t('Vuông 1:1'))}</button><button type="button" role="tab" data-f="tall" aria-selected="false" class="min-h-[44px] px-4 rounded-full font-bold">${esc(t('Dọc 4:5'))}</button></div>
      <canvas id="sayCv" width="1080" height="1080" role="img" aria-label="${esc(it.say)}" style="max-width:100%;max-height:56vh;width:auto;height:auto;border-radius:16px"></canvas>
      <div class="flex gap-2 flex-wrap justify-center"><button type="button" class="btn primary" id="sayShB">${esc(t('Chia sẻ'))}</button><button type="button" class="btn" id="sayDl">${esc(t('Tải ảnh'))}</button><button type="button" class="btn" id="sayLink">${esc(t('Chép link'))}</button></div></div>`);
    box.setAttribute('aria-labelledby', 'sayShH');
    const cv = box.querySelector('#sayCv'), url = `${SITE}/${s.id}/${it.id}`, text = t('“{s}” – nói như người bản xứ cùng Lexkite: {url}', { s: it.say, url });
    let tall = false, blob = null, seq = 0;
    const name = () => `lexkite-say-${it.id}-${tall ? '4x5' : '1x1'}.png`;
    const toBlob = () => new Promise(r => { try { cv.toBlob(b => r(b), 'image/png'); } catch (e) { r(null); } });
    const draw = async () => { const my = ++seq; blob = null; await render(cv, s, it, meaning, tall); const b = await toBlob(); if (my === seq) blob = b; };
    box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { tall = b.dataset.f === 'tall'; box.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-selected', String(x === b))); draw(); });
    const dl = async () => { const b = blob || await toBlob(); if (b) UI.download(b, name()); else toast(t('Không tải được – thử lại sau')); };
    box.querySelector('#sayDl').onclick = dl;
    box.querySelector('#sayLink').onclick = async () => { try { await navigator.clipboard.writeText(url); toast(t('Đã chép link')); } catch (e) { toast(url); } };
    box.querySelector('#sayShB').onclick = async () => { const b = blob || await toBlob(); if (!b || !g.LKFile) return dl();
      let r; try { r = await LKFile.save(b, name(), { share: true, title: t('Nói như người bản xứ'), text }); } catch (e) { return toast(t('Không tải được – thử lại sau')); }
      if (r === 'saved') try { await navigator.clipboard.writeText(text); toast(t('Đã tải ảnh – link đã được chép, dán kèm khi đăng nhé')); } catch (e) { /* bỏ qua */ } };
    draw();
  }

  g.SayNative = { render, data };
})(self);
