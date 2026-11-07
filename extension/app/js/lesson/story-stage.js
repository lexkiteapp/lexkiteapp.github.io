/* 🎭 StoryStage – sân khấu màn Truyện (docs/specs/story-stage.md). Tải LƯỜI từ lesson/ui.js duoMount (App.loadScript) cùng css/story-stage.css; không nằm trong khung app.
 * Việc: người nói sáng/người kia mờ, dừng vòng vẽ của người không nói + khi ngoài màn/tab ẩn (teacher.park), mỗi dòng: 🔊 + 🐢 cùng chỗ cho cả hai người,
 * hiện nhẹ (transform/opacity), cuộn mượt, chạm sân khấu = bỏ qua lời / sang câu kế, chạm từ = tra (Dict.quick – cùng cách Nghe/Phrases). Chữ giao diện: chỉ khóa đã có (Nghe chậm, Nghe lại…). */
(function (g) {
  const D = document, T = (s, v) => (g.t ? g.t(s, v) : s), reduced = () => { try { return g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const FLIP = { ama: false, carlos: false };
  const WORD = /[A-Za-z][A-Za-z'’-]*/g;
  const EMO = [[/\b(sorry|late|lost|missed|problem|delay|cancel|wrong|unfortunately|worried)\b/i, 'concern'], [/!/, 'cheer'], [/\?/, 'thinking'], [/\b(please|thank|welcome|great|good|nice)\b/i, 'happy']];
  const emoOf = s => { for (const [re, e] of EMO) if (re.test(s)) return e; return 'happy'; };

  function attach(root, ctx) {
    const stage = root.querySelector('.ss-stage'), chat = root.querySelector('#lsnChat'); if (!stage || !chat) return null;
    root.classList.add('ss'); let cur = '', owner = '', dead = false, pop = null, seen = true;
    const seats = { ama: stage.querySelector('[data-who="ama"]'), carlos: stage.querySelector('[data-who="carlos"]') };
    if (FLIP.ama) seats.ama.style.transform += ' scaleX(-1)'; if (FLIP.carlos) seats.carlos.style.transform += ' scaleX(-1)';
    const tch = () => ctx.teachers() || {};
    const park = (who, on) => { const v = (ctx.vids() || {})[who] || []; try { if (on) v.forEach(x => { if (!x.paused) x.pause(); }); else if (v[0] && v[0].paused && v[0].readyState > 1) v[0].play().catch(() => {}); } catch (e) { /* bỏ qua */ } };
    const sync = () => { ['ama', 'carlos'].forEach(k => { const on = cur ? cur === k : (!owner || owner === k); /* đang nói: chỉ người nói chạy; im: chỉ chủ dòng chạy vòng nghe */ seats[k].classList.toggle('on', cur === k); park(k, !seen || D.hidden || !on); }); };
    let io = null; if (g.IntersectionObserver) { io = new IntersectionObserver(es => { seen = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.01 }); io.observe(stage); }
    const vis = () => sync(); D.addEventListener('visibilitychange', vis);
    const scrollTo = (n, go) => { const smooth = reduced() ? 'auto' : 'smooth'; try { (go || n).scrollIntoView({ block: 'nearest', behavior: smooth }); } catch (e) { n.scrollIntoView(); } /* MỘT lần cuộn tới nút Tiếp tục (dòng mới nằm ngay trên nút): hai lần cuộn mượt nối nhau lặp lại hoạt cảnh → tụt khung hình */ };
    let talking = false;
    stage.addEventListener('click', () => { const go = D.getElementById('lsnGo'); if (talking) { ['ama', 'carlos'].forEach(k => { const x = tch()[k]; if (x) x.stop(); }); talking = false; speaker(''); } else if (go && !go.disabled && go.offsetParent) go.click(); });
    function speaker(who) { cur = who || ''; stage.dataset.speaker = cur; talking = !!cur; root.querySelectorAll('.lsn-ln').forEach(n => n.classList.toggle('ss-cur', !!cur && n === chat.lastElementChild && n.dataset.who === cur)); sync(); }
    function line(n, it) {
      const play = n.querySelector('button'); if (!play || n.dataset.ssDone) return; n.dataset.ssDone = '1'; owner = it.who === 'carlos' ? 'carlos' : 'ama'; sync();
      let act = n.querySelector('.ss-act'), slow = n.querySelector('.ss-slow'); const bub = play.closest('.ss-col') ? play.closest('.ss-col').parentNode : play.parentNode;
      if (!act || !slow) { act = D.createElement('div'); act.className = 'ss-act'; slow = D.createElement('button'); slow.type = 'button'; slow.className = 'ss-slow'; slow.innerHTML = '<span aria-hidden="true">🐢</span>'; const p = bub.querySelector('p'), col = D.createElement('div'); col.className = 'ss-col'; if (p) { bub.insertBefore(col, p); col.appendChild(p); } else bub.appendChild(col); col.appendChild(act); act.appendChild(play); act.appendChild(slow); play.classList.remove('order-last', 'order-first'); }
      slow.setAttribute('data-noicon', ''); if (slow.querySelector('svg')) slow.innerHTML = '<span aria-hidden="true">🐢</span>';
      slow.setAttribute('aria-label', T('Nghe chậm') + ' · ' + (it.who === 'carlos' ? 'Carlos' : 'Ama')); slow.onclick = ev => { ev.stopPropagation(); ctx.say(it.sent, true, it.who); };
      if (!reduced()) { n.classList.add('ss-in'); n.addEventListener('animationend', () => n.classList.remove('ss-in'), { once: true }); }
      const x = tch()[it.who]; if (x && x.react) x.react(emoOf(it.sent), 2200);
    }
    const wordAt = ev => {
      const pt = ev.changedTouches ? ev.changedTouches[0] : ev; let node = null, off = 0;
      if (D.caretPositionFromPoint) { const c = D.caretPositionFromPoint(pt.clientX, pt.clientY); if (c) { node = c.offsetNode; off = c.offset; } } else if (D.caretRangeFromPoint) { const r = D.caretRangeFromPoint(pt.clientX, pt.clientY); if (r) { node = r.startContainer; off = r.startOffset; } }
      if (!node || node.nodeType !== 3) return ''; const s = node.nodeValue; let m; WORD.lastIndex = 0; while ((m = WORD.exec(s))) if (off >= m.index && off <= m.index + m[0].length) return m[0].replace(/['’-]+$/, '');
      return '';
    };
    const close = () => { if (pop) { pop.remove(); pop = null; } };
    chat.addEventListener('click', async ev => {
      const p = ev.target.closest && ev.target.closest('.lsn-ln p'); if (!p || !g.Dict) return; const w = wordAt(ev); if (!w || w.length < 2) return; close();
      const mine = pop = D.createElement('div'); mine.className = 'ss-pop'; mine.setAttribute('role', 'dialog'); mine.lang = 'en'; mine.innerHTML = `<div class="ss-pw"><b></b><button type="button" aria-label="${T('Đóng')}">✕</button></div><div class="ss-pm"></div>`;
      mine.querySelector('b').textContent = w; mine.querySelector('.ss-pm').textContent = T('Đang tra “{w}”…', { w }); mine.querySelector('button').onclick = close; D.body.appendChild(mine);
      let d = null; try { d = (await g.Dict.quick(w)) || (await g.Dict.lookup(w, { examples: false, image: false })); } catch (e) { d = null; } if (pop !== mine) return;
      const m = mine.querySelector('.ss-pm'); if (!d || !d.found) { m.textContent = T('Không tìm thấy “{w}”.', { w }); return; }
      m.textContent = (g.App && App.meanOf ? App.meanOf(d) : d.vi) || ''; const b = mine.querySelector('.ss-pw b'); b.textContent = d.word || w;
      const sp = D.createElement('button'); sp.type = 'button'; sp.setAttribute('aria-label', T('Nghe lại')); sp.textContent = '🔊'; sp.onclick = () => { try { UI.speak(d.word, (g.state && state.settings.accent) || 'us', UI.audioFor ? UI.audioFor(d) : undefined); } catch (e) { /* bỏ qua */ } }; mine.querySelector('.ss-pw').insertBefore(sp, mine.querySelector('.ss-pw button:last-child'));
    });
    sync();
    return { line, speaker, scrollTo, close, destroy() { dead = true; close(); if (io) io.disconnect(); D.removeEventListener('visibilitychange', vis); } };
  }
  g.StoryStage = { attach, emoOf };
})(typeof self !== 'undefined' ? self : this);
