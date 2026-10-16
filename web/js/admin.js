/* Trang quản trị Lexkite – gọi /api/admin (máy chủ tự kiểm tra email quản trị trong ADMIN_EMAILS). */
(() => {
  const $ = s => document.querySelector(s), main = $('#main');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = n => (+n || 0).toLocaleString('vi-VN');
  const dur = s => { s = Math.round(+s || 0); return s < 60 ? s + ' giây' : Math.floor(s / 60) + ' phút ' + (s % 60) + ' giây'; };
  const when = t => t ? new Date(t).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '–';
  const bytes = b => b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b > 1024 ? (b / 1024).toFixed(1) + ' KB' : (b || 0) + ' B';
  const FLAG = c => c && c.length === 2 && c !== 'XX' ? String.fromCodePoint(...[...c.toUpperCase()].map(x => 127397 + x.charCodeAt(0))) + ' ' + c : '🌐 ?';
  let user = null, tab = 'overview';

  firebase.initializeApp(FIREBASE_CONFIG);
  const auth = firebase.auth();
  async function api(op, body = {}) {
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await user.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (!r.ok) throw new Error(j.error || r.status);
    return j;
  }
  const signIn = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => { $('#loginMsg').textContent = e.message; });
  $('#signin').onclick = signIn;

  auth.onAuthStateChanged(async u => {
    user = u;
    if (!u) return;
    $('#me').innerHTML = `${esc(u.email)} <button class="btn ghost sm" id="out">Thoát</button>`;
    $('#out').onclick = () => auth.signOut().then(() => location.reload());
    try { await show('overview'); $('#tabs').hidden = false; badges(); }
    catch (e) { main.innerHTML = `<div class="card center adm-login"><h2>Không có quyền</h2><p class="muted">${esc(u.email)} chưa được cấp quyền quản trị.</p><button class="btn" onclick="firebase.auth().signOut().then(()=>location.reload())">Đổi tài khoản</button></div>`; }
  });
  $('#tabs').onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); };

  async function show(t) {
    tab = t; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    main.innerHTML = '<p class="muted">Đang tải…</p>';
    await VIEWS[t]();
  }
  async function badges() {
    const [o, a] = await Promise.all([api('overview'), api('alerts')]);
    $('#inboxN').textContent = o.inbox.open || '';
    $('#alertN').textContent = a.rows.filter(r => !r.ok).length || '';
  }
  const bars = (rows, label = r => r.k, val = r => r.n, extra = r => '') => {
    const max = Math.max(1, ...rows.map(val));
    return `<div class="bars">${rows.map(r => `<div class="row2"><span class="k" title="${esc(label(r))}">${esc(label(r)) || '–'}</span><span><span class="bar" style="display:block;width:${val(r) / max * 100}%"></span></span><span class="small">${num(val(r))}${extra(r)}</span></div>`).join('') || '<p class="muted small">Chưa có dữ liệu</p>'}</div>`;
  };
  const chart = (rows, key) => {
    if (!rows.length) return '<p class="muted small">Chưa có dữ liệu</p>';
    const W = 600, H = 170, max = Math.max(1, ...rows.map(r => +r[key] || 0)), bw = W / rows.length;
    return `<svg class="chart" viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none">${rows.map((r, i) => { const h = (+r[key] || 0) / max * H; return `<rect x="${i * bw + 1}" y="${H - h}" width="${Math.max(bw - 2, 1)}" height="${h}" rx="2" fill="var(--primary)"><title>${r.day}: ${r[key]}</title></rect>`; }).join('')}<text x="0" y="${H + 14}">${rows[0].day}</text><text x="${W}" y="${H + 14}" text-anchor="end">${rows[rows.length - 1].day}</text><text x="2" y="10">${num(max)}</text></svg>`;
  };

  const VIEWS = {
    async overview() {
      const [o, a, q] = await Promise.all([api('overview'), api('alerts'), api('quality').catch(() => ({}))]);
      const u = o.users, s = o.sessions, bad = a.rows.filter(r => !r.ok);
      main.innerHTML = `
        <div class="kpis">
          <div class="card kpi"><div class="l">Người dùng (đăng nhập)</div><div class="v">${num(u.total)}</div><div class="s">+${num(u.new7)} trong 7 ngày</div></div>
          <div class="card kpi"><div class="l">Hoạt động hôm nay / 7 / 30 ngày</div><div class="v">${num(u.act1)}</div><div class="s">${num(u.act7)} · ${num(u.act30)}</div></div>
          <div class="card kpi"><div class="l">Lượt truy cập hôm nay</div><div class="v">${num(s.today)}</div><div class="s">${num(s.s7)} phiên · ${num(s.v7)} khách / 7 ngày</div></div>
          <div class="card kpi"><div class="l">Thời gian TB mỗi phiên (7 ngày)</div><div class="v">${dur(s.dur7)}</div><div class="s">${(+s.pages7 || 0).toFixed(1)} trang/phiên</div></div>
          <div class="card kpi"><div class="l">Tin nhắn chưa xử lý</div><div class="v">${num(o.inbox.open)}</div><div class="s"><a href="#" data-go="inbox">Mở hộp thư →</a></div></div>
          <div class="card kpi"><div class="l">Chất lượng (rà soát hằng ngày)</div><div class="v" style="color:${q.score == null ? '' : q.score >= 100 ? 'var(--good,#15803d)' : 'var(--bad,#dc2626)'}">${q.score == null ? '–' : q.score + '%'}</div><div class="s"><a href="#" data-go="quality">${q.score != null && q.score < 100 ? '⚠️ Dưới chuẩn – xem →' : 'Chi tiết →'}</a></div></div>
          <div class="card kpi"><div class="l">Lỗi JS 24 giờ</div><div class="v">${num(o.errors24.hits)}</div><div class="s">${num(o.errors24.kinds)} loại</div></div>
        </div>
        <div class="card"><h3>${bad.length ? '⚠️ Cần chú ý' : '✅ Hệ thống ổn định'}</h3>${(bad.length ? bad : a.rows.slice(0, 4)).map(r => `<div class="small" style="margin:.3rem 0"><span class="dot ${r.ok ? '' : r.warn ? 'warn' : 'bad'}"></span><b>${esc(r.name)}</b> – ${esc(r.conclusion || r.status)}</div>`).join('')}</div>`;
      main.querySelectorAll('[data-go]').forEach(x => x.onclick = e => { e.preventDefault(); show(x.dataset.go); });
    },
    async analytics() {
      const days = +(sessionStorage.getItem('adm.days') || 30), a = await api('analytics', { days }), s = a.sum || {};
      const pct = (x, y) => y ? Math.round(x / y * 100) + '%' : '–';
      main.innerHTML = `
        <div class="tools"><b>Khoảng thời gian</b>${[1, 7, 30, 90, 365].map(d => `<button class="btn sm ${d === days ? 'primary' : ''}" data-d="${d}">${d === 1 ? 'Hôm nay' : d + ' ngày'}</button>`).join('')}</div>
        ${a.rate < 1 ? `<div class="card" style="margin-bottom:.8rem">ℹ️ Đang lấy mẫu ${Math.round(a.rate * 100)}% người dùng – số phiên/người thực tế ≈ số dưới đây × ${Math.round(1 / a.rate)}; tỉ lệ % và trung bình giữ nguyên.</div>` : ''}
        <div class="kpis">
          <div class="card kpi"><div class="l">Phiên truy cập</div><div class="v">${num(s.s)}</div></div>
          <div class="card kpi"><div class="l">Khách (thiết bị)</div><div class="v">${num(s.v)}</div><div class="s">${s.v ? (s.s / s.v).toFixed(1) : 0} phiên/khách</div></div>
          <div class="card kpi"><div class="l">Thời gian TB/phiên</div><div class="v">${dur(s.dur)}</div></div>
          <div class="card kpi"><div class="l">Trang/phiên</div><div class="v">${(+s.pages || 0).toFixed(1)}</div></div>
          <div class="card kpi"><div class="l">Khách quay lại</div><div class="v">${pct(s.ret, s.s)}</div></div>
          <div class="card kpi"><div class="l">Thoát ngay (&lt;15 giây, 1 trang)</div><div class="v">${pct(s.bounce, s.s)}</div></div>
          <div class="card kpi"><div class="l">LCP thật (tốc độ hiện nội dung)</div><div class="v">${s.lcp ? (s.lcp / 1000).toFixed(2) + ' s' : '–'}</div><div class="s">${s.lcpN ? pct(s.lcpGood, s.lcpN) + ' phiên đạt “Tốt” (≤ 2,5 s)' : 'chưa có dữ liệu'}</div></div>
        </div>
        <div class="card"><h3>Phiên theo ngày</h3>${chart(a.daily, 's')}</div>
        <div class="adm-grid">
          <div class="card"><h3>Nguồn truy cập</h3>${bars(a.refs, r => r.k, r => r.n, r => ` · ${dur(r.dur)}`)}</div>
          <div class="card"><h3>Quốc gia</h3>${bars(a.countries, r => FLAG(r.k))}</div>
          <div class="card"><h3>Trang vào đầu tiên</h3>${bars(a.paths, r => '#/' + r.k)}</div>
          <div class="card"><h3>Tần suất (số phiên mỗi khách)</h3>${bars(['1', '2–3', '4–7', '8–15', '16+'].map(k => a.freq.find(f => f.k === k) || { k, n: 0 }), r => r.k + ' lần')}</div>
          <div class="card"><h3>Thiết bị</h3>${bars(a.devs)}<h3 style="margin-top:1rem">Nền tảng</h3>${bars(a.plats, r => ({ web: 'Web', pwa: 'Web đã cài (PWA)', ext: 'Add-on Chrome', app: 'App iOS/Android' })[r.k] || r.k)}</div>
          <div class="card"><h3>Ngôn ngữ giao diện</h3>${bars(a.langs)}</div>
        </div>
        <p class="small muted" style="margin-top:1rem">Thống kê ẩn danh tự xây: không cookie, không lưu IP; quốc gia do Cloudflare xác định. Không tính bot, Lighthouse và chế độ sandbox.</p>`;
      main.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { sessionStorage.setItem('adm.days', b.dataset.d); show('analytics'); });
    },
    async users() {
      const q = sessionStorage.getItem('adm.q') || '', off = +(sessionStorage.getItem('adm.off') || 0), r = await api('users', { q, offset: off });
      main.innerHTML = `
        <div class="tools"><input id="uq" placeholder="Tìm email, tên hoặc UID" value="${esc(q)}"><button class="btn sm" id="ugo">Tìm</button><span class="small muted">Tổng ${num(r.total)} tài khoản</span></div>
        <div class="card tbl-wrap"><table class="tbl"><tr><th>Email</th><th>Tên</th><th>Nền tảng</th><th>Ngày tạo</th><th>Lần cuối</th><th>Số lần vào</th><th></th></tr>
        ${r.rows.map(u => `<tr><td>${esc(u.email)}</td><td>${esc(u.name)}</td><td>${esc(u.plat)}</td><td>${when(u.created)}</td><td>${when(u.seen)}</td><td>${num(u.n)}</td><td><button class="btn ghost sm" data-uid="${esc(u.uid)}">Chi tiết</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Chưa có người dùng</td></tr>'}</table></div>
        <div class="tools" style="margin-top:.8rem">${off ? '<button class="btn sm" id="prev">← Trước</button>' : ''}${r.rows.length === 50 ? '<button class="btn sm" id="next">Sau →</button>' : ''}</div>
        <div id="ud"></div>`;
      const go = o => { sessionStorage.setItem('adm.q', $('#uq').value); sessionStorage.setItem('adm.off', o); show('users'); };
      $('#ugo').onclick = () => go(0); $('#uq').onkeydown = e => e.key === 'Enter' && go(0);
      if ($('#prev')) $('#prev').onclick = () => go(Math.max(0, off - 50)); if ($('#next')) $('#next').onclick = () => go(off + 50);
      main.querySelectorAll('[data-uid]').forEach(b => b.onclick = async () => {
        const d = await api('user', { uid: b.dataset.uid }), total = d.docs.reduce((a, x) => a + x.bytes, 0);
        $('#ud').innerHTML = `<div class="card" style="margin-top:1rem"><h3>${esc(d.user.email || d.user.uid)}</h3><p class="small muted">UID ${esc(d.user.uid)} · dữ liệu đồng bộ ${bytes(total)} trong ${d.docs.length} phần · cập nhật ${when(Math.max(0, ...d.docs.map(x => x.updated)))}</p>
          <a class="btn sm" href="mailto:${esc(d.user.email)}">Gửi email</a> <button class="btn ghost sm" id="udel" style="color:var(--again)">Xóa dữ liệu đồng bộ (theo yêu cầu người dùng)</button></div>`;
        $('#ud').scrollIntoView({ behavior: 'smooth' });
        $('#udel').onclick = async () => { const c = prompt('Xóa vĩnh viễn dữ liệu đồng bộ của tài khoản này. Gõ lại UID để xác nhận:'); if (c !== d.user.uid) return; await api('userDelete', { uid: c, confirm: c }); show('users'); };
      });
    },
    async inbox() {
      const f = sessionStorage.getItem('adm.inbox') || 'open', r = await api('inbox', { filter: f });
      const gmail = m => 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(m.email) + '&su=' + encodeURIComponent('Re: Lexkite – ' + (m.msg || '').slice(0, 50)) + '&body=' + encodeURIComponent(`\n\n---\n${m.name || ''} <${m.email}> (${when(m.at)}):\n${m.msg}`);
      main.innerHTML = `
        <div class="tools"><button class="btn sm ${f === 'open' ? 'primary' : ''}" data-f="open">Chưa xử lý</button><button class="btn sm ${f === 'all' ? 'primary' : ''}" data-f="all">Tất cả</button><span class="small muted">Tin nhắn từ form Liên hệ (#/contact) · bản sao được chuyển vào support@lexkite.com</span></div>
        ${r.rows.map(m => `<div class="card" style="margin-bottom:.8rem;${m.handled ? 'opacity:.6' : ''}"><div class="row between" style="gap:.5rem;flex-wrap:wrap"><b>${esc(m.name || '(không tên)')} &lt;${esc(m.email)}&gt;</b><span class="small muted">${when(m.at)} · ${esc(m.lang)} · #${m.id}${m.sent ? '' : ' · ⚠️ chưa chuyển vào Gmail'}</span></div>
          <p class="msg">${esc(m.msg)}</p><div class="tools" style="margin:0"><a class="btn primary sm" target="_blank" rel="noopener" href="${gmail(m)}">Trả lời bằng Gmail</a><a class="btn sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: Lexkite')}">Ứng dụng email</a><button class="btn ghost sm" data-id="${m.id}" data-h="${m.handled ? 0 : 1}">${m.handled ? 'Mở lại' : '✓ Đã xử lý'}</button></div></div>`).join('') || '<div class="card muted">Không có tin nhắn.</div>'}`;
      main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { sessionStorage.setItem('adm.inbox', b.dataset.f); show('inbox'); });
      main.querySelectorAll('[data-id]').forEach(b => b.onclick = async () => { await api('inboxMark', { id: +b.dataset.id, handled: +b.dataset.h }); badges(); show('inbox'); });
    },
    async alerts() {
      const [a, e] = await Promise.all([api('alerts'), api('errors')]);
      main.innerHTML = `
        <div class="card"><h3>Trạng thái tự động</h3><table class="tbl">${a.rows.map(r => `<tr><td><span class="dot ${r.ok ? (r.warn ? 'warn' : '') : 'bad'}"></span>${esc(r.name)}</td><td>${esc(r.conclusion || r.status || '')}</td><td class="small muted">${r.at ? when(r.at) : ''}</td><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Xem</a>` : ''}</td></tr>`).join('')}</table>
        <p class="small muted">Workflow GitHub (dịch, build Android, âm thanh, blog, đo tốc độ…) · lỗi JS · hộp thư · dung lượng. Email tóm tắt tự động gửi về support khi có mục đỏ.</p></div>
        <div class="card" style="margin-top:1rem"><div class="row between"><h3>Lỗi JavaScript từ người dùng</h3>${e.rows.length ? '<button class="btn ghost sm" id="eclr">Xóa tất cả</button>' : ''}</div>
        <div class="tbl-wrap"><table class="tbl"><tr><th>Lỗi</th><th>Vị trí</th><th>Trang</th><th>Số lần</th><th>Gần nhất</th><th></th></tr>${e.rows.map(x => `<tr><td class="msg">${esc(x.msg)}</td><td class="small">${esc(x.src)}</td><td>${esc(x.path)}</td><td>${num(x.n)}</td><td class="small">${when(x.last)}</td><td><button class="btn ghost sm" data-h="${x.h}">Đã sửa</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Không có lỗi 🎉</td></tr>'}</table></div></div>`;
      if ($('#eclr')) $('#eclr').onclick = async () => { if (confirm('Xóa toàn bộ nhật ký lỗi?')) { await api('errorsClear'); show('alerts'); } };
      main.querySelectorAll('[data-h]').forEach(b => b.onclick = async () => { await api('errorsClear', { h: b.dataset.h }); show('alerts'); });
    },
    async quality() {
      const q = await api('quality'), col = q.score == null ? '' : q.score >= q.standard ? 'var(--good,#15803d)' : 'var(--bad,#dc2626)';
      main.innerHTML = `
        <div class="kpis"><div class="card kpi"><div class="l">Điểm chất lượng (lượt rà soát gần nhất)</div><div class="v" style="color:${col}">${q.score == null ? '–' : q.score + '%'}</div><div class="s">Chuẩn: ${q.standard}% · ${q.at ? when(q.at) : 'chưa chạy'}</div></div>
          <div class="card kpi"><div class="l">14 lượt gần nhất</div><div class="v" style="font-size:1.1rem;letter-spacing:2px">${q.history.map(h => `<a href="${esc(h.url)}" target="_blank" rel="noopener" title="${when(h.at)}">${h.ok ? '🟢' : '🔴'}</a>`).join('') || '–'}</div><div class="s">${q.history.filter(h => h.ok).length}/${q.history.length} lượt đạt</div></div></div>
        <div class="card"><h3>${q.score >= q.standard ? '✅ Đạt chuẩn' : '⚠️ Dưới chuẩn – cần xử lý'}</h3><table class="tbl">${q.checks.map(c => `<tr><td><span class="dot ${c.ok ? '' : 'bad'}"></span>${esc(c.name)}</td><td>${c.ok ? 'Đạt' : '<b>Không đạt</b>'}</td></tr>`).join('')}</table>
        ${q.url ? `<p class="small"><a href="${esc(q.url)}" target="_blank" rel="noopener">Xem chi tiết lượt rà soát →</a></p>` : ''}
        <div id="bcBox" style="margin-top:1rem"></div>
        <p class="small muted">Rà soát tự động mỗi ngày 7h sáng: kiểm thử đầy đủ (chính tả, đa ngôn ngữ 14 thứ tiếng, thuật toán FSRS & đồng bộ, giao diện, trợ năng WCAG, lời giải đề thi, liên kết), kiểm tra kiểu, cú pháp workflow, bản live (trang, API, dữ liệu, âm thanh, phiên bản). Không đạt → email cảnh báo 8h sáng.</p></div>`;
      // Kiểm nghĩa bản dịch: dịch ngược (tự động sau mỗi lượt dịch) → câu nghi sai → AI xác nhận (bấm nút, gói AI miễn phí)
      const bc = await fetch('/i18n/backcheck.json?x=' + Date.now()).then(r => r.ok ? r.json() : null).catch(() => null);
      if (bc && bc.langs) {
        $('#bcBox').innerHTML = `<h3>🌐 Kiểm nghĩa bản dịch (dịch ngược + AI)</h3><p class="small muted">Cập nhật ${when(bc.at)} · "khớp nghĩa" = tỉ lệ câu dịch ngược về tiếng Anh vẫn đúng ý; câu nghi sai cần AI xác nhận.</p>
          <table class="tbl"><tr><th>Ngôn ngữ</th><th>Số câu</th><th>Khớp nghĩa</th><th>Nghi sai</th><th></th></tr>${Object.entries(bc.langs).map(([l, x]) => `<tr><td><b>${esc(l)}</b></td><td>${num(x.checked)}</td><td>${x.ok}%</td><td>${x.flagged.length}</td><td><button class="btn sm" data-judge="${esc(l)}">🤖 AI xác nhận</button> <button class="btn sm" data-gem="${esc(l)}">✨ Gemini duyệt</button></td></tr>`).join('')}</table><div id="bcRes"></div>`;
        main.querySelectorAll('[data-gem]').forEach(b => b.onclick = async () => {
          b.disabled = true; b.textContent = '⏳ Gemini…'; const r = await api('geminiReview', { lang: b.dataset.gem }); b.disabled = false; b.textContent = '✨ Gemini duyệt';
          $('#bcRes').innerHTML = r.error ? `<p class="small">✗ ${esc(r.error)}${/khóa/.test(r.error) ? ' – vào tab Cài đặt để dán khóa Gemini' : ''}</p>` : `<h4>✨ Gemini · ${esc(r.lang)}: duyệt ${r.reviewed} câu · <b>${r.wrong.length} câu sai nghĩa</b> ${r.wrong.length ? '<button class="btn sm primary" id="gAll">Áp dụng tất cả</button>' : ''}</h4>
            <div class="tbl-wrap"><table class="tbl"><tr><th>Tiếng Anh</th><th>Bản dịch hiện tại</th><th>Gemini đề xuất</th><th>Lý do</th><th></th></tr>${r.wrong.map((w, i) => `<tr><td class="small">${esc(w.en)}</td><td class="small">${esc(w.tr)}</td><td class="small"><b>${esc(w.fix)}</b></td><td class="small">${esc(w.why)}</td><td><button class="btn sm" data-ap="${i}">Áp dụng</button></td></tr>`).join('') || '<tr><td colspan="5">✅ Không có câu sai</td></tr>'}</table></div>
            <p class="small muted">Bản sửa đã áp dụng sẽ tự cập nhật vào app ở lượt dịch đêm (không cần sửa mã).</p>`;
          const ap = async i => { const w = r.wrong[i]; if (!w.fix) return; await api('i18nFixApprove', { lang: r.lang, key: w.key, val: w.fix }); const bt = main.querySelector(`[data-ap="${i}"]`); if (bt) { bt.disabled = true; bt.textContent = '✓ Đã duyệt'; } };
          main.querySelectorAll('[data-ap]').forEach(x => x.onclick = () => ap(+x.dataset.ap));
          if ($('#gAll')) $('#gAll').onclick = async () => { for (let i = 0; i < r.wrong.length; i++) await ap(i); $('#gAll').textContent = '✓ Đã duyệt tất cả'; };
        });
        main.querySelectorAll('[data-judge]').forEach(b => b.onclick = async () => {
          b.disabled = true; b.textContent = '⏳ …'; const r = await api('judge', { lang: b.dataset.judge }); b.disabled = false; b.textContent = '🤖 AI xác nhận';
          $('#bcRes').innerHTML = r.error ? `<p class="small">Lỗi: ${esc(r.error)}</p>` : `<h4>${esc(r.lang)}: AI đã duyệt ${r.judged} câu · còn ${r.pending} câu chờ (bấm tiếp) · <b>${r.wrong.length} câu sai nghĩa</b></h4>
            <div class="tbl-wrap"><table class="tbl"><tr><th>Tiếng Anh</th><th>Bản dịch</th><th>Dịch ngược</th><th>Lý do</th></tr>${r.wrong.map(w => `<tr><td class="small">${esc(w.en)}</td><td class="small">${esc(w.tr)}</td><td class="small muted">${esc(w.back)}</td><td class="small">${esc(w.why)}</td></tr>`).join('') || '<tr><td colspan="4">Không có câu sai</td></tr>'}</table></div>`;
        });
      }
    },
    async services() {
      const [u, s] = await Promise.all([api('usage'), api('services')]);
      main.innerHTML = `
        <div class="card"><h3>Dung lượng &amp; hạn mức miễn phí</h3>${u.meters.map(m => `<div class="meter ${m.pct >= 90 ? 'crit' : m.pct >= 70 ? 'warn' : ''}"><div class="row between small"><b>${esc(m.name)}</b><span>${m.unit === 'bytes' ? bytes(m.used) + ' / ' + bytes(m.cap) : num(m.used) + ' / ' + num(m.cap)} · ${m.pct}%</span></div><div class="track"><div class="fill" style="width:${Math.min(100, m.pct)}%"></div></div><div class="small muted">${esc(m.hint)}</div></div>`).join('')}
          <p class="small muted">Số dòng mỗi bảng: ${Object.entries(u.counts).map(([k, v]) => `${esc(k)} ${num(v)}`).join(' · ')}. Vàng ≥ 70%, đỏ ≥ 90% → nâng gói trong trang quản lý của dịch vụ đó.</p></div>
        <div class="card" style="margin-top:1rem"><div class="row between"><h3>Dịch vụ, tài khoản &amp; khóa API</h3><button class="btn sm" id="sadd">+ Thêm</button></div>
          <p class="small muted">Chỉ lưu <b>tên</b> khóa và nơi cất (biến bí mật Cloudflare / GitHub Secrets) – không bao giờ lưu giá trị khóa ở đây.</p>
          <div class="tbl-wrap"><table class="tbl"><tr><th>Dịch vụ</th><th>Dùng cho</th><th>Tài khoản</th><th>Miễn phí / giới hạn</th><th>Khóa (tên biến)</th><th>Trạng thái</th><th></th></tr>
          ${s.rows.map(r => `<tr><td><b>${esc(r.name)}</b>${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ''}</td><td class="small">${esc(r.purpose)}</td><td class="small">${esc(r.account)}</td><td class="small">${esc(r.free)}</td><td class="small"><code>${esc(r.secret)}</code></td><td class="small">${esc(r.status)}</td>
            <td style="white-space:nowrap">${r.console ? `<a class="btn primary sm" target="_blank" rel="noopener" href="${esc(r.console)}">Mở</a> ` : ''}${r.billing ? `<a class="btn sm" target="_blank" rel="noopener" href="${esc(r.billing)}">Nâng gói</a> ` : ''}<button class="btn ghost sm" data-sid="${r.id}">Sửa</button></td></tr>`).join('') || '<tr><td colspan="7" class="muted">Chưa có dịch vụ</td></tr>'}</table></div></div>
        <div id="sform"></div>`;
      const form = (r = {}) => {
        $('#sform').innerHTML = `<div class="card" style="margin-top:1rem"><h3>${r.id ? 'Sửa' : 'Thêm'} dịch vụ</h3><div class="form2">${[['name', 'Tên dịch vụ *'], ['purpose', 'Dùng cho'], ['account', 'Tài khoản / email đăng ký'], ['console', 'Link trang quản lý'], ['billing', 'Link thanh toán / nâng gói'], ['free', 'Gói miễn phí / giới hạn'], ['secret', 'Tên biến khóa (không ghi giá trị)'], ['status', 'Trạng thái'], ['note', 'Ghi chú']].map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(r[k] || '')}"></label>`).join('')}</div>
          <div class="tools" style="margin-top:.8rem"><button class="btn primary sm" id="ssave">Lưu</button>${r.id ? '<button class="btn ghost sm" id="sdel" style="color:var(--again)">Xóa</button>' : ''}</div></div>`;
        $('#sform').scrollIntoView({ behavior: 'smooth' });
        $('#ssave').onclick = async () => { const row = { id: r.id }; $('#sform').querySelectorAll('input').forEach(i => row[i.name] = i.value.trim()); if (/\b(sk-|AIza|ghp_|xox|-----BEGIN)/.test(row.secret + row.note)) return alert('Không lưu giá trị khóa ở đây – chỉ ghi tên biến.'); await api('serviceSet', { row }); show('services'); };
        if ($('#sdel')) $('#sdel').onclick = async () => { if (confirm('Xóa dịch vụ này khỏi danh sách?')) { await api('serviceDelete', { id: r.id }); show('services'); } };
      };
      $('#sadd').onclick = () => form();
      main.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => form(s.rows.find(x => x.id === +b.dataset.sid)));
    },
    async settings() {
      const c = await api('config'), v = k => esc((c.values[k] || {}).v || '');
      const L = { banner: 'Thông báo đầu trang (để trống = tắt)', banner_url: 'Link kèm thông báo (https://…)', banner_level: 'Kiểu thông báo: info / warn / ok', ai_user: 'Lượt chấm AI/ngày – đã đăng nhập (mặc định 5)', ai_anon: 'Lượt chấm AI/ngày – khách (mặc định 3)', ai_global: 'Trần AI toàn hệ thống/ngày (mặc định 400)', alert_errors: 'Ngưỡng cảnh báo lỗi JS/24h (mặc định 50)', hit_rate: 'Tỉ lệ lấy mẫu thống kê 0.01–1 (mặc định 1 = mọi người; > 30k người/ngày nên đặt 0.1 để giữ D1 miễn phí)', note: 'Ghi chú nội bộ cho quản trị' };
      main.innerHTML = `<div class="card"><h3>Cài đặt website</h3><div class="form2">${c.keys.map(k => `<label>${L[k] || k}${k === 'banner' || k === 'note' ? `<textarea name="${k}" rows="2">${v(k)}</textarea>` : `<input name="${k}" value="${v(k)}">`}<span class="small muted" style="font-weight:400">${c.values[k] ? 'Sửa ' + when(c.values[k].at) + ' bởi ' + esc(c.values[k].by) : ''}</span></label>`).join('')}</div>
        <div class="tools" style="margin-top:1rem"><button class="btn primary" id="csave">Lưu cài đặt</button><span class="small muted" id="cmsg">Thông báo hiện trên web/app sau tối đa 1 giờ.</span></div></div>`;
      // Gemini API: dán khóa → hệ thống kiểm tra thật với Google rồi mới lưu; chỉ hiện 4 ký tự cuối
      const g = await api('geminiStatus');
      main.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:1rem"><h3>✨ Gemini API (Google AI – gói miễn phí)</h3>
        <p class="small">${g.set ? `✅ Đang dùng khóa …${esc(g.last4)} · lưu ${when(g.at)}${g.by ? ' bởi ' + esc(g.by) : ''}` : '⚪ Chưa có khóa – AI đang dùng Cloudflare Workers AI.'}</p>
        <p class="small muted">Lấy khóa miễn phí: <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> → Create API key → dán vào đây. Dùng cho: chấm bài viết/nói, duyệt chéo bản dịch (tab Chất lượng).</p>
        <div class="tools"><input type="password" id="gkey" placeholder="Dán khóa AIza…" autocomplete="off" style="flex:1;min-width:220px"><button class="btn primary" id="gsave">Lưu & kiểm tra</button>${g.set ? '<button class="btn ghost" id="gdel">Xóa khóa</button>' : ''}<span class="small" id="gmsg"></span></div></div>`);
      $('#gsave').onclick = async () => { const key = $('#gkey').value.trim(); if (!key) return; $('#gmsg').textContent = '⏳ Đang kiểm tra với Google…'; const r = await api('geminiSet', { key }); $('#gmsg').textContent = r.ok ? `✓ Đã lưu khóa …${r.last4}` : '✗ ' + (r.error || 'lỗi'); if (r.ok) setTimeout(() => show('settings'), 900); };
      if ($('#gdel')) $('#gdel').onclick = async () => { if (confirm('Xóa khóa Gemini? AI sẽ quay về Cloudflare Workers AI.')) { await api('geminiDelete'); show('settings'); } };
      $('#csave').onclick = async () => { const values = {}; main.querySelectorAll('[name]').forEach(i => values[i.name] = i.value.trim()); await api('configSet', { values }); $('#cmsg').textContent = '✓ Đã lưu'; };
    },
  };
})();
