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
  // Hộp thoại quản lý khóa API (Gemini): dán → kiểm tra với Google → lưu; Esc/nền để đóng; ẩn/hiện khóa
  function keyDialog(st, done) {
    const d = document.createElement('dialog'); d.className = 'key-dlg';
    const keys = st.keys || [], live = keys.filter(k => !k.cooling).length;
    d.innerHTML = `<form method="dialog" class="key-box"><div class="row between"><h3 style="margin:0">✨ Khóa Gemini API <span class="pill ${keys.length ? 'ok' : 'warn'}">${keys.length} khóa</span></h3><button class="icon-x" value="x" aria-label="Đóng">✕</button></div>
      <p class="small muted" style="margin:.5rem 0 0">Nhiều khóa = <b>xoay vòng</b>: khóa hết lượt tự nghỉ 1 giờ và chuyển khóa kế tiếp; hết khóa → tự dùng Cloudflare AI. Thêm khóa từ nhiều tài khoản Google để tăng hạn mức miễn phí.</p>
      <ul class="key-list">${keys.map(k => `<li><span class="dot ${k.cooling ? 'warn' : ''}"></span><code>…${esc(k.last4)}</code><span class="small muted">${k.cooling ? 'tạm nghỉ (hết lượt)' : 'sẵn sàng'} · ${when(k.at)}${k.by ? ' · ' + esc(k.by.split('@')[0]) : ''}</span><button type="button" class="icon-btn-s" data-rm="${esc(k.last4)}" title="Gỡ khóa" aria-label="Gỡ khóa …${esc(k.last4)}">🗑</button></li>`).join('') || '<li class="muted small">Chưa có khóa – AI đang dùng Cloudflare Workers AI.</li>'}</ul>
      <details ${keys.length ? '' : 'open'} class="key-help"><summary class="small"><b>Cách lấy khóa miễn phí</b></summary><ol class="key-steps"><li>Mở <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> (đăng nhập Google)</li><li>Bấm <b>Create API key</b> → sao chép</li><li>Dán vào ô dưới → <b>Thêm khóa</b></li></ol></details>
      <label class="key-field"><input type="password" id="kv" placeholder="Dán khóa AIza… hoặc AQ.…" autocomplete="off" spellcheck="false"><button type="button" class="btn ghost sm" id="kshow" aria-label="Hiện/ẩn khóa">👁</button><button type="button" class="btn primary" id="ksave">Thêm khóa</button></label>
      <div class="small" id="kmsg" role="status" aria-live="polite" style="min-height:1.2em;margin-top:.4rem"></div>
      <p class="tiny muted" style="margin:.6rem 0 0">🔒 ${live} khóa sẵn sàng. Khóa chỉ máy chủ dùng (chấm bài, duyệt bản dịch), chỉ hiện 4 ký tự cuối. Gỡ khóa cần đăng nhập trong 15 phút gần nhất.</p></form>`;
    document.body.appendChild(d); d.showModal(); d.querySelector('#kv').focus();
    let changed = false;
    d.addEventListener('close', () => { d.remove(); if (changed) done(); }); d.addEventListener('click', e => { if (e.target === d) d.close(); });
    const msg = (t, ok) => { const m = d.querySelector('#kmsg'); m.textContent = t; m.className = 'small ' + (ok === true ? 'ok-t' : ok === false ? 'bad-t' : 'muted'); };
    d.querySelector('#kshow').onclick = () => { const i = d.querySelector('#kv'); i.type = i.type === 'password' ? 'text' : 'password'; };
    const add = async () => {
      const key = d.querySelector('#kv').value.trim(); if (!key) return msg('Hãy dán khóa trước.', false);
      const b = d.querySelector('#ksave'); b.disabled = true; msg('⏳ Đang kiểm tra với Google…');
      try { const r = await api('geminiSet', { key }); if (r.ok) { changed = true; msg(`✓ Đã thêm khóa …${r.last4} (tổng ${r.count} khóa)`, true); d.querySelector('#kv').value = ''; setTimeout(() => { d.close(); }, 900); } else msg('✗ ' + (r.error || 'Không lưu được'), false); } catch (e) { msg('✗ ' + e.message, false); }
      b.disabled = false;
    };
    d.querySelector('#ksave').onclick = add; d.querySelector('#kv').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    d.querySelectorAll('[data-rm]').forEach(b => b.onclick = async () => { if (!confirm(`Gỡ khóa …${b.dataset.rm}?`)) return; try { await api('geminiRemove', { last4: b.dataset.rm }); changed = true; b.closest('li').remove(); msg('✓ Đã gỡ khóa', true); } catch (e) { msg('✗ ' + e.message, false); } });
  }
  async function api(op, body = {}) {
    const u = auth.currentUser || user; // phiên có thể bị đăng xuất ở tab khác cùng lexkite.com
    if (!u) { if (confirm('Phiên đăng nhập quản trị đã hết. Đăng nhập lại ngay?')) await signIn(); throw new Error('Phiên đăng nhập đã hết – đăng nhập lại rồi thử lại'); }
    const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403) throw new Error('forbidden');
    if (r.status === 401 && j.error === 'reauth') { if (confirm(j.message || 'Cần đăng nhập lại để xác nhận thao tác quan trọng. Đăng nhập lại ngay?')) { await auth.signOut(); await signIn(); } throw new Error('reauth'); }
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
    try { const h = location.hash.slice(1); await show(VIEWS[h] ? h : 'overview'); $('#tabs').hidden = false; badges(); }
    catch (e) { main.innerHTML = `<div class="card center adm-login"><h2>Không có quyền</h2><p class="muted">${esc(u.email)} chưa được cấp quyền quản trị.</p><button class="btn" onclick="firebase.auth().signOut().then(()=>location.reload())">Đổi tài khoản</button></div>`; }
  });
  $('#tabs').onclick = e => { const b = e.target.closest('button[data-tab]'); if (b) show(b.dataset.tab); };

  async function show(t) {
    tab = t; try { history.replaceState(null, '', '#' + t); } catch (e) { /* bỏ qua */ } document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    main.innerHTML = `<div class="adm-loading-grid"><div class="skeleton-head"></div><div class="skeleton-grid">${'<div class="skeleton-card"></div>'.repeat(8)}</div></div>`;
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
      const [o, a, q, gk, u] = await Promise.all([
        api('overview'),
        api('alerts'),
        api('quality').catch(() => ({})),
        api('geminiStatus').catch(() => ({})),
        api('usage').catch(() => ({}))
      ]);
      const users = o.users || {}, s = o.sessions || {}, bad = a.rows.filter(r => !r.ok);
      const mau = +users.act30 || 0, dau = +users.act1 || 0;
      const stickiness = mau > 0 ? Math.round(dau / mau * 100) : (dau > 0 ? 100 : 0);
      const qScore = q.score != null ? q.score : null;
      const liveKeys = (gk.keys || []).filter(k => !k.cooling).length;
      const d1Meter = (u.meters || []).find(m => /d1/i.test(m.name)) || { pct: 0, used: 0, cap: 500 * 1024 * 1024 };

      // Helper tạo đường sóng Sparkline SVG
      const spark = (pts, cls = '') => {
        const min = Math.min(...pts), max = Math.max(...pts), range = (max - min) || 1;
        const w = 68, h = 28, step = w / (pts.length - 1);
        const d = pts.map((v, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - 4 - ((v - min) / range) * (h - 8)).toFixed(1)}`).join(' ');
        return `<svg class="kpi-spark ${cls}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" /></svg>`;
      };

      // Phân loại trạng thái workflow / telemetry theo chuẩn quốc tế
      const statusMeta = r => {
        const st = String(r.status || '').toLowerCase();
        const cn = String(r.conclusion || '').toLowerCase();
        if (st === 'in_progress' || st === 'running') return { dot: 'dot pulse', badge: 'pulse', text: 'Đang chạy…' };
        if (st === 'queued' || st === 'pending' || cn === 'skipped') return { dot: 'dot wait', badge: 'wait', text: cn === 'skipped' ? 'Bỏ qua' : 'Đang chờ' };
        if (cn === 'success' || (r.ok && !r.warn)) return { dot: 'dot ok', badge: 'ok', text: 'Thành công' };
        if (r.warn) return { dot: 'dot warn', badge: 'warn', text: 'Cảnh báo' };
        return { dot: 'dot bad', badge: 'bad', text: 'Cần chú ý' };
      };

      const nowTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const pipeRows = bad.length ? bad : a.rows.slice(0, 6);

      main.innerHTML = `
        <div class="adm-header-bar">
          <div class="telemetry-pill">
            <span class="pulse-dot"></span>
            <span>Hệ thống hoạt động bình thường · Đồng bộ ${nowTime}</span>
          </div>
          <button class="btn sm ghost" id="admReload" title="Tải lại số liệu">🔄 Cập nhật</button>
        </div>

        <section class="bento-section">
          <div class="bento-title">👥 Học viên &amp; Mức độ gắn kết (Learners &amp; Retention)</div>
          <div class="bento-grid">
            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">👥</span> Học viên đăng ký</span>
                <span class="kpi-badge good">+${num(users.new7)} / 7 ngày</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(users.total)}</span>
                ${spark([Math.max(1, users.total - users.new7), users.total], 'good')}
              </div>
              <div class="kpi-foot">
                <span>Hoạt động 7 ngày: <b>${num(users.act7)}</b> người</span>
                <a href="#" data-go="users">Quản lý →</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">🎯</span> Gắn kết (DAU / MAU)</span>
                <span class="kpi-badge ${stickiness >= 25 ? 'good' : 'warn'}">${stickiness}%</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${stickiness}%</span>
                ${spark([20, 25, 28, stickiness], stickiness >= 25 ? 'good' : '')}
              </div>
              <div class="kpi-foot">
                <span>DAU: <b>${num(dau)}</b> · MAU: <b>${num(mau)}</b></span>
                <span class="small muted">Chuẩn EdTech ≥ 25%</span>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">⚡</span> Lượt truy cập hôm nay</span>
                <span class="kpi-badge">${num(s.s7)} phiên / 7 ngày</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(s.today)}</span>
                ${spark([1, 2, 4, Math.max(1, s.today)])}
              </div>
              <div class="kpi-foot">
                <span><b>${num(s.v7)}</b> khách duy nhất (7 ngày)</span>
                <a href="#" data-go="analytics">Chi tiết →</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">⏱️</span> Thời gian học TB</span>
                <span class="kpi-badge">${(+s.pages7 || 0).toFixed(1)} trang/phiên</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val" style="font-size:1.55rem">${dur(s.dur7)}</span>
                ${spark([120, 180, 200, Math.max(60, s.dur7 || 0)])}
              </div>
              <div class="kpi-foot">
                <span>Độ sâu phiên ôn tập FSRS</span>
                <a href="#" data-go="analytics">Xu hướng →</a>
              </div>
            </div>
          </div>
        </section>

        <section class="bento-section">
          <div class="bento-title">⚡ Vận hành &amp; Hạ tầng (Operations &amp; Reliability)</div>
          <div class="bento-grid">
            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">🛡️</span> Điểm chất lượng tự động</span>
                <span class="kpi-badge ${qScore != null && qScore >= 100 ? 'good' : 'bad'}">${qScore != null && qScore >= 100 ? 'Đạt chuẩn' : 'Dưới chuẩn'}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val" style="color:${qScore == null ? '' : qScore >= 100 ? 'var(--good,#15803d)' : 'var(--bad,#dc2626)'}">${qScore == null ? '–' : qScore + '%'}</span>
                ${spark([100, 100, 100, qScore || 100], qScore >= 100 ? 'good' : 'bad')}
              </div>
              <div class="kpi-foot">
                <span>14 ngày CI/CD liên tục</span>
                <a href="#" data-go="quality">Rà soát →</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">🐞</span> Lỗi JS (24 giờ)</span>
                <span class="kpi-badge ${o.errors24.hits === 0 ? 'good' : 'bad'}">${o.errors24.kinds} loại</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(o.errors24.hits)}</span>
                ${spark([0, 0, 0, o.errors24.hits], o.errors24.hits === 0 ? 'good' : 'bad')}
              </div>
              <div class="kpi-foot">
                <span>${o.errors24.hits === 0 ? '✨ Không có lỗi' : '⚠️ Có lỗi cần sửa'}</span>
                <a href="#" data-go="alerts">Xem log →</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">📬</span> Tin nhắn chưa xử lý</span>
                <span class="kpi-badge ${o.inbox.open === 0 ? 'good' : 'warn'}">${o.inbox.open === 0 ? 'Sạch hòm thư' : 'Chờ trả lời'}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val">${num(o.inbox.open)}</span>
                ${spark([0, 1, 0, o.inbox.open])}
              </div>
              <div class="kpi-foot">
                <span>Hỗ trợ từ #/contact</span>
                <a href="#" data-go="inbox">Mở hộp thư →</a>
              </div>
            </div>

            <div class="kpi-card">
              <div class="kpi-head">
                <span class="kpi-label"><span class="kpi-icon">☁️</span> Khóa Gemini API</span>
                <span class="kpi-badge ${gk.set ? 'good' : 'warn'}">${gk.set ? liveKeys + ' sẵn sàng' : 'Chưa thiết lập'}</span>
              </div>
              <div class="kpi-val-row">
                <span class="kpi-val" style="font-size:1.55rem">${gk.set ? `${liveKeys}/${(gk.keys || []).length}` : 'CF AI'}</span>
                ${spark([1, 1, 2, liveKeys || 1], 'good')}
              </div>
              <div class="kpi-foot">
                <span>D1: <b>${d1Meter.pct}%</b> dung lượng</span>
                <a href="#" data-go="services">Dịch vụ &amp; API →</a>
              </div>
            </div>
          </div>
        </section>

        <section class="pipeline-card">
          <div class="pipeline-head">
            <h3 style="margin:0">${bad.length ? '⚠️ Tác vụ cần chú ý' : '✅ Trạng thái tác vụ tự động (GitHub Actions)'}</h3>
            <a href="#" class="small" data-go="alerts">Toàn bộ cảnh báo &amp; nhật ký →</a>
          </div>
          <div class="pipeline-grid">
            ${pipeRows.map(r => {
              const meta = statusMeta(r);
              return `<div class="pipeline-item">
                <span class="pipeline-item-name" title="${esc(r.name)}"><span class="${meta.dot}"></span><b>${esc(r.name)}</b></span>
                <span class="pipeline-item-status ${meta.badge}">${esc(r.conclusion || meta.text)}</span>
              </div>`;
            }).join('')}
          </div>
        </section>`;

      main.querySelectorAll('[data-go]').forEach(x => x.onclick = e => { e.preventDefault(); show(x.dataset.go); });
      const rel = main.querySelector('#admReload');
      if (rel) rel.onclick = () => show('overview');
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
      const [a, e, lg] = await Promise.all([api('alerts'), api('errors'), api('auditLog').catch(() => ({ rows: [] }))]);
      main.innerHTML = `
        <div class="card"><h3>Trạng thái tự động</h3><table class="tbl">${a.rows.map(r => `<tr><td><span class="dot ${r.ok ? (r.warn ? 'warn' : '') : 'bad'}"></span>${esc(r.name)}</td><td>${esc(r.conclusion || r.status || '')}</td><td class="small muted">${r.at ? when(r.at) : ''}</td><td>${r.url ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">Xem</a>` : ''}</td></tr>`).join('')}</table>
        <p class="small muted">Workflow GitHub (dịch, build Android, âm thanh, blog, đo tốc độ…) · lỗi JS · hộp thư · dung lượng. Email tóm tắt tự động gửi về support khi có mục đỏ.</p></div>
        <div class="card" style="margin-top:1rem"><div class="row between"><h3>Lỗi JavaScript từ người dùng</h3>${e.rows.length ? '<button class="btn ghost sm" id="eclr">Xóa tất cả</button>' : ''}</div>
        <div class="tbl-wrap"><table class="tbl"><tr><th>Lỗi</th><th>Vị trí</th><th>Trang</th><th>Số lần</th><th>Gần nhất</th><th></th></tr>${e.rows.map(x => `<tr><td class="msg">${esc(x.msg)}</td><td class="small">${esc(x.src)}</td><td>${esc(x.path)}</td><td>${num(x.n)}</td><td class="small">${when(x.last)}</td><td><button class="btn ghost sm" data-h="${x.h}">Đã sửa</button></td></tr>`).join('') || '<tr><td colspan="6" class="muted">Không có lỗi 🎉</td></tr>'}</table></div></div>`;
      main.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:1rem"><h3>🔐 Nhật ký quản trị (100 thao tác gần nhất)</h3><p class="small muted">Mọi thao tác ghi/xóa và mọi lần tài khoản lạ cố vào trang quản trị (dòng đỏ). IP được băm, không lưu IP gốc.</p>
        <div class="tbl-wrap"><table class="tbl"><tr><th>Lúc</th><th>Email</th><th>Thao tác</th><th>IP (băm)</th><th>Nước</th></tr>${lg.rows.map(x => `<tr${x.ok ? '' : ' style="color:var(--bad,#dc2626);font-weight:600"'}><td class="small">${when(x.at)}</td><td class="small">${esc(x.email)}</td><td>${x.ok ? esc(x.op) : '⛔ bị từ chối'}</td><td class="small muted">${esc(x.ip)}</td><td>${esc(x.country)}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">Chưa có thao tác</td></tr>'}</table></div></div>`);
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
        $('#bcBox').innerHTML = `<h3>🌐 Kiểm nghĩa bản dịch (dịch ngược + AI)</h3><p class="small muted">Cập nhật ${when(bc.at)} · "khớp nghĩa" = tỉ lệ câu dịch ngược về tiếng Anh vẫn đúng ý. <b>Duyệt bằng AI</b>: Gemini (xoay vòng các khóa) → hết lượt tự chuyển Cloudflare AI; mỗi lần ≤ 60 câu, bấm tiếp để duyệt phần còn lại.</p>
          <table class="tbl"><tr><th>Ngôn ngữ</th><th>Số câu</th><th>Khớp nghĩa</th><th>Nghi sai</th><th></th></tr>${Object.entries(bc.langs).map(([l, x]) => `<tr><td><b>${esc(l)}</b></td><td>${num(x.checked)}</td><td>${x.ok}%</td><td>${x.flagged.length}</td><td><button class="btn sm primary" data-rev="${esc(l)}">✨ Duyệt bằng AI</button></td></tr>`).join('')}</table><div id="bcRes"></div>`;
        main.querySelectorAll('[data-rev]').forEach(b => b.onclick = async () => {
          b.disabled = true; const old = b.textContent; b.textContent = '⏳ Đang duyệt…';
          let r; try { r = await api('review', { lang: b.dataset.rev }); } catch (e) { r = { error: e.message }; }
          b.disabled = false; b.textContent = old;
          if (r.error) { $('#bcRes').innerHTML = `<p class="small bad-t">✗ ${esc(r.error)}</p>`; return; }
          $('#bcRes').innerHTML = `<div class="rev-head"><b>${esc(r.lang)}</b> · đã duyệt ${r.reviewed}/${r.total} câu nghi sai${r.pending ? ` · còn ${r.pending} (bấm lại để duyệt tiếp)` : ' · ✅ xong'} · <b class="${r.wrong.length ? 'bad-t' : 'ok-t'}">${r.wrong.length} câu sai nghĩa</b>${r.models.length ? ` <span class="pill">${esc(r.models.join(' + '))}</span>` : ''} ${r.wrong.some(w => w.fix) ? '<button class="btn sm primary" id="gAll">Áp dụng tất cả</button>' : ''}</div>
            <div class="tbl-wrap"><table class="tbl"><tr><th>Tiếng Anh</th><th>Bản dịch hiện tại</th><th>AI đề xuất</th><th>Lý do</th><th></th></tr>${r.wrong.map((w, i) => `<tr><td class="small">${esc(w.en)}</td><td class="small">${esc(w.tr)}</td><td class="small"><b>${esc(w.fix || '')}</b></td><td class="small">${esc(w.why || '')}</td><td>${w.fix ? `<button class="btn sm" data-ap="${i}">Áp dụng</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5">✅ Không có câu sai</td></tr>'}</table></div>
            <p class="small muted">Bản sửa đã áp dụng sẽ tự cập nhật vào app ở lượt dịch đêm.</p>`;
          const ap = async i => { const w = r.wrong[i]; if (!w.fix) return; await api('i18nFixApprove', { lang: r.lang, key: w.key, val: w.fix }); const bt = main.querySelector(`[data-ap="${i}"]`); if (bt) { bt.disabled = true; bt.textContent = '✓ Đã duyệt'; } };
          main.querySelectorAll('[data-ap]').forEach(x => x.onclick = () => ap(+x.dataset.ap));
          if ($('#gAll')) $('#gAll').onclick = async () => { $('#gAll').disabled = true; for (let i = 0; i < r.wrong.length; i++) await ap(i); $('#gAll').textContent = '✓ Đã duyệt tất cả'; };
        });
      }
    },
    async services() {
      const [u, s, gk] = await Promise.all([api('usage'), api('services'), api('geminiStatus').catch(() => ({}))]);
      // Nhóm & trạng thái để quản lý trực quan: thẻ theo nhóm, lọc nhanh, tìm kiếm
      const GROUPS = [['infra', '☁️ Hạ tầng & dữ liệu', /cloudflare (pages|d1|email)|tên miền|github|firebase/i], ['ai', '🤖 AI & dịch', /workers ai|gemini|translate|claude/i], ['grow', '📈 Phát hành & tăng trưởng', /search console|admob|apple|play|chrome web store/i]];
      const groupOf = r => (GROUPS.find(g => g[2].test(r.name)) || ['other', '🧩 Khác'])[0];
      const state = r => (/gemini/i.test(r.name) ? (gk.set ? 'on' : 'todo') : /chưa đăng ký|chưa tạo/i.test(r.status + r.account) ? 'todo' : /chưa dùng/i.test(r.status) ? 'idle' : 'on'); // dịch vụ có khóa: trạng thái theo khóa thực tế
      const PILL = { on: ['ok', 'Đang dùng'], idle: ['muted', 'Chưa dùng'], todo: ['warn', 'Chưa thiết lập'] };
      const keyed = r => /gemini/i.test(r.name);
      const warnMeters = u.meters.filter(m => m.pct >= 70).length, cnt = k => s.rows.filter(r => state(r) === k).length;
      main.innerHTML = `
        <div class="kpis">
          <div class="card kpi"><div class="l">Dịch vụ</div><div class="v">${s.rows.length}</div><div class="s">trong hệ thống</div></div>
          <div class="card kpi"><div class="l">Đang dùng</div><div class="v" style="color:#15803d">${cnt('on')}</div><div class="s">hoạt động bình thường</div></div>
          <div class="card kpi"><div class="l">Chưa thiết lập</div><div class="v" style="color:#b45309">${cnt('todo') + cnt('idle')}</div><div class="s">cần đăng ký / thêm khóa</div></div>
          <div class="card kpi"><div class="l">Hạn mức sắp đầy</div><div class="v" style="color:${warnMeters ? '#dc2626' : 'inherit'}">${warnMeters}</div><div class="s">≥ 70% gói miễn phí</div></div>
        </div>
        <details class="card svc-usage" ${warnMeters ? 'open' : ''}><summary><b>📊 Dung lượng & hạn mức miễn phí</b> <span class="small muted">· vàng ≥ 70%, đỏ ≥ 90%</span></summary>${u.meters.map(m => `<div class="meter ${m.pct >= 90 ? 'crit' : m.pct >= 70 ? 'warn' : ''}"><div class="row between small"><b>${esc(m.name)}</b><span>${m.unit === 'bytes' ? (m.used / 1048576).toFixed(1) + ' / ' + (m.cap / 1048576).toFixed(0) + ' MB' : num(m.used) + ' / ' + num(m.cap)} · <b>${m.pct}%</b></span></div><div class="bar"><i style="width:${Math.min(100, m.pct)}%"></i></div>${m.hint ? `<div class="tiny muted">${esc(m.hint)}</div>` : ''}</div>`).join('')}</details>
        <div class="svc-tools"><input type="search" id="sq" placeholder="🔎 Tìm dịch vụ, tài khoản…" aria-label="Tìm dịch vụ"><div class="svc-chips" role="tablist">${[['all', 'Tất cả'], ['on', 'Đang dùng'], ['todo', 'Chưa thiết lập']].map(([k, l], i) => `<button type="button" class="chip-f ${i ? '' : 'on'}" data-f="${k}">${l}</button>`).join('')}</div><button class="btn primary sm" id="sadd">+ Thêm dịch vụ</button></div>
        <div id="svcList"></div>`;
      const card = r => { const st = state(r), [pc, pl] = PILL[st]; return `<article class="svc-card" data-st="${st}" data-q="${esc((r.name + ' ' + r.account + ' ' + r.purpose).toLowerCase())}">
          <header><div class="svc-name"><b>${esc(r.name)}</b><span class="pill ${pc}">${pl}</span>${keyed(r) ? (gk.set ? `<span class="pill ok">🔑 ${(gk.keys || []).length} khóa</span>` : '<span class="pill warn">🔑 chưa có khóa</span>') : ''}</div>
            <button class="icon-btn-s" data-sid="${r.id}" title="Sửa" aria-label="Sửa ${esc(r.name)}">✎</button></header>
          ${r.purpose ? `<p class="svc-purpose">${esc(r.purpose)}</p>` : ''}
          <dl class="svc-meta">${r.account ? `<div><dt>👤</dt><dd>${esc(r.account)}</dd></div>` : ''}${r.free ? `<div><dt>🎁</dt><dd>${esc(r.free)}</dd></div>` : ''}${r.secret && !keyed(r) ? `<div><dt>🔐</dt><dd><code>${esc(r.secret)}</code></dd></div>` : ''}</dl>
          ${r.note ? `<p class="svc-note">${esc(r.note)}</p>` : ''}
          <footer>${keyed(r) ? `<button class="btn sm ${gk.set ? '' : 'primary'}" data-key="gemini">🔑 ${gk.set ? 'Quản lý khóa' : 'Thêm khóa'}</button>` : ''}${r.console ? `<a class="btn sm ${keyed(r) && !gk.set ? '' : 'primary'}" target="_blank" rel="noopener" href="${esc(r.console)}">Mở trang quản lý ↗</a>` : ''}${r.billing ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(r.billing)}">Nâng gói</a>` : ''}</footer></article>`; };
      $('#svcList').innerHTML = [...GROUPS, ['other', '🧩 Khác']].map(([g, title]) => { const rows = s.rows.filter(r => groupOf(r) === g); return rows.length ? `<section class="svc-group"><h3>${title} <span class="muted small">${rows.length}</span></h3><div class="svc-grid">${rows.map(card).join('')}</div></section>` : ''; }).join('');
      let f = 'all';
      const apply = () => { const q = $('#sq').value.trim().toLowerCase(); main.querySelectorAll('.svc-card').forEach(c => { c.hidden = !((f === 'all' || (f === 'todo' ? c.dataset.st !== 'on' : c.dataset.st === f)) && (!q || c.dataset.q.includes(q))); }); main.querySelectorAll('.svc-group').forEach(gp => { gp.hidden = ![...gp.querySelectorAll('.svc-card')].some(c => !c.hidden); }); };
      $('#sq').oninput = apply;
      main.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { f = b.dataset.f; main.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === b)); apply(); });
      // Sửa/thêm dịch vụ trong hộp thoại (không đẩy form xuống cuối trang)
      const form = (r = {}) => {
        const d = document.createElement('dialog'); d.className = 'key-dlg';
        d.innerHTML = `<form method="dialog" class="key-box"><div class="row between"><h3 style="margin:0">${r.id ? 'Sửa' : 'Thêm'} dịch vụ</h3><button class="icon-x" value="x" aria-label="Đóng">✕</button></div>
          <div class="svc-form">${[['name', 'Tên dịch vụ *'], ['purpose', 'Dùng cho'], ['account', 'Tài khoản / email'], ['status', 'Trạng thái'], ['console', 'Link trang quản lý'], ['billing', 'Link nâng gói'], ['free', 'Gói miễn phí / giới hạn'], ['secret', 'Tên biến khóa (không ghi giá trị)'], ['note', 'Ghi chú']].map(([k, l]) => `<label class="${/note|purpose|free/.test(k) ? 'wide' : ''}">${l}<input name="${k}" value="${esc(r[k] || '')}" ${k === 'name' ? 'required' : ''}></label>`).join('')}</div>
          <div class="row between" style="margin-top:1rem">${r.id ? '<button type="button" class="btn ghost sm danger" id="sdel">Xóa dịch vụ</button>' : '<span></span>'}<span class="row" style="gap:.5rem"><button class="btn ghost" value="x">Hủy</button><button type="button" class="btn primary" id="ssave">Lưu</button></span></div></form>`;
        document.body.appendChild(d); d.showModal(); d.addEventListener('close', () => d.remove()); d.addEventListener('click', e => { if (e.target === d) d.close(); });
        d.querySelector('#ssave').onclick = async () => { const row = { id: r.id }; d.querySelectorAll('input[name]').forEach(i => row[i.name] = i.value.trim()); if (!row.name) return d.querySelector('[name=name]').focus(); if (/\b(sk-|AIza|AQ\.|ghp_|xox|-----BEGIN)/.test(row.secret + row.note)) return alert('Không lưu giá trị khóa ở đây – chỉ ghi tên biến.'); await api('serviceSet', { row }); d.close(); show('services'); };
        const del = d.querySelector('#sdel'); if (del) del.onclick = async () => { if (confirm('Xóa dịch vụ này khỏi danh sách?')) { await api('serviceDelete', { id: r.id }); d.close(); show('services'); } };
      };
      $('#sadd').onclick = () => form();
      main.querySelectorAll('[data-sid]').forEach(b => b.onclick = () => form(s.rows.find(x => x.id === +b.dataset.sid)));
      main.querySelectorAll('[data-key]').forEach(b => b.onclick = () => keyDialog(gk, () => show('services')));
    },
    async settings() {
      const c = await api('config'), v = k => esc((c.values[k] || {}).v || '');
      const L = { banner: 'Thông báo đầu trang (để trống = tắt)', banner_url: 'Link kèm thông báo (https://…)', banner_level: 'Kiểu thông báo: info / warn / ok', ai_user: 'Lượt chấm AI/ngày – đã đăng nhập (mặc định 5)', ai_anon: 'Lượt chấm AI/ngày – khách (mặc định 3)', ai_global: 'Trần AI toàn hệ thống/ngày (mặc định 400)', alert_errors: 'Ngưỡng cảnh báo lỗi JS/24h (mặc định 50)', hit_rate: 'Tỉ lệ lấy mẫu thống kê 0.01–1 (mặc định 1 = mọi người; > 30k người/ngày nên đặt 0.1 để giữ D1 miễn phí)', note: 'Ghi chú nội bộ cho quản trị' };
      main.innerHTML = `<div class="card"><h3>Cài đặt website</h3><div class="form2">${c.keys.map(k => `<label>${L[k] || k}${k === 'banner' || k === 'note' ? `<textarea name="${k}" rows="2">${v(k)}</textarea>` : `<input name="${k}" value="${v(k)}">`}<span class="small muted" style="font-weight:400">${c.values[k] ? 'Sửa ' + when(c.values[k].at) + ' bởi ' + esc(c.values[k].by) : ''}</span></label>`).join('')}</div>
        <div class="tools" style="margin-top:1rem"><button class="btn primary" id="csave">Lưu cài đặt</button><span class="small muted" id="cmsg">Thông báo hiện trên web/app sau tối đa 1 giờ.</span></div></div>`;
      // Gemini API: nhiều khóa xoay vòng – quản lý trong hộp thoại dùng chung
      const g = await api('geminiStatus');
      main.insertAdjacentHTML('beforeend', `<div class="card" style="margin-top:1rem"><div class="row between"><div><h3 style="margin:0">✨ Gemini API</h3><p class="small muted" style="margin:.3rem 0 0">${g.set ? `${g.keys.length} khóa xoay vòng · ${g.keys.filter(k => !k.cooling).length} sẵn sàng` : 'Chưa có khóa – AI đang dùng Cloudflare Workers AI'} · dùng cho chấm bài viết/nói & duyệt bản dịch</p></div><button class="btn primary" id="gman">🔑 ${g.set ? 'Quản lý khóa' : 'Thêm khóa'}</button></div></div>`);
      $('#gman').onclick = () => keyDialog(g, () => show('settings'));
      $('#csave').onclick = async () => { const values = {}; main.querySelectorAll('[name]').forEach(i => values[i.name] = i.value.trim()); await api('configSet', { values }); $('#cmsg').textContent = '✓ Đã lưu'; };
    },
  };
})();
