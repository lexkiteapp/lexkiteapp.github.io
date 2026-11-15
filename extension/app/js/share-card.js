/* ✨ Thẻ khoe thành tích [S1] – ảnh Story 9:16 (1080×1920) & bài đăng 1:1 (1080×1080) vẽ bằng Canvas ngay trên máy.
 * Chỉ dùng số liệu THẬT của người học (chuỗi ngày, thẻ ôn hôm nay, XP 7 ngày, % nhớ của phiên vừa xong, mục tiêu thi).
 * Bảo vệ cái tôi: ô có giá trị 0 bị ẩn, % nhớ chỉ hiện khi ≥ 80%; chưa có gì để khoe → lời động viên, không có thẻ.
 * Kit lấy từ web/js/kit.js (nguồn duy nhất), QR từ js/lib/qr.js. Chia sẻ qua LKFile (js/lib/save-file.js): navigator.share({files}) / bảng chia sẻ app gốc → không hỗ trợ thì tải ảnh + chép link.
 * Nạp lười qua App.need('share') (BUNDLES trong app.js); CSS & bản tiếng Anh (js/i18n/en/share.js) cũng nạp khi mở. */
(function (g) {
  'use strict';
  const d = document, URL_ = 'https://lexkite.com';
  const C = { teal: '#0F3D3E', teal2: '#17595A', coral: '#E5502F', orange: '#FFB054', gold: '#FFC94A', cream: '#FFF7EA', green: '#2FBF71' };
  const T = (k, v) => g.t(k, v);
  const ev = (a, k) => { try { navigator.sendBeacon('/api/hit', JSON.stringify({ t: 'q', ev: 'share_' + a + '_' + k })); } catch (e) { /* bỏ qua */ } }; // đếm ẩn danh: mở · gửi · tải · mời theo loại thẻ
  const XP_IN = 50, XP_OUT = 100; // thưởng: người được mời / người mời (mỗi bạn)
  // Liên kết đo được (docs/specs/funnel.md): trang đích /go/<ngôn ngữ>/ + UTM (nguồn share · phương tiện qr|link · chiến dịch = loại thẻ); không dữ liệu cá nhân
  const kindOf = S => (S.streak >= 3 ? 'streak' : S.acc ? 'result' : S.today >= S.goal ? 'goal' : 'day');
  // QR: bộ sinh qr.js chỉ chứa ≤ 62 byte → nguồn 'qr' + chiến dịch (không phương tiện/mã); liên kết chia sẻ: nguồn 'share' + phương tiện + mã giới thiệu tùy chọn
  const link = (kind, medium, code) => `${URL_}/go/${(g.I18N && I18N.lang && I18N.lang()) || 'en'}/?utm_source=${medium === 'qr' ? 'qr' : 'share&utm_medium=' + medium}&utm_campaign=${kind}${medium !== 'qr' && code && /^[\w.~-]{1,40}$/.test(code) ? '&c=' + code : ''}`;
  let dictP = null;
  const have = l => (g.I18N && g.I18N.has ? g.I18N.has(l, 'Trí nhớ siêu đỉnh!') : !!(g.I18N_DICT && g.I18N_DICT[l] && g.I18N_DICT[l]['Trí nhớ siêu đỉnh!'])); // gói khóa băm → I18N.has (dự phòng: i18n.js cũ trong bộ đệm)
  const dict = () => dictP || (dictP = (!g.I18N || I18N.lang() === 'vi' || (have('en') && (I18N.lang() === 'en' || have(I18N.lang())))) ? Promise.resolve() : new Promise(r => {
    const l = I18N.lang(), loadOne = src => new Promise(res => { const s = d.createElement('script'); s.src = src; s.onload = s.onerror = () => res(); d.head.appendChild(s); });
    loadOne('js/i18n/en/share.js').then(() => (l !== 'en' && l !== 'vi' ? loadOne(`js/i18n/${l}/share.js`) : null)).then(r);
  }));
  const css = () => {
    if (d.getElementById('sc-css')) return;
    const st = d.createElement('style'); st.id = 'sc-css';
    st.textContent = `.sc{display:grid;gap:.9rem;justify-items:center;text-align:center}.sc h2{margin:0;font-size:1.2rem}
.sc-tabs{display:inline-grid;grid-template-columns:1fr 1fr;gap:.3rem;background:var(--surface-2);padding:.3rem;border-radius:999px}
.sc-tabs button{border:0;background:none;padding:.5rem 1rem;border-radius:999px;font:inherit;font-weight:700;color:var(--muted);cursor:pointer;min-height:40px}
.sc-tabs button[aria-selected=true]{background:var(--surface);color:var(--text);box-shadow:0 2px 8px rgba(0,0,0,.1)}
.sc canvas{display:block;width:auto;max-width:100%;height:auto;max-height:min(56vh,520px);border-radius:16px;box-shadow:0 14px 34px rgba(15,61,62,.25);background:${C.teal}}
.sc-act{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}.sc-act .btn{min-height:44px}
.sc-inv{display:grid;gap:.4rem;justify-items:center}.sc-inv .btn{min-height:44px}.sc-inv p{margin:0;max-width:36ch}`;
    d.head.appendChild(st);
  };

  // Số liệu thật của người học
  function stats(acc) {
    const A = g.App || {}, s = A.state || {}, Co = g.Core || {}, key = x => (Co.todayKey ? Co.todayKey(x) : new Date(x).toISOString().slice(0, 10));
    const days = (s.game && s.game.days) || {}, set = s.settings || {};
    let week = 0; for (let i = 0; i < 7; i++) week += +((days[key(new Date(Date.now() - i * 864e5))] || {}).xp) || 0;
    const ex = A.exam ? A.exam() : '', X = (A.EXAMS || {})[ex];
    return {
      streak: A.streak ? A.streak() : 0,
      today: +((s.stats && s.stats.days || {})[key(new Date())]) || 0,
      goal: set.dailyGoal || 20, week, acc: acc >= 80 ? acc : null,
      exam: X ? X.short + (set.examTarget ? ' ' + set.examTarget : '') : '',
    };
  }

  const fontOf = () => { try { return getComputedStyle(d.body).fontFamily || 'sans-serif'; } catch (e) { return 'sans-serif'; } };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; } ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // Chữ dài (tiếng Đức, Nga…) tự thu nhỏ cho vừa khung, không tràn
  function fit(ctx, text, x, y, maxW, size, weight, F) { let s = size; do { ctx.font = `${weight} ${s}px ${F}`; } while (ctx.measureText(text).width > maxW && (s -= 2) > 14); ctx.fillText(text, x, y); }
  const img = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

  async function render(cv, S, story) {
    const W = 1080, H = story ? 1920 : 1080, ctx = cv.getContext('2d'), F = fontOf(), rtl = d.documentElement.dir === 'rtl';
    cv.width = W; cv.height = H;
    if (!ctx) return;
    try { await d.fonts.ready; } catch (e) { /* bỏ qua */ }
    ctx.direction = rtl ? 'rtl' : 'ltr';
    const bg = ctx.createLinearGradient(0, 0, W * 0.4, H); bg.addColorStop(0, C.teal); bg.addColorStop(1, '#082425');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = (x, y, r, c) => { const gr = ctx.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); };
    glow(W * 0.85, story ? 360 : 200, 520, 'rgba(23,89,90,.75)'); glow(W * 0.12, H * 0.78, 460, 'rgba(229,80,47,.26)');
    // Wordmark "lex" + "kite" gradient cam (BRAND-RULES)
    const top = story ? 150 : 96, P = 90;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = `800 56px ${F}`;
    const lw = ctx.measureText('lex').width, kw = ctx.measureText('kite').width, wx = (W - lw - kw) / 2;
    ctx.save(); ctx.direction = 'ltr'; ctx.fillStyle = '#fff'; ctx.fillText('lex', wx, top);
    const kg = ctx.createLinearGradient(wx + lw, 0, wx + lw + kw, 0); kg.addColorStop(0, C.coral); kg.addColorStop(1, C.orange); ctx.fillStyle = kg; ctx.fillText('kite', wx + lw, top); ctx.restore();
    // Kit trên đĩa kem (Kit màu teal đậm – cần nền sáng để nổi trên nền tối)
    const ks = story ? 360 : 230, ky = story ? 250 : 150, cx = W / 2;
    ctx.fillStyle = C.cream; ctx.beginPath(); ctx.arc(cx, ky + ks / 2, ks / 2 + (story ? 40 : 26), 0, Math.PI * 2); ctx.fill();
    if (g.Kit) try { const sv = Kit.svg(S.acc || S.streak >= 3 ? 'win' : 'cheer', ks, false).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '); ctx.drawImage(await img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sv)), cx - ks / 2, ky, ks, ks); } catch (e) { /* bỏ qua */ }
    // Tiêu đề & lời chúc
    const title = S.streak >= 3 ? '🔥 ' + T('Chuỗi {n} ngày', { n: S.streak }) : S.acc ? T('Trí nhớ siêu đỉnh!') : S.today >= S.goal ? T('Xong mục tiêu hôm nay!') : T('Hôm nay mình đã học bài!');
    const ty = story ? 760 : 480; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    fit(ctx, title, cx, ty, W - 2 * P, story ? 76 : 60, 800, F);
    ctx.fillStyle = 'rgba(255,255,255,.78)'; fit(ctx, T('Từng bước nhỏ mỗi ngày, tiến bộ lớn mỗi tháng.'), cx, ty + (story ? 84 : 64), W - 2 * P, story ? 36 : 30, 500, F);
    // Ô số liệu: chỉ ô có giá trị (không bao giờ hiện số 0 hay % thấp)
    const tiles = [
      S.streak > 0 && ['🔥', String(S.streak), T('Chuỗi ngày'), C.orange],
      S.today > 0 && ['📚', String(S.today), T('Thẻ ôn hôm nay'), '#9FE3D8'],
      S.acc && ['🎯', S.acc + '%', T('Nhớ ngay'), '#8EE6B0'],
      S.week > 0 && ['⚡', '+' + S.week.toLocaleString(I18N.lang()), T('XP tuần'), C.gold],
      S.exam && ['🎓', S.exam, T('Mục tiêu'), C.cream],
    ].filter(Boolean).slice(0, 4);
    const gy = story ? 960 : 600, gap = 24, tw = tiles.length === 1 ? W - 2 * P : (W - 2 * P - gap) / 2, th = story ? 210 : 150;
    tiles.forEach(([ic, v, lb, col], i) => {
      const cl = rtl ? 1 - (i % 2) : i % 2, x = P + cl * (tw + gap), y = gy + Math.floor(i / 2) * (th + gap);
      ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(ctx, x, y, tw, th, 28); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 2; rr(ctx, x, y, tw, th, 28); ctx.stroke();
      ctx.textAlign = 'start'; const sx = rtl ? x + tw - 32 : x + 32;
      ctx.fillStyle = col; fit(ctx, `${ic} ${v}`, sx, y + th * 0.4, tw - 64, story ? 64 : 48, 800, F);
      ctx.fillStyle = 'rgba(255,255,255,.75)'; fit(ctx, lb, sx, y + th * 0.76, tw - 64, story ? 30 : 24, 600, F);
    });
    // Chân thẻ: QR + lexkite.com
    const qs = story ? 170 : 130, qy = H - qs - (story ? 120 : 70), qx = rtl ? W - P - qs : P;
    ctx.fillStyle = '#fff'; rr(ctx, qx, qy, qs, qs, 18); ctx.fill();
    if (g.LKQR) try { const q = LKQR.make(link(kindOf(S), 'qr', S.ref)), n = q.size + 4, c = qs / n; ctx.fillStyle = C.teal; for (let r = 0; r < q.size; r++) for (let k = 0; k < q.size; k++) if (q.matrix[r][k]) ctx.fillRect(Math.floor(qx + (k + 2) * c), Math.floor(qy + (r + 2) * c), Math.ceil(c), Math.ceil(c)); } catch (e) { /* bỏ qua */ }
    const fx = rtl ? qx - 32 : qx + qs + 32, fw = W - 2 * P - qs - 32; ctx.textAlign = 'start';
    ctx.fillStyle = '#fff'; fit(ctx, 'lexkite.com', fx, qy + qs * 0.36, fw, story ? 48 : 40, 800, F);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; fit(ctx, T('Học từ vựng & luyện thi miễn phí'), fx, qy + qs * 0.72, fw, story ? 30 : 26, 500, F);
  }

  const toBlob = cv => new Promise(r => { try { cv.toBlob(b => r(b), 'image/png'); } catch (e) { r(null); } });
  const shareText = S => T('Mình đang học tiếng Anh mỗi ngày cùng Lexkite 🔥 Học miễn phí tại {url}', { url: link(kindOf(S), 'link', S.ref) });

  async function open(acc) {
    await dict(); css();
    const S = stats(+acc || 0), { modal, toast, download } = g.UI;
    if (!S.streak && !S.today) { // chưa có gì để khoe → động viên, không có thẻ
      const box = modal(`<div class="sc">${g.Kit ? Kit.svg('sleep', 110) : '☕'}<h2>${T('Não bạn đang ở chế độ nghỉ dưỡng')}</h2><p class="muted">${T('Làm ly cà phê rồi ôn vài thẻ nhé ☕ – xong là có thành tích để khoe ngay.')}</p><div class="sc-act"><a class="btn primary" href="#/review" data-close>${T('Ôn ngay')}</a><button type="button" class="btn ghost" data-close>${T('Đóng')}</button></div></div>`);
      box.setAttribute('aria-label', T('Khoe thành tích')); return;
    }
    const box = modal(`<div class="sc"><h2 id="scTitle">✨ ${T('Khoe thành tích')}</h2>
      <div class="sc-tabs" role="tablist"><button type="button" role="tab" data-f="story" aria-selected="true">📱 ${T('Story 9:16')}</button><button type="button" role="tab" data-f="sq" aria-selected="false">🖼️ ${T('Bài đăng 1:1')}</button></div>
      <canvas id="scCv" width="1080" height="1920" role="img" aria-label="${T('Thẻ thành tích')}"></canvas>
      <div class="sc-act"><button type="button" class="btn primary" id="scShare">📤 ${T('Chia sẻ')}</button><button type="button" class="btn" id="scDl">⬇️ ${T('Tải ảnh')}</button><button type="button" class="btn ghost" data-close>${T('Đóng')}</button></div>
      <div class="sc-inv"><button type="button" class="btn" id="scInv">🎁 ${T('Mời bạn học cùng')}</button><p class="muted small">${T('Bạn và bạn bè cùng nhận +{xp} XP và 1 lượt đóng băng chuỗi khi bạn ấy học xong bài đầu', { xp: XP_OUT })}</p></div></div>`);
    box.setAttribute('aria-labelledby', 'scTitle');
    ev('open', kindOf(S));
    const cv = box.querySelector('#scCv'), name = f => `lexkite-${f === 'story' ? 'story' : 'post'}-${new Date().toISOString().slice(0, 10)}.png`;
    let fmt = 'story', blob = null, seq = 0;
    // Vẽ xong là tạo sẵn ảnh → lúc bấm "Chia sẻ" gọi navigator.share NGAY (Safari iOS đòi thao tác người dùng còn hiệu lực)
    const draw = async () => { const my = ++seq; blob = null; await render(cv, S, fmt === 'story'); const b = await toBlob(cv); if (my !== seq) return; blob = b; };
    box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { if (fmt === b.dataset.f) return; fmt = b.dataset.f; box.querySelectorAll('[data-f]').forEach(x => x.setAttribute('aria-selected', String(x === b))); draw(); });
    const save = async () => { ev('dl', kindOf(S)); const b = blob || await toBlob(cv); if (b) download(b, name(fmt)); else toast(T('Không tải được – thử lại sau')); };
    box.querySelector('#scDl').onclick = save;
    box.querySelector('#scInv').onclick = () => { ev('inv', kindOf(S)); invite(); };
    // Web: navigator.share({files}) → không được thì tải ảnh + chép link. App gốc: bảng chia sẻ hệ điều hành (js/lib/save-file.js)
    box.querySelector('#scShare').onclick = async () => {
      ev('send', kindOf(S)); const b = blob || await toBlob(cv); if (!b || !g.LKFile) return save();
      let r; try { r = await LKFile.save(b, name(fmt), { share: true, title: T('Khoe thành tích'), text: shareText(S) }); } catch (e) { return toast(T('Không tải được – thử lại sau')); }
      if (r === 'saved') try { await navigator.clipboard.writeText(shareText(S)); toast(T('Đã tải ảnh – link đã được chép, dán kèm khi đăng nhé')); } catch (e) { /* bỏ qua */ }
    };
    // Đóng hộp → giải phóng bộ nhớ canvas (Safari iOS giới hạn tổng dung lượng canvas)
    const m = d.getElementById('modal'); if (m && 'MutationObserver' in g) { const mo = new MutationObserver(() => { if (m.hidden || !cv.isConnected) { cv.width = cv.height = 0; mo.disconnect(); } }); mo.observe(m, { attributes: true, attributeFilter: ['hidden'], childList: true, subtree: true }); }
    draw();
  }

  // ===== Vòng giới thiệu (docs/specs/referral.md): link mời /go/<lang>/?utm_source=ref&c=<mã> → bạn mới học xong bài đầu → cả hai nhận XP + 1 lượt đóng băng ($0, chỉ trong app) =====
  const LS = (() => { try { return localStorage; } catch (e) { return null; } })(), BASE = typeof location !== 'undefined' && /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : URL_;
  const code = () => { let c = LS && LS.getItem('lk.rc'); if (!c || !/^[a-z0-9]{8}$/.test(c)) { c = Array.from(crypto.getRandomValues(new Uint8Array(8)), x => 'abcdefghijklmnopqrstuvwxyz0123456789'[x % 36]).join(''); try { LS.setItem('lk.rc', c); } catch (e) { /* bỏ qua */ } } return c; };
  const inviteLink = () => `${URL_}/go/${(g.I18N && I18N.lang && I18N.lang()) || 'en'}/?utm_source=ref&utm_medium=invite&c=${code()}`;
  async function invite() {
    const url = inviteLink(), text = T('Mình đang học tiếng Anh miễn phí với Lexkite. Vào học thử 1 phút, hai đứa cùng nhận quà nhé! {url}', { url });
    try { if (navigator.share) { await navigator.share({ title: 'Lexkite', text, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); g.UI.toast(T('Link mời đã được chép – dán gửi bạn nhé')); } catch (e) { g.UI.toast(url); }
  }
  // Thưởng trong app: XP + 1 lượt đóng băng (tối đa 2 – như chuỗi 7 ngày, js/core.js freezeInfo). Gọi 1 lần ~20 giây sau khi mở app, nếu máy có mã mời hoặc đến từ link mời; không thông báo đẩy.
  const reward = (xp, fz) => g.Game.mutate(gs => { gs.xp = (gs.xp || 0) + xp; if (fz) gs.freezes = Math.min(2, (gs.freezes || 0) + 1); });
  async function refSync() {
    if (!LS || !g.Game || !g.UI) return;
    try { // người được mời: 1 lần/máy, không tự thưởng bằng link của chính mình
      const at = JSON.parse(LS.getItem('lk.at') || 'null');
      if (at && at.s === 'ref' && /^[a-z0-9]{8}$/.test(at.k || '') && at.k !== LS.getItem('lk.rc') && !LS.getItem('lk.refIn')) { LS.setItem('lk.refIn', '1'); await reward(XP_IN, 1); g.UI.toast(T('🎁 Bạn được bạn bè mời! Nhận +{xp} XP và 1 lượt đóng băng chuỗi', { xp: XP_IN })); }
    } catch (e) { /* bỏ qua */ }
    const c = LS.getItem('lk.rc'); if (!c) return; // người mời: máy chủ đếm bạn mới đã học xong bài đầu (≤ 3/ngày, ≤ 10 tổng)
    try {
      const r = await fetch(BASE + '/api/ref?c=' + c); if (!r.ok) return;
      const n = Math.min(10, +(await r.json()).n || 0), paid = +LS.getItem('lk.refPaid') || 0;
      if (n > paid) { LS.setItem('lk.refPaid', String(n)); await reward((n - paid) * XP_OUT, 1); g.UI.toast(T('🎉 {n} bạn bè bạn mời đã học xong bài đầu – bạn nhận +{xp} XP và 1 lượt đóng băng chuỗi', { n: n - paid, xp: (n - paid) * XP_OUT })); }
    } catch (e) { /* bỏ qua */ }
  }

  g.ShareCard = { open, render, stats, link, kindOf, refSync, inviteLink };
})(typeof self !== 'undefined' ? self : this);
