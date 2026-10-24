/* journey-e2e – hành trình 1–3 chạy TRONG WebView của app gốc (iOS: harness.js E2E_MODE=journey · Android: journey-e2e/android.mjs qua DevTools).
 * Cùng kịch bản với bản web (scripts/test/journey-e2e.mjs) nhưng chỉ dùng DOM; mỗi pha trả [lỗi]. Tải lại giữa các pha do bộ chạy lo.
 * Cần checks.js (window.LKJC) nạp trước. */
(function (W) {
  'use strict';
  const D = document, sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = s => { const e = typeof s === 'string' ? D.querySelector(s) : s; return !!(e && W.LKJC && LKJC.vis(e)); };
  const wait = async (s, ms = 10000) => { const end = Date.now() + ms; while (Date.now() < end) { if (vis(s)) return true; await sleep(200); } return false; };
  const click = async (s, ms = 400) => { if (!(await wait(s, 8000))) throw new Error('không thấy ' + s); const e = D.querySelector(s); e.scrollIntoView({ block: 'center' }); e.click(); await sleep(ms); };
  const go = async h => { location.hash = h; await sleep(1100); };
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const askOn = () => vis('#modal:not([hidden]) #raY');
  async function learn() { for (let i = 0; i < 14 && !vis('.study-wrap .celebrate'); i++) { if (vis('#known')) await click('#known', 450); else if (vis('#gotIt')) await click('#gotIt', 450); else await sleep(600); } return wait('.study-wrap .celebrate', 6000); }
  function mk(tag) { const bad = []; return { bad, ok: (c, m) => { if (!c) bad.push('[' + tag + '] ' + m); return !!c; }, audit: s => { for (const b of LKJC.audit(s)) bad.push('[' + tag + '] ' + b.t + ': ' + b.msg); } }; }
  async function reset() { // hồ sơ mới cho hành trình 1 (giữ trạng thái bộ chạy __e2e + ngôn ngữ)
    const keep = {}; for (const k of ['__e2e', 'vb.uiLang', '__lkj']) if (ls(k) != null) keep[k] = ls(k);
    try { localStorage.clear(); for (const [k, v] of Object.entries(keep)) localStorage.setItem(k, v); localStorage.setItem('lk.e2e', '1'); } catch (e) { /* */ }
    await new Promise(r => { try { const q = indexedDB.deleteDatabase('lexkite'); q.onsuccess = q.onerror = q.onblocked = () => r(); } catch (e) { r(); } setTimeout(r, 3000); });
  }
  const DAY = 864e5;
  const P = {
    reset,
    async j1a() { const t = mk('j1'); t.ok(!askOn(), 'không hỏi nhắc lúc mở app'); await go('#/welcome/setup');
      if (vis('#noAcct')) await click('#noAcct'); await click('button.trk-opt'); await click('[data-lv="test"]'); await click('#go', 1500);
      t.ok(/placement/.test(location.hash), '→ #/placement'); await click('#go', 600);
      for (let i = 0; i < 26 && !vis('.pl-result'); i++) { const o = D.querySelectorAll('.pl-wrap .option[data-k]:not([data-k="-1"])'); if (o.length) o[i % 2 ? 1 : 0].click(); await sleep(520); }
      t.ok(await wait('.pl-result', 8000), 'kiểm tra đầu vào xong'); t.ok(!askOn(), 'không hỏi sau kiểm tra đầu vào');
      await go('#/day/1'); await click('ol.day-steps a[data-step="learn"]', 1200); t.ok(await learn(), 'xong bài đầu');
      const asked = await wait('#modal:not([hidden]) #raY', 6000); t.ok(asked, 'hỏi nhắc học sau bài đầu'); t.audit('soft-ask');
      if (asked) { await click('#raN', 500); t.ok(D.getElementById('modal').hidden, '"Để sau" đóng hộp'); t.ok(+ls('lk.reask') > 0, 'ghi lk.reask'); }
      return t.bad; },
    async j1b() { const t = mk('j1'); t.ok(!/welcome/.test(location.hash), 'tải lại: không về màn chào'); await go('#/day/1'); await click('ol.day-steps a[data-step="learn"]', 1000); await learn(); await sleep(3500); t.ok(!askOn(), 'sau tải lại: không hỏi lại'); t.audit('j1b'); return t.bad; },
    async j2s() { const t = mk('j2'); await go('#/welcome/setup'); if (vis('#noAcct')) await click('#noAcct'); await click('button.trk-opt'); await click('.trk-lv [data-lv]:not([data-lv="test"])'); await click('#go', 1500); t.ok(/#\/day/.test(location.hash), 'thiết lập → #/day'); return t.bad; },
    async j2a() { const t = mk('j2'); await go('#/home'); t.ok(!/welcome/.test(location.hash), 'quay lại: vào thẳng trang chủ'); t.audit('home'); await go('#/day/1');
      const gl = D.querySelector('ol.day-steps a[data-step="gl"]'), pr = D.querySelector('ol.day-steps a[data-step="pr"]'); t.ok(gl, 'có bước ngữ pháp'); t.ok(pr, 'có bước phát âm');
      if (gl) { await click('ol.day-steps a[data-step="gl"]', 1200); if (!/view=full/.test(location.hash)) await go(location.hash.split('?')[0] + '?view=full'); for (const it of D.querySelectorAll('#gQuiz .q-item')) { const b = it.querySelector('.opts button'); b && b.click(); await sleep(250); } await go('#/day/1'); t.ok(D.querySelector('ol.day-steps a[data-step="gl"].ok'), 'ngữ pháp xong'); }
      if (pr) { await click('ol.day-steps a[data-step="pr"]', 1200); await wait('#view .q-item, #startPairs', 8000);
        if (!D.querySelector('#view .q-item') && vis('#startPairs')) { await click('#startPairs', 900); for (let r = 0; r < 10 && !vis('#startPairs2'); r++) { const o = D.querySelector('#pairGame .option'); o && o.click(); await sleep(1100); } }
        for (const it of D.querySelectorAll('.q-item')) { const b = it.querySelector('.opts button'); b && b.click(); await sleep(250); } await go('#/day/1'); t.ok(D.querySelector('ol.day-steps a[data-step="pr"].ok'), 'phát âm xong'); }
      await click('ol.day-steps a[data-step="learn"]', 1000); t.ok(await learn(), 'xong Học từ mới'); t.ok(await wait('.celebrate .path-reward', 6000), 'màn Tiếp theo'); await sleep(2500); t.audit('whats-next');
      await go('#/confidence/salary'); await click('#cfGo', 700); for (let i = 0; i < 8 && !vis('#cfRp'); i++) { if (vis('#cfSkip')) await click('#cfSkip', 500); else if (vis('#cfNext')) await click('#cfNext', 500); else await sleep(500); }
      if (t.ok(vis('#cfRp'), 'tới bước nhập vai')) { await click('#cfRp', 1500); t.ok(/\bB2\b/.test(D.getElementById('view').innerText), 'nhập vai B2'); }
      await go('#/roleplay/salary'); const lv = D.querySelector('.rp-seg button[aria-pressed="true"]'); t.ok(lv && /B2/.test(lv.innerText), 'mức B2 chọn sẵn'); t.audit('roleplay'); return t.bad; },
    async j2b() { const t = mk('j2'); await go('#/day/1'); t.ok(D.querySelectorAll('ol.day-steps a.ok').length >= 1, 'tải lại: tiến độ còn'); return t.bad; },
    async j3a() { const t = mk('j3'), now = Date.now(), S = { ef: 2.5, interval: 3, reps: 3, lapses: 0, due: now - DAY, last: now - 4 * DAY, step: 0, S: 3, D: 4 };
      const words = [['resilience', 'khả năng phục hồi'], ['sustainable', 'bền vững'], ['negotiate', 'đàm phán'], ['budget', 'ngân sách'], ['deadline', 'hạn chót']];
      for (const [w] of words) await Core.Cards.remove(w).catch(() => {});
      for (const [w, vi] of words) { await Core.Cards.add({ word: w, vi, pos: 'noun' }, w === 'resilience' ? { text: 'Dense canopies improve the resilience of neighbourhoods during heatwaves.', source: 'https://www.bbc.com/', title: 'Forests' } : undefined).catch(() => {}); await Core.Cards.patch(w, c => { c.srs = { ...S }; }).catch(() => {}); }
      App.state.cards = await Core.Cards.all(); await go('#/review'); await sleep(800);
      const modes = ['flip', 'type', 'audio'], seen = new Set(); let own = false;
      for (let i = 0; i < 12 && !vis('.rev-done'); i++) { const sel = D.getElementById('rmSel'); if (sel) { sel.value = modes[i % 3]; sel.dispatchEvent(new Event('change', { bubbles: true })); await sleep(500); }
        if (vis('figure.rctx.own')) own = true;
        if (vis('#typeIn')) { seen.add('type'); const x = D.getElementById('typeIn'); x.value = 'zzz'; x.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); await sleep(600); }
        else if (vis('[data-opt="0"]')) { seen.add('audio'); await click('[data-opt="0"]', 600); } else if (vis('#flipBtn')) { seen.add('flip'); await click('#flipBtn', 400); }
        if (vis('[data-grade].suggest')) await click('[data-grade].suggest', 700); else if (vis('[data-grade="2"]')) await click('[data-grade="2"]', 700); else await sleep(500); t.audit('review'); }
      t.ok(own, 'thẻ "câu của bạn"'); t.ok(seen.size === 3, 'đủ 3 kiểu: ' + [...seen]); t.ok(vis('.rev-done'), 'xong phiên ôn'); return t.bad; },
    async j3b() { const t = mk('j3'), c = await Core.Cards.all(); for (const w of ['resilience', 'sustainable', 'negotiate']) t.ok(c[w] && c[w].srs.due > Date.now(), 'điểm "' + w + '" còn sau tải lại'); t.ok(c.resilience && /canopies/.test(c.resilience.ctx || ''), 'ctx còn'); return t.bad; },
  };
  W.LKJN = P;
})(window);
