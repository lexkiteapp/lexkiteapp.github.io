/* 🔥 Lớp giữ thói quen (docs/RETENTION.md) – tải lười gói 'ret', chỉ khi cờ `ret` bật (lk.cfg v.ret = '1' hoặc ?ret=1 → lk.ret).
 * KHÔNG viết lại streak/đóng băng: chuỗi = cùng công thức app.js (activeDays), lượt đóng băng vẫn do app.js cộng mỗi 7 ngày (Core.Stats.freezeInfo).
 * Thêm: lịch tuần · mốc 3/7/14/30/50/100/180/365 có màn chúc mừng Ama/Carlos · nghi thức "chạm 3 lần để rã băng" khi lượt đóng băng tự cứu chuỗi
 * · sự kiện mùa (gom 5 mảnh trong khoảng sự kiện, ngày nào học cũng được – không cần liên tiếp) · rương mỹ phẩm (khung ảnh đại diện, nhãn dán)
 * · quảng cáo có thưởng CHỈ cho mỹ phẩm thêm (tự chọn, không bao giờ chặn học). Dữ liệu ở game.ret → đồng bộ Drive/D1 cùng game (luật gộp: sync.js mergeRet). */
(function (g) {
  'use strict';
  const t = (k, p) => (g.t ? g.t(k, p) : k);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const keyOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  const MILESTONES = [3, 7, 14, 30, 50, 100, 180, 365];
  // Sự kiện mùa: [from, to] tính theo ngày máy người học; need mảnh = need ngày có học trong khoảng đó
  const EVENTS = [
    { id: 'autumn26', from: '2026-10-27', to: '2026-11-30', icon: '🍂', need: 5, frame: 'leaf' },
    { id: 'winter26', from: '2026-12-15', to: '2027-01-15', icon: '❄️', need: 5, frame: 'snow' },
    { id: 'spring27', from: '2027-03-15', to: '2027-04-15', icon: '🌸', need: 5, frame: 'bloom' },
  ];
  // Mỹ phẩm: f: = khung ảnh đại diện, s: = nhãn dán. Thứ tự rương cố định (minh bạch, không may rủi): luôn ra món đầu tiên chưa có.
  const FRAMES = { teal: 'linear-gradient(135deg,#14b8a6,#0e7490)', ice: 'linear-gradient(135deg,#bae6fd,#38bdf8)', fire: 'linear-gradient(135deg,#fb923c,#dc2626)', gold: 'linear-gradient(135deg,#fde68a,#d97706)', night: 'linear-gradient(135deg,#6366f1,#1e1b4b)', rainbow: 'conic-gradient(#f43f5e,#f59e0b,#22c55e,#0ea5e9,#8b5cf6,#f43f5e)', leaf: 'linear-gradient(135deg,#f59e0b,#b45309)', snow: 'linear-gradient(135deg,#e0f2fe,#7dd3fc)', bloom: 'linear-gradient(135deg,#fbcfe8,#ec4899)' };
  const STICKERS = { star: '⭐', kite: '🪁', book: '📘', rocket: '🚀', crown: '👑', goal: '🎯', sun: '🌞', gem: '💎' };
  const POOL = ['f:ice', 's:star', 'f:fire', 's:kite', 's:book', 'f:gold', 's:rocket', 'f:night', 's:goal', 's:sun', 'f:rainbow', 's:gem', 's:crown'];
  const TEACH = { ama: 'img/teach/ama.webp', carlos: 'img/teach/carlos.webp' };

  // ---------- Lõi thuần (kiểm thử: scripts/test/retention.mjs) ----------
  const Core = {
    MILESTONES, EVENTS, POOL, FRAMES, STICKERS,
    /** Tập ngày có học – y hệt app.js activeDays (stats.days > 0, game.days.xp > 0, game.frozen) */
    activeDays(state) {
      const s = (state && state.stats) || {}, gm = (state && state.game) || {}, set = new Set();
      for (const [k, v] of Object.entries(s.days || {})) if (v > 0) set.add(k);
      for (const [k, v] of Object.entries(gm.days || {})) if (v && v.xp > 0) set.add(k);
      Object.keys(gm.frozen || {}).forEach(k => set.add(k));
      return set;
    },
    streak(days, now) {
      const d = new Date(now || Date.now()); let n = 0;
      if (!days.has(keyOf(d))) d.setDate(d.getDate() - 1);
      while (days.has(keyOf(d))) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    /** Lịch tuần Thứ 2 → CN: done | frozen | miss | today | future */
    week(days, frozen, now) {
      const d = new Date(now || Date.now()), today = keyOf(d); d.setDate(d.getDate() - (d.getDay() + 6) % 7);
      const out = [];
      for (let i = 0; i < 7; i++) {
        const k = keyOf(d), fz = !!(frozen && frozen[k]);
        out.push({ k, dow: i, st: fz ? 'frozen' : days.has(k) ? 'done' : k === today ? 'today' : k > today ? 'future' : 'miss' });
        d.setDate(d.getDate() + 1);
      }
      return out;
    },
    next(streak) { return MILESTONES.find(m => m > streak) || Math.ceil((streak + 1) / 100) * 100; },
    /** Mốc chưa chúc mừng: chỉ mốc CAO nhất ≤ chuỗi (nhảy mốc khi đồng bộ máy khác → 1 màn, không dồn 3 màn) */
    pending(ret, streak) { const ms = (ret && ret.ms) || {}; const hit = MILESTONES.filter(m => m <= streak && !ms[m]); return hit.length ? hit[hit.length - 1] : 0; },
    event(today) { return EVENTS.find(e => today >= e.from && today <= e.to) || null; },
    chests(ret) { ret = ret || {}; const earned = Object.keys(ret.ms || {}).length + Object.keys(ret.evDone || {}).length; return Math.max(0, earned - (+ret.opened || 0)); },
    nextPrize(ret) { const own = (ret && ret.own) || {}; return POOL.find(p => !own[p]) || ''; },
  };

  const Ret = { core: Core };
  g.Ret = Ret;
  if (typeof document === 'undefined' || !g.App || !g.UI) return; // Node (kiểm thử lõi)

  const App = g.App, UI = g.UI, state = App.state;
  const view = () => document.getElementById('view');
  const ret = () => (state.game && state.game.ret) || {};
  // Ghi game.ret rồi gắn vào CHÍNH đối tượng state.game đang dùng (không thay đối tượng – module khác/kiểm thử giữ tham chiếu)
  const mutate = async fn => { const s = await g.Game.mutate(gs => { gs.ret = gs.ret || {}; fn(gs.ret, gs); }); state.game.ret = s.ret; return state.game.ret; };
  const on = () => !App.retOn || App.retOn(); // gói có thể bị nạp kèm (courses.js nạp mọi gói) → cờ tắt = không làm gì ngầm
  const days = () => (App.activeDays ? App.activeDays() : Core.activeDays(state));
  const streakN = () => (App.streak ? App.streak() : Core.streak(days()));
  const today = () => keyOf(new Date());
  const reduce = () => g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const teacherFor = n => (MILESTONES.indexOf(n) % 2 ? 'carlos' : 'ama');
  const teachImg = (who, size) => `<img class="ret-teach" src="${TEACH[who]}" width="${size}" height="${size}" alt="${esc(who === 'ama' ? 'Ama' : 'Carlos')}" loading="lazy" decoding="async">`;
  const DOW = () => [t('T2'), t('T3'), t('T4'), t('T5'), t('T6'), t('T7'), t('CN')];
  const prizeName = p => {
    const [k, id] = p.split(':');
    return k === 'f' ? t('Khung {name}', { name: { teal: 'Teal', ice: t('Băng'), fire: t('Lửa'), gold: t('Vàng'), night: t('Đêm'), rainbow: t('Cầu vồng'), leaf: t('Lá thu'), snow: t('Tuyết'), bloom: t('Hoa xuân') }[id] || id }) : (STICKERS[id] || '') + ' ' + t('Nhãn dán');
  };
  const prizeArt = p => { const [k, id] = p.split(':'); return k === 'f' ? `<span class="ret-frame" style="background:${FRAMES[id]}"><span>${esc((state.user && (state.user.displayName || '')[0]) || 'L')}</span></span>` : `<span class="ret-stk" data-noicon>${STICKERS[id] || '⭐'}</span>`; };

  const CSS = `.ret-week{display:flex;align-items:center;gap:.7rem;padding:.75rem .9rem;margin:.8rem 0;text-decoration:none;color:var(--text)}
.ret-days{display:grid;grid-template-columns:repeat(7,1fr);gap:.25rem;flex:1;min-width:0}
.ret-d{display:flex;flex-direction:column;align-items:center;gap:.15rem;font-size:.7rem;color:var(--muted)}
.ret-d i{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;font-style:normal;font-size:1rem;background:var(--surface-2);border:2px solid transparent}
.ret-d.done i{background:rgba(249,115,22,.16)}.ret-d.frozen i{background:rgba(56,189,248,.18)}.ret-d.today i{border-color:var(--primary)}.ret-d.miss i{opacity:.55}
.ret-big{font-size:2.6rem;font-weight:800;line-height:1}.ret-bar{height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden}.ret-bar i{display:block;height:100%;background:linear-gradient(90deg,#f59e0b,#f97316)}
.ret-teach{border-radius:50%;object-fit:cover;flex:none;background:var(--surface-2)}
.ret-cel{text-align:center;padding:.4rem 0}.ret-cel .ret-teach{box-shadow:0 0 0 4px rgba(249,115,22,.35);animation:retPop .5s ease-out}
.ret-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:.6rem}
.ret-item{display:flex;flex-direction:column;align-items:center;gap:.3rem;padding:.6rem .3rem;border:1px solid var(--line);border-radius:14px;background:none;color:var(--text);font:inherit;font-size:.78rem;min-height:44px;cursor:pointer}
.ret-item[disabled]{opacity:.4;cursor:default}.ret-item.on{border-color:var(--primary);box-shadow:0 0 0 2px var(--primary-soft,transparent)}
.ret-frame{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;padding:3px}.ret-frame span{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:var(--surface);font-weight:800}
.ret-stk{font-size:1.8rem;line-height:44px}
.ret-pieces{display:flex;gap:.35rem;font-size:1.5rem}.ret-pieces span.off{filter:grayscale(1);opacity:.3}
.ret-ice{position:relative;display:inline-grid;place-items:center;width:132px;height:132px;border:0;border-radius:28px;background:linear-gradient(160deg,#e0f2fe,#7dd3fc);font-size:3.2rem;cursor:pointer;box-shadow:inset 0 0 18px #fff;transition:transform .12s}
.ret-ice:active{transform:scale(.94)}.ret-ice.c1{filter:saturate(.8)}.ret-ice.c2{filter:saturate(.55) brightness(1.05)}.ret-ice.c3{background:linear-gradient(160deg,#fed7aa,#fb923c);box-shadow:none}
.ret-chest{font-size:3.6rem;display:inline-block}.ret-chest.open{animation:retPop .45s ease-out}
.ret-h{margin:.6rem 0 .1rem;font-size:1.9rem;font-weight:800}.ret-say{margin:.2rem auto .8rem;font-size:1.05rem;font-weight:600;max-width:320px}
.ret-row{display:flex;gap:.7rem;justify-content:center;align-items:center;flex-wrap:wrap;margin:.4rem 0 1rem}
.ret-chip{display:inline-flex;align-items:center;padding:.5rem .8rem;border-radius:16px;background:rgba(56,189,248,.18);font-size:1.3rem;font-weight:800}
.ret-tile{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.2rem;min-width:132px;max-width:200px;min-height:136px;box-sizing:border-box;padding:.7rem 1rem;text-align:center;border:2px dashed var(--line);border-radius:20px;background:var(--surface-2);color:var(--text);font:inherit;font-weight:700;cursor:pointer}
.ret-tile.open{border-style:solid;border-color:var(--primary);animation:retPop .45s ease-out;cursor:default}
.ret-next{min-height:52px;font-size:1.1rem;max-width:360px;margin:0 auto}
body[data-ret-frame] .avatar{box-sizing:border-box;padding:2px;background:var(--ret-frame)}
@keyframes retPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
@media (prefers-reduced-motion: reduce){.ret-cel .ret-teach,.ret-chest.open,.ret-tile.open{animation:none}.ret-ice{transition:none}}`;
  function css() { if (document.getElementById('retCss')) return; const s = document.createElement('style'); s.id = 'retCss'; s.textContent = CSS; document.head.appendChild(s); }
  function applyFrame() {
    const f = ret().frame, b = document.body; if (!b) return;
    if (f && FRAMES[f]) { b.setAttribute('data-ret-frame', f); b.style.setProperty('--ret-frame', FRAMES[f]); } else { b.removeAttribute('data-ret-frame'); b.style.removeProperty('--ret-frame'); }
  }
  const canShow = () => !document.querySelector('.modal-wrap:not([hidden]), #modal:not([hidden]) .modal, #rewardModal, .reward-modal, #reviewDone') && !document.body.classList.contains('focus');

  // ---------- Lịch tuần (trang chủ + trang chuỗi) ----------
  function weekHtml() {
    const w = Core.week(days(), (state.game || {}).frozen, Date.now()), L = DOW();
    const ic = { done: '🔥', frozen: '🧊', today: '·', future: '', miss: '·' };
    const lab = { done: t('Đã học'), frozen: t('Đóng băng giữ chuỗi'), today: t('Hôm nay'), future: '', miss: t('Chưa học') };
    return `<div class="ret-days" role="list" data-noicon>${w.map(x => `<span class="ret-d ${x.st}" role="listitem" aria-label="${esc(L[x.dow] + (lab[x.st] ? ': ' + lab[x.st] : ''))}"><i aria-hidden="true">${ic[x.st]}</i>${esc(L[x.dow])}</span>`).join('')}</div>`;
  }
  Ret.home = () => {
    css(); applyFrame();
    if (g.StreakUI) g.StreakUI.checkSavedNotice(state.game); // cờ đã xem dùng chung → không hiện 2 lần
    const v = view(); if (!v || v.querySelector('.ret-week')) return;
    const anchor = v.querySelector('#todayPlan'); if (!anchor) return;
    const n = streakN();
    anchor.insertAdjacentHTML('afterend', `<a class="card hover ret-week" href="#/streak" data-noicon aria-label="${esc(t('Chuỗi {n} ngày', { n }))}"><div class="center" style="min-width:52px"><div style="font-size:1.4rem;font-weight:800">🔥${n}</div></div>${weekHtml()}<span class="chev" aria-hidden="true">›</span></a>`);
    check();
  };

  // ---------- Kiểu trò chơi (chủ 27/10): ít chữ, hình to, giáo viên phản ứng, âm thanh + rung, mỗi màn đúng 1 nút lớn "Bài tiếp theo" ----------
  // Đích = cùng "bước kế tiếp" với lộ trình: App.nextNode() (bài học trộn #155, nếu có) → bước chưa xong đầu tiên của kế hoạch hôm nay → ôn tập
  const nextHref = async () => {
    try { const n = App.nextNode && await App.nextNode(); if (n && n.href) return n.href; } catch (e) { /* bỏ qua */ }
    try { const ts = App.todayPlan ? await App.todayPlan() : []; const n = (ts || []).find(x => !x.done); if (n && n.href) return n.href; } catch (e) { /* bỏ qua */ }
    return '#/review';
  };
  const buzz = p => { try { if (navigator.vibrate && !reduce()) navigator.vibrate(p); } catch (e) { /* bỏ qua */ } };
  const nextBtn = () => `<button class="btn primary lg block ret-next" id="retNext">${t('Bài tiếp theo')} →</button>`;
  const bindNext = box => { const b = box && box.querySelector && box.querySelector('#retNext'); if (b) b.onclick = async () => { const h = await nextHref(); UI.closeModal(); location.hash = h; }; };
  // Ô rương to, chạm để mở ngay trong màn (không màn phụ); khung mới tự đeo (đổi lại ở Bộ sưu tập)
  const chestTile = () => (Core.chests(ret()) > 0 ? `<button type="button" class="ret-tile" id="retChestTile" data-noicon aria-label="${esc(t('Mở rương'))}"><span class="ret-chest" aria-hidden="true">🎁</span><span>${t('Chạm để mở')}</span></button>` : '');
  async function reveal(box) {
    const tile = box.querySelector('#retChestTile'); if (!tile || Core.chests(ret()) <= 0) return;
    const p = Core.nextPrize(ret());
    await mutate(r => { r.opened = (+r.opened || 0) + 1; if (p) { r.own = r.own || {}; r.own[p] = Date.now(); if (p[0] === 'f') { r.frame = p.slice(2); r.frameAt = Date.now(); } } });
    applyFrame(); buzz([20, 30, 50]); if (g.Sfx && g.Sfx.shimmer) g.Sfx.shimmer(); else if (g.Sfx && g.Sfx.win) g.Sfx.win();
    tile.outerHTML = `<div class="ret-tile open" role="status" data-noicon>${p ? prizeArt(p) : '<span class="ret-stk">🏆</span>'}<span>${esc(p ? prizeName(p) : t('Bạn đã sưu tầm đủ mọi món!'))}</span></div>`;
    adOffer(box);
  }
  const bindChest = box => { const c = box && box.querySelector && box.querySelector('#retChestTile'); if (c) c.onclick = () => reveal(box); };

  // ---------- Mốc chuỗi: màn chúc mừng ----------
  async function celebrate(m) {
    await mutate(r => { r.ms = r.ms || {}; Core.MILESTONES.filter(x => x <= m).forEach(x => { if (!r.ms[x]) r.ms[x] = Date.now(); }); });
    const who = teacherFor(m), fz = state.game.freezeAt === m ? `<span class="ret-chip" data-noicon>🧊 +1</span>` : '';
    const box = UI.modal(`<div class="ret-cel">${teachImg(who, 128)}
      <h2 class="ret-h">${t('{n} ngày! 🔥', { n: m })}</h2>
      <p class="ret-say">${esc(who === 'ama' ? t('Ama: Mỗi ngày một chút!') : t('Carlos: Thói quen tuyệt vời!'))}</p>
      <div class="ret-row">${fz}${chestTile()}</div>${nextBtn()}<div id="retAd"></div></div>`);
    if (g.Sfx && g.Sfx.streak) g.Sfx.streak(); else if (g.Sfx && g.Sfx.win) g.Sfx.win();
    buzz([30, 40, 70]); if (!reduce() && typeof g.confetti === 'function') g.confetti(120);
    bindChest(box); bindNext(box);
  }

  // ---------- Rương (từ trang #/streak) ----------
  async function openChest() {
    if (Core.chests(ret()) <= 0) return;
    const box = UI.modal(`<div class="ret-cel"><h2 class="ret-h">${t('Bạn nhận 1 rương quà')}</h2><div class="ret-row">${chestTile()}</div>${nextBtn()}<div id="retAd"></div></div>`);
    bindChest(box); bindNext(box); reveal(box);
  }
  // Quảng cáo có thưởng – CHỈ thêm mỹ phẩm, chỉ khi người học tự bấm (liên kết nhỏ, không phải nút chính), không bao giờ chặn/che việc học (ads/policy REWARDS.cosmetic, 1 lần/ngày)
  async function adOffer(box) {
    const slot = box && box.querySelector && box.querySelector('#retAd'); if (!slot || !g.Ads || !Core.nextPrize(ret())) return;
    const can = await g.Ads.rewarded('cosmetic', 1).catch(() => false); if (!can) return;
    slot.innerHTML = `<button class="btn ghost sm" id="retAdGo" style="min-height:44px;margin-top:.4rem" title="${esc(t('Tùy chọn: xem 1 video ngắn để nhận thêm 1 món trang trí. Không ảnh hưởng việc học.'))}">▶ ${t('Xem video nhận thêm quà')}</button>`;
    slot.querySelector('#retAdGo').onclick = async () => {
      const ok = await g.Ads.rewarded('cosmetic').catch(() => false); if (!ok) return;
      const p = Core.nextPrize(ret()); if (!p) return;
      await mutate(r => { r.own = r.own || {}; r.own[p] = Date.now(); });
      slot.innerHTML = `<p class="ret-say" data-noicon>🎁 ${esc(prizeName(p))}</p>`;
    };
  }
  async function wear(id) { await mutate(r => { r.frame = id; r.frameAt = Date.now(); }); applyFrame(); if (location.hash.startsWith('#/streak')) page(); }

  // ---------- Nghi thức rã băng (thay màn "đã cứu chuỗi" của streak-ui.js khi cờ bật) ----------
  Ret.thaw = () => {
    css();
    const n = streakN(), who = new Date().getDate() % 2 ? 'ama' : 'carlos';
    const box = UI.modal(`<div class="ret-cel"><p class="ret-say" data-noicon>${t('Đã giữ chuỗi cho bạn 🧊')}</p>
      <button type="button" class="ret-ice" id="retIce" data-noicon aria-label="${esc(t('Chạm 3 lần để rã băng'))}">🧊</button>
      <h2 class="ret-h" id="retThawH">${t('Chạm 3 lần!')}</h2>
      <div id="retThawDone" hidden><div class="ret-row">${teachImg(who, 64)}<p class="ret-say" style="margin:0">${esc(t('Chuỗi {n} ngày vẫn cháy!', { n }))}</p></div>${nextBtn()}</div></div>`);
    let taps = 0; const ice = box.querySelector('#retIce');
    ice.onclick = () => {
      taps = Math.min(3, taps + 1); ice.className = 'ret-ice c' + taps;
      if (g.Sfx && g.Sfx.tap) g.Sfx.tap(); buzz(12 + taps * 8);
      if (taps < 3) return;
      ice.textContent = '🔥'; ice.setAttribute('aria-label', t('Chuỗi {n} ngày', { n }));
      box.querySelector('#retThawH').textContent = t('Đã rã băng!'); box.querySelector('#retThawDone').hidden = false;
      if (g.Sfx && g.Sfx.streak) g.Sfx.streak(); buzz([30, 40, 70]); if (!reduce() && typeof g.confetti === 'function') g.confetti(80);
      bindNext(box);
    };
    return box;
  };

  // ---------- Kiểm tra sau mỗi buổi học / mở trang chủ ----------
  let busy = false;
  async function check() {
    if (busy || !state.game || !on()) return; busy = true;
    try {
      const d = days(), k = today(), ev = Core.event(k);
      if (ev && d.has(k) && !(state.game.frozen || {})[k]) {
        const have = ((ret().ev || {})[ev.id] || []);
        if (!have.includes(k) && have.length < ev.need) {
          const r = await mutate(r => { r.ev = r.ev || {}; r.ev[ev.id] = [...(r.ev[ev.id] || []), k].sort(); if (r.ev[ev.id].length >= ev.need && !(r.evDone || {})[ev.id]) { r.evDone = { ...(r.evDone || {}), [ev.id]: Date.now() }; r.own = { ...(r.own || {}), ['f:' + ev.frame]: Date.now() }; } });
          const got = r.ev[ev.id].length;
          if (location.hash.startsWith('#/streak')) setTimeout(() => page(null, null, true), 0); // đang ở trang chuỗi → vẽ lại để mảnh vừa nhận sáng lên ngay (không gọi lại check → không chúc mừng 2 lần)
          UI.toast(got >= ev.need ? `${ev.icon} ${t('Hoàn thành sự kiện! Bạn nhận khung mới và 1 rương quà.')}` : `${ev.icon} ${t('Nhận 1 mảnh sự kiện ({a}/{b})', { a: got, b: ev.need })}`, 3500);
        }
      }
      const m = Core.pending(ret(), Core.streak(d));
      if (m) { const go = (n = 20) => (canShow() ? celebrate(m) : n > 0 && setTimeout(() => go(n - 1), 1500)); setTimeout(() => go(), 900); }
    } catch (e) { /* bỏ qua – không bao giờ chặn việc học */ } finally { busy = false; }
  }
  Ret.check = check;

  // ---------- Dữ liệu widget (native.js đọc khi có g.Ret): giáo viên + ngày học gần nhất → widget tự đổi biểu cảm khi qua ngày ----------
  Ret.widget = st => { const d = Core.activeDays(st || state), k = [...d].sort().pop() || ''; return { who: new Date().getDate() % 2 ? 'ama' : 'carlos', sd: k, ok: t('Hôm nay đã học'), risk: t('Giữ chuỗi hôm nay nhé!') }; };

  // ---------- Trang #/streak ----------
  function page(arg, query, noCheck) { // router gọi (arg, query) → cờ vẽ-lại-không-check là tham số thứ 3
    css(); applyFrame();
    const n = streakN(), nx = Core.next(n), r = ret(), fi = g.Core && g.Core.Stats ? g.Core.Stats.freezeInfo(state.game) : { left: +state.game.freezes || 0, max: 2 };
    const ev = Core.event(today()), got = ev ? ((r.ev || {})[ev.id] || []).length : 0, ch = Core.chests(r), own = r.own || {};
    const items = ['f:teal', ...Object.keys(FRAMES).filter(f => f !== 'teal').map(f => 'f:' + f), ...Object.keys(STICKERS).map(s => 's:' + s)];
    view().innerHTML = `<div class="page-narrow" style="max-width:640px;margin:0 auto">
      <section class="card" style="display:flex;gap:1rem;align-items:center">${teachImg(n % 2 ? 'carlos' : 'ama', 72)}<div class="grow"><div class="ret-big">🔥 ${n}</div><div class="muted">${t('ngày liên tiếp')}</div></div>${g.StreakUI ? g.StreakUI.badgeHtml(state.game) : `<span>🧊×${fi.left}</span>`}</section>
      <section class="card" style="margin-top:.8rem"><h2 class="small" style="margin:0 0 .6rem">${t('Tuần này')}</h2>${weekHtml()}
        <div style="margin-top:1rem" class="small"><div class="row between"><span>${t('Mốc tiếp theo: {n} ngày', { n: nx })}</span><span class="muted">${n}/${nx}</span></div><div class="ret-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${nx}" aria-valuenow="${n}"><i style="width:${Math.min(100, Math.round(n / nx * 100))}%"></i></div>
        <p class="small" style="margin:.5rem 0 0;font-weight:600" data-noicon>${t('Mỗi mốc 🎁 · 7 ngày 🧊 · miễn phí')}</p></div></section>
      ${ev ? `<section class="card" style="margin-top:.8rem"><h2 class="small" style="margin:0 0 .4rem">${ev.icon} ${t('Gom {n} mảnh', { n: ev.need })}</h2><p class="small" style="margin:0 0 .5rem;font-weight:600">${t('Học 1 ngày = 1 mảnh')}</p>
        <div class="ret-pieces" data-noicon aria-label="${esc(t('Nhận 1 mảnh sự kiện ({a}/{b})', { a: got, b: ev.need }))}">${Array.from({ length: ev.need }, (_, i) => `<span class="${i < got ? '' : 'off'}" aria-hidden="true">${ev.icon}</span>`).join('')}</div></section>` : ''}
      <section class="card" style="margin-top:.8rem;text-align:center"><div class="ret-chest" aria-hidden="true" data-noicon>🎁</div><p style="margin:.3rem 0 .6rem">${ch ? t('Bạn có {n} rương chưa mở', { n: ch }) : t('Mốc tiếp theo: {n} ngày', { n: nx })}</p>${ch ? `<button class="btn primary" id="retChest" style="min-height:44px">${t('Mở rương')}</button>` : ''}</section>
      <section class="card" style="margin-top:.8rem"><h2 class="small" style="margin:0 0 .6rem">${t('Bộ sưu tập')}</h2><div class="ret-grid">${items.map(p => { const has = p === 'f:teal' || own[p], on = p[0] === 'f' && (r.frame || 'teal') === p.slice(2);
        return `<button type="button" data-noicon class="ret-item${on ? ' on' : ''}" data-ret-item="${esc(p)}" ${has && p[0] === 'f' ? '' : 'disabled'} aria-pressed="${on}">${prizeArt(p)}<span>${has ? esc(prizeName(p)) : '🔒'}</span></button>`; }).join('')}</div></section>
    </div>`;
    const c = document.getElementById('retChest'); if (c) c.onclick = openChest;
    view().querySelectorAll('[data-ret-item]').forEach(b => { b.onclick = () => wear(b.dataset.retItem === 'f:teal' ? '' : b.dataset.retItem.slice(2)); });
    if (!noCheck) check();
  }
  App.routes.streak = page;

  // ---------- Khởi động ----------
  if (on()) { css(); applyFrame(); }
  if (on() && g.StreakUI && !g.StreakUI._retWrapped) { g.StreakUI.showSavedModal = () => Ret.thaw(); g.StreakUI._retWrapped = 1; } // màn "đã cứu chuỗi" → nghi thức rã băng (cùng cờ đã xem streak_saved_seen)
  g.addEventListener('lexkite:practice-done', () => setTimeout(check, 1200));
  const toPage = e => { if (on() && e.target && e.target.closest && e.target.closest('#streakPill') && (e.type === 'click' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); location.hash = '#/streak'; } };
  document.addEventListener('click', toPage); document.addEventListener('keydown', toPage);
  const pill = document.getElementById('streakPill'); if (pill && on()) { pill.style.cursor = 'pointer'; pill.setAttribute('role', 'link'); pill.tabIndex = 0; }
})(typeof self !== 'undefined' ? self : this);
