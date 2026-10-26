/* 🏫 Lớp học (Teacher / Classroom mode) – tải lười (bundle 'classroom'), API functions/api/class.js. Tài liệu: docs/CLASSROOM.md
 * #/class              trung tâm: tham gia bằng mã · lớp đang học · lớp tôi dạy · tạo lớp
 * #/class/join/<MÃ>    vào lớp từ đường link (chia sẻ qua Google Classroom)
 * #/class/<id>         giáo viên: mời, giao bài, tiến độ từng học sinh · học sinh: danh sách bài được giao
 * Học sinh: module tự nạp khi đăng nhập (sync.js, cờ lk.cls) để ghi tiến độ khi xong bài luyện/đề thi được giao. */
(function () {
  const { $, $$, esc, toast } = UI;
  const App = window.App, { routes } = App, view = App.view;
  const API = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '/api/class' : 'https://lexkite.com/api/class';
  const APP = 'https://lexkite.com/app/';
  const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };
  const lang = () => (window.I18N ? I18N.lang() : 'en');

  async function call(op, extra = {}, signal) {
    if (!window.Sync || !Sync.user) throw Object.assign(new Error('auth'), { code: 'auth' });
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await Sync.user.getIdToken() }, body: JSON.stringify({ op, ...extra }), signal });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw Object.assign(new Error(j.error || 'class'), { code: j.error || (r.status === 429 ? 'too-fast' : 'server') });
    return j;
  }
  const ERR = () => ({
    code: t('Mã lớp gồm 6 chữ và số, ví dụ K7M2QX.'), 'no-class': t('Không tìm thấy lớp với mã này. Hãy hỏi lại giáo viên.'), name: t('Tên chỉ gồm chữ, số và khoảng trắng (tối đa 40 ký tự).'),
    'own-class': t('Đây là lớp do bạn tạo.'), 'class-full': t('Lớp đã đủ 300 học sinh.'), 'max-joined': t('Bạn đã tham gia tối đa 20 lớp.'), 'max-classes': t('Bạn đã tạo tối đa 30 lớp.'),
    'max-tasks': t('Mỗi lớp giao tối đa 200 bài.'), dup: t('Bài này đã được giao cho lớp.'), 'too-fast': t('Thao tác quá nhanh – thử lại sau ít phút.'), quota: t('Thao tác quá nhanh – thử lại sau ít phút.'),
  });
  const fail = e => toast(ERR()[e && e.code] || t('Có lỗi kết nối – thử lại sau.'), 3500);

  // ---------- Danh mục bài có thể giao (nội dung sẵn có) ----------
  const TOPICS = () => (window.IELTS_DATA && IELTS_DATA.TOPICS) || [];
  const topic = id => TOPICS().find(x => x.id === id);
  const NUM = { il: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], ir: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 101, 102, 103, 104, 105], toeic: [1, 2, 3, 4, 5, 6, 7] };
  function info(ref) {
    const [k, v] = ref.split(':'), n = +v;
    if (k === 'topic') { const tp = topic(v); return { em: tp ? tp.emoji : '📚', title: tp ? t(tp.name) : v, sub: tp ? t('{n} từ', { n: tp.words.length }) : t('Bộ từ vựng'), href: '#/topic/' + v, missing: !tp }; }
    if (k === 'il') return { em: '🎧', title: t('IELTS Listening – Đề {n}', { n }), sub: t('4 phần · 40 câu'), href: '#/listen-test/' + n };
    if (k === 'ir') return { em: '📖', title: n > 100 ? t('IELTS Reading General Training – Đề {n}', { n: n - 100 }) : t('IELTS Reading Academic – Đề {n}', { n }), sub: t('3 bài đọc · 60 phút'), href: `#/mock/run?s=reading&r=${n}&l=1` };
    if (k === 'toeic') return { em: '💼', title: t('TOEIC Listening & Reading – Đề {n}', { n }), sub: t('Đề đầy đủ 200 câu'), href: '#/toeic-test/' + n };
    return { em: '📌', title: ref, sub: '', href: '#/class' };
  }
  const needTopics = async refs => { if (refs.some(r => r.startsWith('topic:') && !topic(r.slice(6)))) { try { await App.need('words', 'tsl'); } catch (e) { /* tên thiếu → hiện mã */ } } };

  // ---------- Ghi tiến độ của học sinh ----------
  // Bộ từ: study.js → 'lexkite:practice-done' { src: 'topic:<id>', pct } · Đề thi: qtips.js → 'lexkite:test-done' { sk, r, t } (theo trang đang mở)
  const buf = {};
  function queue(ref, r, n) {
    if (LS.get('lk.cls') !== '1' || !n) return;
    const b = buf[ref] || (buf[ref] = { r: 0, t: 0, h: 0 });
    b.r += r; b.t += n; clearTimeout(b.h);
    b.h = setTimeout(() => { delete buf[ref]; send({ ref, r: b.r, t: b.t }); }, 2500); // TOEIC ghi Listening + Reading liền nhau → gộp 1 lượt
  }
  async function send(p) {
    try { const j = await call('progress', p); if (j.n) toast('🏫 ' + t('Đã gửi kết quả cho giáo viên'), 2600); mineCache = null; } catch (e) {
      if (e.code === 'auth' || e.code === 'ref' || e.code === 'score') return;
      let q = []; try { q = JSON.parse(LS.get('lk.clsq') || '[]'); } catch (x) { /* hỏng → bỏ */ }
      q.push(p); LS.set('lk.clsq', JSON.stringify(q.slice(-20))); // mất mạng → gửi lại lần sau
    }
  }
  async function flush() {
    let q = []; try { q = JSON.parse(LS.get('lk.clsq') || '[]'); } catch (e) { /* bỏ */ }
    LS.set('lk.clsq', null);
    for (const p of q) await send(p);
  }
  window.addEventListener('lexkite:practice-done', e => { const d = e.detail || {}, m = /^topic:([a-z0-9_-]+)$/.exec(d.src || ''); if (m && typeof d.pct === 'number') queue('topic:' + m[1], Math.max(0, Math.min(100, Math.round(d.pct))), 100); });
  window.addEventListener('lexkite:test-done', e => {
    const d = e.detail || {}, h = location.hash; let m;
    if ((m = /^#\/listen-test\/(\d+)/.exec(h)) && d.sk === 'il') queue('il:' + m[1], d.r, d.t);
    else if ((m = /^#\/toeic-test\/(\d+)/.exec(h)) && /^t[lr]$/.test(d.sk)) queue('toeic:' + m[1], d.r, d.t);
    else if (/^#\/mock\/run/.test(h)) { const q = new URLSearchParams(h.split('?')[1] || ''); if (d.sk === 'ir') queue('ir:' + (+q.get('r') || 1), d.r, d.t); else if (d.sk === 'il') queue('il:' + (+q.get('l') || 1), d.r, d.t); }
  });
  // Hoạt động gần nhất: tối đa 1 lần/ngày (tiết kiệm lượt ghi D1; xong bài cũng cập nhật qua progress.updated)
  if (LS.get('lk.cls') === '1' && window.Sync && Sync.user && Date.now() - (+LS.get('lk.clsPing') || 0) > 864e5) { LS.set('lk.clsPing', String(Date.now())); call('ping').then(flush).catch(() => {}); }

  // ---------- Dữ liệu "lớp của tôi" ----------
  let mineCache = null;
  async function mine(force, signal) {
    const uid = Sync.user && Sync.user.uid;
    if (!force && mineCache && mineCache.uid === uid && Date.now() - mineCache.at < 30e3) return mineCache.d; // đổi tài khoản trên cùng máy → tải lại
    const d = await call('mine', {}, signal);
    mineCache = { at: Date.now(), uid, d };
    LS.set('lk.cls', d.learn.length ? '1' : null); // học sinh → nạp module để ghi tiến độ
    LS.set('lk.edu', d.learn.length || d.teach.length ? '1' : null); // tài khoản lớp học: không quảng cáo (ads.js)
    return d;
  }

  // ---------- Tiện ích hiển thị ----------
  const rel = ms => { if (!ms) return '–'; const s = Math.round((ms - Date.now()) / 1000), a = Math.abs(s); const f = new Intl.RelativeTimeFormat(lang(), { numeric: 'auto' }); return a < 3600 ? f.format(Math.round(s / 60), 'minute') : a < 86400 ? f.format(Math.round(s / 3600), 'hour') : f.format(Math.round(s / 86400), 'day'); };
  const day = ms => new Date(ms).toLocaleDateString(lang(), { day: 'numeric', month: 'short' });
  const joinUrl = (code, ref) => `${APP}#/class/join/${code}${ref ? '?task=' + encodeURIComponent(ref) : ''}`;
  const gcUrl = (url, title, body) => `https://classroom.google.com/share?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}${body ? '&body=' + encodeURIComponent(body) : ''}`;
  const gcBtn = (url, title, body, label, cls = '') => `<a class="btn ${cls} cr-gc" href="${esc(gcUrl(url, title, body))}" target="_blank" rel="noopener" data-gc>${GC_IC}${esc(label)}</a>`;
  const GC_IC = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" fill="#0F9D58"/><rect x="4" y="6" width="16" height="12" fill="#57BB8A"/><circle cx="12" cy="10.5" r="1.8" fill="#fff"/><path d="M8.6 15.5c.5-1.6 1.8-2.4 3.4-2.4s2.9.8 3.4 2.4z" fill="#fff"/><rect x="13" y="16.6" width="5" height="1.2" fill="#fff"/></svg>';
  const pctCls = p => p >= 80 ? 'ok' : p >= 50 ? 'mid' : 'no';
  const schoolsUrl = () => `/${['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'].includes(lang()) ? lang() : 'en'}/schools`;
  const site = p => (/^https?:/.test(location.protocol) && /lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com') + p;
  if (!document.getElementById('crCss')) {
    const st = document.createElement('style'); st.id = 'crCss';
    st.textContent = `.cr-code{font:800 2rem/1.1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;color:var(--primary)}
.cr-list{display:grid;gap:.6rem}.cr-item{display:flex;gap:.75rem;align-items:center;justify-content:space-between;flex-wrap:wrap}
.cr-item .em{font-size:1.5rem}.cr-gc{display:inline-flex;gap:.45rem;align-items:center}
.cr-tbl{width:100%;border-collapse:collapse;font-size:.9rem}.cr-tbl th,.cr-tbl td{padding:.5rem .45rem;border-bottom:1px solid var(--line);text-align:start;vertical-align:middle}
.cr-tbl th{font-size:.78rem;color:var(--muted);font-weight:700}.cr-wrap{overflow-x:auto}
.cr-pct{display:inline-block;min-width:3rem;text-align:center;border-radius:999px;padding:.1rem .45rem;font-weight:700;font-size:.82rem;background:var(--surface-2,var(--bg))}
.cr-pct.ok{color:var(--good)}.cr-pct.mid{color:#b7791f}.cr-pct.no{color:var(--again,#e5502f)}
.cr-pick{display:grid;gap:.4rem;max-height:52vh;overflow:auto;margin:.6rem 0}.cr-pick label{display:flex;gap:.6rem;align-items:center;padding:.45rem .55rem;border:1px solid var(--line);border-radius:10px;cursor:pointer}
.cr-pick label:has(input:checked){border-color:var(--primary);background:var(--surface-2,var(--bg))}`;
    document.head.appendChild(st);
  }
  const head = (title, sub, back) => `${back ? `<a href="#/class" class="small">← ${t('Lớp học')}</a>` : ''}<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div></div>`;

  // ---------- Chưa đăng nhập ----------
  function signedOut(extra) {
    view.innerHTML = head(UI.icon('school') + ' ' + t('Lớp học'), t('Giáo viên giao bài, học sinh luyện tập – miễn phí, không quảng cáo.')) + `
      <div class="card" style="text-align:center;padding:2rem 1.2rem">
        ${extra || ''}
        <div class="grid g3" style="max-width:680px;margin:0 auto 1.5rem;text-align:start;gap:.8rem">
          <div class="card"><div style="font-size:1.5rem">👩‍🏫</div><b>${t('Giáo viên')}</b><div class="muted small">${t('Tạo lớp, giao bộ từ và đề luyện, xem tiến độ từng học sinh.')}</div></div>
          <div class="card"><div style="font-size:1.5rem">🧑‍${UI.icon('graduation-cap')}</div><b>${t('Học sinh')}</b><div class="muted small">${t('Nhập mã lớp 6 ký tự, làm bài được giao, kết quả tự gửi cho giáo viên.')}</div></div>
          <div class="card"><div style="font-size:1.5rem">${UI.icon('lock')}</div><b>${t('Riêng tư')}</b><div class="muted small">${t('Giáo viên chỉ thấy tên bạn tự đặt và kết quả bài được giao. Không quảng cáo.')}</div></div>
        </div>
        ${window.Sync && Sync.can === false ? `<p class="muted">${t('Đăng nhập và đồng bộ có trên bản web {link}.', { link: '<a href="https://lexkite.com/app/#/class" target="_blank" rel="noopener">lexkite.com</a>' })}</p>` : `<button type="button" class="btn primary lg" id="crIn">${t('Đăng nhập với Google')}</button>`}
        <p class="tiny muted" style="margin-top:1rem"><a href="${site(schoolsUrl())}" target="_blank" rel="noopener">${t('Hướng dẫn cho nhà trường & quản trị viên')} →</a></p>
      </div>`;
    const b = $('#crIn'); if (b) b.onclick = () => Sync.signIn();
  }

  // ---------- Trung tâm #/class ----------
  async function hub(code, task) {
    const w = App.W;
    if (!window.Sync || !Sync.user) return signedOut(code ? `<p><b>${t('Bạn được mời vào lớp {code}.', { code: `<span translate="no">${esc(code)}</span>` })}</b> ${t('Đăng nhập để tham gia.')}</p>` : '');
    view.innerHTML = head(UI.icon('school') + ' ' + t('Lớp học'), t('Giáo viên giao bài, học sinh luyện tập – miễn phí, không quảng cáo.')) + '<div class="skel skel-l"></div><div class="skel skel-l"></div>';
    let d; try { d = await w(mine(true, w.signal)); } catch (e) { view.innerHTML = head(UI.icon('school') + ' ' + t('Lớp học')) + `<div class="card">${esc(ERR()[e.code] || t('Có lỗi kết nối – thử lại sau.'))}</div>`; return; }
    await w(needTopics(d.learn.flatMap(c => c.tasks.map(x => x.ref))));
    const me = (Sync.user.displayName || '').split(' ').slice(-1)[0] || '';
    const done = c => c.tasks.filter(x => c.prog.some(p => p.task === x.id)).length;
    view.innerHTML = head(UI.icon('school') + ' ' + t('Lớp học'), t('Giáo viên giao bài, học sinh luyện tập – miễn phí, không quảng cáo.')) + `
      <div class="card" id="crJoinCard"><h2 style="margin-top:0">🧑‍${UI.icon('graduation-cap')} ${t('Tham gia lớp')}</h2>
        <form id="crJoin" class="row wrap" style="gap:.5rem;align-items:flex-end">
          <label class="grow" style="min-width:150px"><span class="tiny muted">${t('Mã lớp')}</span><input class="input" id="crCode" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7M2QX" value="${esc(code || '')}" required style="text-transform:uppercase;letter-spacing:.12em" translate="no"></label>
          <label class="grow" style="min-width:180px"><span class="tiny muted">${t('Tên hiển thị với giáo viên')}</span><input class="input" id="crName" maxlength="40" autocomplete="nickname" value="${esc(me)}" required></label>
          <button class="btn primary" type="submit">${t('Tham gia')}</button>
        </form>
        <p class="tiny muted" style="margin:.5rem 0 0">${t('Dùng tên mà giáo viên nhận ra (ví dụ tên và lớp). Không cần email hay số điện thoại.')}</p></div>
      ${d.learn.length ? `<h2>${t('Lớp tôi đang học')}</h2><div class="cr-list">${d.learn.map(c => `<a class="card hover cr-item" href="#/class/${esc(c.id)}" style="color:var(--text)"><div><b>${esc(c.name)}</b><div class="tiny muted">${t('Tên của bạn: {name}', { name: esc(c.me) })}</div></div><span class="cr-pct ${pctCls(c.tasks.length ? done(c) / c.tasks.length * 100 : 100)}">${done(c)}/${c.tasks.length}</span></a>`).join('')}</div>` : ''}
      <h2>👩‍🏫 ${t('Lớp tôi dạy')}</h2>
      <div class="cr-list">${d.teach.map(c => `<a class="card hover cr-item" href="#/class/${esc(c.id)}" style="color:var(--text)"><div><b>${esc(c.name)}</b><div class="tiny muted">${t('{n} học sinh', { n: c.n })} · ${t('Mã')} <span translate="no">${esc(c.code)}</span></div></div><span aria-hidden="true">→</span></a>`).join('') || `<p class="muted small">${t('Bạn chưa tạo lớp nào.')}</p>`}</div>
      <form id="crNew" class="card row wrap" style="gap:.5rem;align-items:flex-end;margin-top:.6rem">
        <label class="grow" style="min-width:200px"><span class="tiny muted">${t('Tên lớp mới')}</span><input class="input" id="crNewName" maxlength="60" placeholder="${esc(t('Ví dụ: IELTS 10A1 – Sáng thứ Bảy'))}" required></label>
        <button class="btn" type="submit">＋ ${t('Tạo lớp')}</button>
      </form>
      <p class="tiny muted" style="margin-top:1.2rem"><a href="${site(schoolsUrl())}" target="_blank" rel="noopener">${t('Hướng dẫn cho nhà trường & quản trị viên')} →</a></p>`;
    $('#crJoin').onsubmit = async e => {
      e.preventDefault(); const btn = e.submitter || $('#crJoin button'); btn.disabled = true;
      try { const j = await call('join', { code: $('#crCode').value, name: $('#crName').value }); mineCache = null; LS.set('lk.cls', '1'); LS.set('lk.edu', '1'); toast('✅ ' + t('Đã vào lớp {name}', { name: j.cls.name })); location.hash = task ? info(task).href : '#/class/' + j.cls.id; } catch (x) { fail(x); btn.disabled = false; }
    };
    $('#crNew').onsubmit = async e => {
      e.preventDefault();
      try { const j = await call('create', { name: $('#crNewName').value }); mineCache = null; LS.set('lk.edu', '1'); location.hash = '#/class/' + j.cls.id; } catch (x) { fail(x); }
    };
    if (code) $('#crName').focus();
  }

  // ---------- Học sinh: bài được giao ----------
  function student(c) {
    const P = id => c.prog.find(p => p.task === id);
    view.innerHTML = head(UI.icon('school') + ' ' + esc(c.name), t('Tên của bạn: {name}', { name: esc(c.me) }), true) + `
      <div class="card"><h2 style="margin-top:0">${t('Bài được giao')}</h2>
        <p class="tiny muted">${t('Bộ từ: học rồi làm bài Kiểm tra hoặc Ghép thẻ. Đề thi: làm và nộp bài. Kết quả tự gửi cho giáo viên khi bạn đăng nhập.')}</p>
        <div class="cr-list">${c.tasks.map(x => { const i = info(x.ref), p = P(x.id), late = x.due && !p && x.due < Date.now(); return `<div class="cr-item" style="border-top:1px solid var(--line);padding-top:.6rem"><div class="row nowrap" style="gap:.6rem"><span class="em" aria-hidden="true">${i.em}</span><div><b>${esc(i.title)}</b><div class="tiny muted">${esc(i.sub)}${x.due ? ` · <span${late ? ' style="color:var(--again,#e5502f)"' : ''}>${t('Hạn {d}', { d: day(x.due) })}</span>` : ''}</div></div></div>
          <div class="row nowrap" style="gap:.5rem">${p ? `<span class="cr-pct ${pctCls(p.best)}" title="${esc(t('Điểm cao nhất'))}">✓ ${p.best}%</span>` : `<span class="tiny muted">${t('Chưa làm')}</span>`}<a class="btn sm ${p ? '' : 'primary'}" href="${i.href}">${p ? t('Làm lại') : t('Làm bài')}</a></div></div>`; }).join('') || `<p class="muted">${t('Giáo viên chưa giao bài nào.')}</p>`}</div></div>
      <button class="btn ghost sm" id="crLeave" style="margin-top:1rem">${t('Rời lớp')}</button>`;
    $('#crLeave').onclick = async () => { if (!confirm(t('Rời lớp này? Kết quả của bạn trong lớp sẽ bị xóa.'))) return; try { await call('leave', { cls: c.id }); mineCache = null; location.hash = '#/class'; } catch (e) { fail(e); } };
  }

  // ---------- Giáo viên: mời, giao bài, tiến độ ----------
  async function teacher(id) {
    const w = App.W; let R; try { R = await w(call('report', { cls: id }, w.signal)); } catch (e) { return fail(e); }
    await w(needTopics(R.tasks.map(x => x.ref)));
    const c = R.cls, N = R.members.length, T = R.tasks.length;
    const prog = (task, uid) => R.prog.find(p => p.task === task && p.id === uid);
    const stat = m => { const ps = R.tasks.map(x => prog(x.id, m.id)).filter(Boolean); return { done: ps.length, acc: ps.length ? Math.round(ps.reduce((a, p) => a + p.best, 0) / ps.length) : null, last: Math.max(m.last || 0, ...ps.map(p => p.updated)) }; };
    const url = joinUrl(c.code), invite = t('Vào lớp {name} trên Lexkite: mở đường link, đăng nhập Google và bấm Tham gia. Mã lớp: {code}', { name: c.name, code: c.code });
    view.innerHTML = head('👩‍🏫 ' + esc(c.name), t('{n} học sinh', { n: N }) + ' · ' + t('{n} bài đã giao', { n: T }), true) + `
      <div class="card"><h2 style="margin-top:0">${t('Mời học sinh')}</h2>
        <div class="row wrap between" style="gap:1rem;align-items:center"><div><div class="tiny muted">${t('Mã lớp')}</div><div class="cr-code" translate="no">${esc(c.code)}</div></div>
          <div class="row wrap" style="gap:.5rem">${gcBtn(url, t('Vào lớp {name} trên Lexkite', { name: c.name }), invite, t('Chia sẻ lên Google Classroom'), 'primary')}<button class="btn" id="crCopy">🔗 ${t('Sao chép link')}</button><button class="btn ghost sm" id="crCodeNew">${t('Đổi mã')}</button></div></div>
        <p class="tiny muted" style="margin:.6rem 0 0;word-break:break-all" translate="no">${esc(url)}</p></div>
      <div class="card"><div class="row between wrap" style="gap:.5rem"><h2 style="margin:0">${t('Bài đã giao')}</h2><button class="btn primary sm" id="crAdd">＋ ${t('Giao bài')}</button></div>
        <div class="cr-list" style="margin-top:.6rem">${R.tasks.map(x => { const i = info(x.ref), k = R.members.filter(m => prog(x.id, m.id)).length; return `<div class="cr-item" style="border-top:1px solid var(--line);padding-top:.6rem"><div class="row nowrap" style="gap:.6rem"><span class="em" aria-hidden="true">${i.em}</span><div><b>${esc(i.title)}</b><div class="tiny muted">${t('{k}/{n} học sinh đã làm', { k, n: N })}${x.due ? ' · ' + t('Hạn {d}', { d: day(x.due) }) : ''}</div></div></div>
          <div class="row nowrap" style="gap:.4rem">${gcBtn(joinUrl(c.code, x.ref), i.title + ' – ' + c.name, t('Làm bài trên Lexkite. Lần đầu: đăng nhập Google và bấm Tham gia lớp (mã {code}).', { code: c.code }), t('Giao trên Classroom'), 'sm')}<a class="btn ghost sm" href="${i.href}" title="${esc(t('Xem trước'))}" aria-label="${esc(t('Xem trước'))}">👁</a><button class="btn ghost sm" data-un="${esc(x.id)}" aria-label="${esc(t('Gỡ bài'))}" title="${esc(t('Gỡ bài'))}">✕</button></div></div>`; }).join('') || `<p class="muted small">${t('Chưa có bài nào. Bấm “Giao bài” để chọn bộ từ hoặc đề luyện có sẵn.')}</p>`}</div></div>
      <div class="card"><div class="row between wrap" style="gap:.5rem"><h2 style="margin:0">${t('Tiến độ học sinh')}</h2>${N ? `<button class="btn ghost sm" id="crCsv">⬇ CSV</button>` : ''}</div>
        ${N ? `<div class="cr-wrap"><table class="cr-tbl"><thead><tr><th>${t('Học sinh')}</th><th>${t('Đã hoàn thành')}</th><th>${t('Độ chính xác')}</th><th>${t('Hoạt động gần nhất')}</th>${R.tasks.map(x => `<th title="${esc(info(x.ref).title)}">${info(x.ref).em}</th>`).join('')}<th></th></tr></thead><tbody>
          ${R.members.map(m => { const s = stat(m); return `<tr><td><b>${esc(m.name)}</b></td><td><span class="cr-pct ${pctCls(T ? s.done / T * 100 : 100)}">${s.done}/${T}</span></td><td>${s.acc == null ? '–' : `<span class="cr-pct ${pctCls(s.acc)}">${s.acc}%</span>`}</td><td class="tiny">${esc(rel(s.last))}</td>${R.tasks.map(x => { const p = prog(x.id, m.id); return `<td>${p ? `<span class="cr-pct ${pctCls(p.best)}" title="${esc(t('Cao nhất {b}% · lần gần nhất {l}% · {n} lượt', { b: p.best, l: p.last, n: p.tries }))}">${p.best}</span>` : '<span class="muted">·</span>'}</td>`; }).join('')}<td><button class="btn ghost sm" data-kick="${esc(m.id)}" data-nm="${esc(m.name)}" aria-label="${esc(t('Xóa khỏi lớp'))}" title="${esc(t('Xóa khỏi lớp'))}">✕</button></td></tr>`; }).join('')}
          </tbody></table></div>` : `<p class="muted small">${t('Chưa có học sinh. Gửi mã lớp hoặc chia sẻ lên Google Classroom để học sinh tham gia.')}</p>`}
      </div>
      <div class="row wrap" style="gap:.5rem;margin-top:1rem"><button class="btn ghost sm" id="crRename">${UI.icon('pencil')} ${t('Đổi tên lớp')}</button><button class="btn ghost sm" id="crDel" style="color:var(--again,#e5502f)">🗑 ${t('Xóa lớp')}</button></div>`;
    const again = () => teacher(id);
    $('#crCopy').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('✅ ' + t('Đã sao chép')); } catch (e) { prompt(t('Sao chép link'), url); } };
    $('#crCodeNew').onclick = async () => { if (!confirm(t('Tạo mã mới? Mã cũ sẽ không dùng được nữa (học sinh đã vào lớp không bị ảnh hưởng).'))) return; try { await call('newcode', { cls: id }); again(); } catch (e) { fail(e); } };
    $('#crAdd').onclick = () => picker(c, R.tasks.map(x => x.ref), again);
    $$('[data-un]').forEach(b => { b.onclick = async () => { if (!confirm(t('Gỡ bài này? Kết quả của học sinh cho bài này sẽ bị xóa.'))) return; try { await call('unassign', { cls: id, task: b.dataset.un }); again(); } catch (e) { fail(e); } }; });
    $$('[data-kick]').forEach(b => { b.onclick = async () => { if (!confirm(t('Xóa {name} khỏi lớp? Kết quả của học sinh này sẽ bị xóa.', { name: b.dataset.nm }))) return; try { await call('kick', { cls: id, uid: b.dataset.kick }); again(); } catch (e) { fail(e); } }; });
    $('#crRename').onclick = async () => { const n = prompt(t('Tên lớp mới'), c.name); if (!n || n === c.name) return; try { await call('rename', { cls: id, name: n }); mineCache = null; again(); } catch (e) { fail(e); } };
    $('#crDel').onclick = async () => { if (!confirm(t('Xóa hẳn lớp {name}? Học sinh, bài giao và kết quả sẽ bị xóa vĩnh viễn.', { name: c.name }))) return; try { await call('delete', { cls: id }); mineCache = null; location.hash = '#/class'; } catch (e) { fail(e); } };
    const csv = $('#crCsv');
    if (csv) csv.onclick = () => {
      const q = v => `"${String(v).replace(/"/g, '""')}"`;
      const rows = [[t('Học sinh'), t('Đã hoàn thành'), t('Độ chính xác'), t('Hoạt động gần nhất'), ...R.tasks.map(x => info(x.ref).title)]];
      R.members.forEach(m => { const s = stat(m); rows.push([m.name, `${s.done}/${T}`, s.acc == null ? '' : s.acc + '%', s.last ? new Date(s.last).toISOString().slice(0, 16).replace('T', ' ') : '', ...R.tasks.map(x => { const p = prog(x.id, m.id); return p ? p.best + '%' : ''; })]); });
      UI.download(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }), `lexkite-${c.name.replace(/[^\p{L}\p{N}]+/gu, '-')}.csv`);
    };
  }

  // ---------- Chọn bài để giao ----------
  async function picker(c, have, done) {
    UI.modal(`<h2>＋ ${t('Giao bài')}</h2><div class="skel skel-l"></div>`);
    try { await App.need('words', 'tsl'); } catch (e) { /* vẫn còn 12 bộ cơ bản */ }
    const G = (window.IELTS_DATA && IELTS_DATA.GROUPS) || [];
    const opt = (ref, em, title, sub) => `<label><input type="radio" name="crRef" value="${esc(ref)}"${have.includes(ref) ? ' disabled' : ''}><span aria-hidden="true">${em}</span><span class="grow"><b>${esc(title)}</b>${sub ? `<span class="tiny muted"> · ${esc(sub)}</span>` : ''}</span>${have.includes(ref) ? `<span class="tiny muted">${t('Đã giao')}</span>` : ''}</label>`;
    const tabs = [
      ['vocab', UI.icon('library') + ' ' + t('Bộ từ vựng'), () => G.map(g => { const tps = TOPICS().filter(x => x.group === g.id); return tps.length ? `<div class="tiny muted" style="margin-top:.4rem">${g.emoji} ${esc(g.name)}</div>` + tps.map(x => opt('topic:' + x.id, x.emoji, t(x.name), t('{n} từ', { n: x.words.length }))).join('') : ''; }).join('')],
      ['il', UI.icon('headphones') + ' IELTS Listening', () => NUM.il.map(n => { const i = info('il:' + n); return opt('il:' + n, i.em, i.title, i.sub); }).join('')],
      ['ir', UI.icon('book-open') + ' IELTS Reading', () => NUM.ir.map(n => { const i = info('ir:' + n); return opt('ir:' + n, i.em, i.title, i.sub); }).join('')],
      ['toeic', UI.icon('briefcase') + ' TOEIC', () => NUM.toeic.map(n => { const i = info('toeic:' + n); return opt('toeic:' + n, i.em, i.title, i.sub); }).join('')],
    ];
    const box = UI.modal(`<h2 style="margin-top:0">＋ ${t('Giao bài')} · <span class="muted">${esc(c.name)}</span></h2>
      <div class="tabs" id="crTabs" role="tablist">${tabs.map(([k, l], i) => `<button type="button" role="tab" data-k="${k}" class="${i ? '' : 'on'}" aria-selected="${!i}">${l}</button>`).join('')}</div>
      <div class="cr-pick" id="crPick" role="radiogroup"></div>
      <div class="row wrap" style="gap:.6rem;align-items:flex-end"><label><span class="tiny muted">${t('Hạn nộp (không bắt buộc)')}</span><input class="input" type="date" id="crDue"></label><span class="grow"></span>
        <button class="btn ghost" type="button" id="crX">${t('Hủy')}</button><button class="btn primary" type="button" id="crGo" disabled>${t('Giao bài')}</button></div>`);
    const show = k => { $('#crPick', box).innerHTML = tabs.find(x => x[0] === k)[2](); $$('#crTabs button', box).forEach(b => { b.classList.toggle('on', b.dataset.k === k); b.setAttribute('aria-selected', b.dataset.k === k); }); $('#crGo', box).disabled = true; };
    $$('#crTabs button', box).forEach(b => { b.onclick = () => show(b.dataset.k); });
    show('vocab');
    box.addEventListener('change', e => { if (e.target.name === 'crRef') $('#crGo', box).disabled = false; });
    $('#crX', box).onclick = () => UI.closeModal();
    $('#crGo', box).onclick = async () => {
      const ref = ($('input[name=crRef]:checked', box) || {}).value; if (!ref) return;
      const dv = $('#crDue', box).value, due = dv ? new Date(dv + 'T23:59:00').getTime() : null;
      $('#crGo', box).disabled = true;
      try { await call('assign', { cls: c.id, ref, due }); UI.closeModal(); toast('✅ ' + t('Đã giao bài')); done(); } catch (e) { fail(e); $('#crGo', box).disabled = false; }
    };
  }

  // ---------- Định tuyến ----------
  routes.class = App.guard(async function (arg, query) {
    const w = App.W, a = String(arg || '');
    if (a.startsWith('join/')) return hub(a.slice(5).toUpperCase(), query && query.get('task'));
    if (!a) return hub();
    if (!window.Sync || !Sync.user) return signedOut();
    view.innerHTML = head(UI.icon('school') + ' ' + t('Lớp học'), '', true) + '<div class="skel skel-l"></div><div class="skel skel-l"></div>';
    let d; try { d = await w(mine(false, w.signal)); } catch (e) { return fail(e); }
    if (d.teach.some(c => c.id === a)) return teacher(a);
    const c = d.learn.find(x => x.id === a);
    if (!c) { location.hash = '#/class'; return; }
    await w(needTopics(c.tasks.map(x => x.ref)));
    student(c);
  });
  App.Classroom = { info, mine };
})();
