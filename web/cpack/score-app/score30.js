/* 🎤 Thử thách nói 30 giây + thẻ điểm + link thử thách (docs/specs/score-card.md). Route #/score (bài mới) · #/score/<id> (bạn mở link /c/<id> → làm đúng đoạn đó rồi so điểm).
 * MỘT bộ chấm: Speak.score (js/speak/score.js) → grade() chỉ đổi kết quả của nó thành lưu loát / phát âm / điểm tổng / CEFR (công thức khớp functions/api/challenge.js).
 * Thẻ ảnh 4:5 vẽ Canvas trên máy (PNG); link /c/<id> chỉ chứa mã ngẫu nhiên – điểm nằm ở D1, KHÔNG dữ liệu cá nhân trong URL. Nạp lười: App.need('score30'). */
(function (g) {
  'use strict';
  const SITE = 'https://lexkite.com', PROMPTS = [
    'I usually wake up early, drink a cup of coffee, and walk to work. On weekends I like to meet my friends and try new restaurants.',
    'Last summer I travelled to the coast with my family. We swam every morning, ate fresh fish, and watched the sunset from the beach.',
    'Learning a language takes time, but small habits make a big difference. I practise speaking for ten minutes every day.',
    'My favourite place in the city is a quiet library near the river. I go there to read, study, and think about my goals.',
    'Technology has changed the way we work. Many people now join meetings online, share documents instantly, and collaborate across countries.',
    'When I was a child, I wanted to be a pilot. Today I work in an office, but I still love watching planes take off.',
    'Healthy food does not have to be expensive. Fresh vegetables, rice, eggs, and fruit can make simple meals that give you energy.',
    'If I could change one thing about my town, I would build more parks. Green spaces make people happier and the air cleaner.',
  ];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // ---- Bộ đổi kết quả Speak.score → điểm (thuần; test scripts/test/score-card.mjs) ----
  const overall = (fl, pr) => Math.round(0.45 * fl + 0.55 * pr);
  const cefrOf = s => (s < 30 ? 'A1' : s < 45 ? 'A2' : s < 60 ? 'B1' : s < 75 ? 'B2' : s < 88 ? 'C1' : 'C2');
  /** r = kết quả Speak.score. → { fl, pr, score, cefr, words, ok } hoặc null khi không nghe được gì. */
  function grade(r) {
    if (!r || r.unclear || !r.words || !r.words.length) return null;
    const cov = clamp(+r.text || 0, 0, 1), conf = clamp(+r.conf || 0, 0, 1), wpm = (r.fluency && +r.fluency.wpm) || 0;
    const pr = Math.round(100 * clamp(0.75 * cov + 0.25 * conf, 0, 1)); // phát âm: số từ nghe đúng thứ tự + độ tin cậy của bộ nhận giọng
    const pace = clamp(100 - Math.max(0, Math.abs(wpm - 130) - 20) * 1.1, 0, 100); // nhịp: 110–150 từ/phút = tối đa, lệch càng xa càng thấp
    const fl = Math.round(pace * (0.4 + 0.6 * cov)); // lưu loát = nhịp × độ đủ ý
    const score = overall(fl, pr);
    return { fl, pr, score, cefr: cefrOf(score), words: r.words.length, ok: r.words.filter(w => w.ok).length };
  }
  const idOk = s => /^[a-hjkmnp-z2-9]{10}$/.test(s || '');
  /** Link thử thách: mã + ngôn ngữ + UTM (không dữ liệu cá nhân). */
  const linkOf = (id, lang, medium, camp) => `${SITE}/c/${id}?l=${lang || 'en'}&utm_source=share&utm_medium=${medium || 'link'}&utm_campaign=${camp || 'score30'}`; // camp: voicediary (nhật ký giọng nói, cpack/diary-app)

  g.Score30 = { PROMPTS, grade, overall, cefrOf, idOk, linkOf };
  if (typeof App === 'undefined' || !App.routes) return; // nạp trong test thuần (không có app)

  const { routes } = App, { $, esc, toast } = UI, d = document;
  const T = (k, v) => g.t(k, v), lang = () => (g.I18N && I18N.lang && I18N.lang()) || 'en';
  const ev = a => { try { navigator.sendBeacon('/api/hit', JSON.stringify({ t: 'q', ev: 'sc_' + a })); } catch (e) { /* bỏ qua */ } };
  const api = (body, again) => (async () => {
    const h = { 'Content-Type': 'application/json', 'X-Lexkite-Device': UI.dev() };
    if (body.op === 'create' && UI.humanHdr) await UI.humanHdr(h, again); // vé người thật (Turnstile) – khách chưa đăng nhập
    const r = await fetch('/api/challenge', { method: 'POST', headers: h, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (r.status === 403 && j.error === 'human' && !again && body.op === 'create') return api(body, true);
    return r.ok ? j : { error: j.error || 'net' };
  })().catch(() => ({ error: 'net' }));
  g.Score30.api = api; // dùng chung với Nhật ký giọng nói (cpack/diary-app/diary.js): tạo/đọc thẻ thách đấu cùng một chỗ
  const C = { teal: '#0F3D3E', teal2: '#17595A', coral: '#E5502F', apricot: '#FFB054', cream: '#FFF7EA', mint: '#2dd4bf' };

  // Thẻ ảnh 1080×1350 (căn giữa hết → đúng cả RTL)
  function paint(cv, s) {
    const W = 1080, H = 1350, x = cv.getContext('2d'), F = '"Inter","Noto Sans",system-ui,sans-serif';
    cv.width = W; cv.height = H;
    const bg = x.createLinearGradient(0, 0, W, H); bg.addColorStop(0, C.teal); bg.addColorStop(1, C.teal2); x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.direction = lang() === 'ar' ? 'rtl' : 'ltr';
    const tx = (t, y, size, col, wt) => { x.fillStyle = col; x.font = `${wt || 700} ${size}px ${F}`; x.fillText(t, W / 2, y); };
    tx('Lexkite', 130, 56, C.cream, 800); tx(T('Thẻ điểm nói tiếng Anh'), 190, 38, 'rgba(255,247,234,.75)', 600);
    x.lineWidth = 34; x.lineCap = 'round'; x.strokeStyle = 'rgba(255,247,234,.16)'; x.beginPath(); x.arc(W / 2, 560, 250, 0, Math.PI * 2); x.stroke();
    x.strokeStyle = C.apricot; x.beginPath(); x.arc(W / 2, 560, 250, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.score / 100); x.stroke();
    tx(String(s.score), 610, 230, C.cream, 800); tx('/100', 690, 52, 'rgba(255,247,234,.7)', 600);
    x.fillStyle = C.coral; const pw = 210; x.beginPath(); x.roundRect ? x.roundRect(W / 2 - pw / 2, 880, pw, 96, 48) : x.rect(W / 2 - pw / 2, 880, pw, 96); x.fill(); tx(s.cefr, 950, 62, '#fff', 800);
    [[T('Lưu loát'), s.fl, 1060], [T('Phát âm'), s.pr, 1170]].forEach(([l, v, y]) => {
      tx(`${l} · ${v}`, y, 40, C.cream, 700); x.fillStyle = 'rgba(255,247,234,.18)'; x.fillRect(240, y + 24, 600, 18); x.fillStyle = C.apricot; x.fillRect(240, y + 24, 6 * v, 18);
    });
    tx('lexkite.com', 1295, 40, 'rgba(255,247,234,.8)', 700);
  }
  const toBlob = cv => new Promise(r => { try { cv.toBlob(b => r(b), 'image/png'); } catch (e) { r(null); } });
  const cssOnce = () => {
    if (d.getElementById('s30-css')) return;
    const st = d.createElement('style'); st.id = 's30-css';
    st.textContent = `.s30{display:grid;gap:1rem;justify-items:center;text-align:center;padding:0 0 1rem}.s30 .txt{font-size:1.25rem;line-height:1.5;font-weight:600;max-width:34ch;margin:0}
.s30 .banner{border:2px solid var(--line,#eae1d8);border-radius:16px;padding:.7rem 1rem;font-weight:700}.s30 .cta{min-height:56px;min-width:min(100%,260px);font-weight:800;font-size:1.1rem}
.s30 .row{display:flex;gap:.6rem;flex-wrap:wrap;justify-content:center}.s30 .row .btn{min-height:48px}
.s30 canvas{width:min(78vw,340px);height:auto;aspect-ratio:4/5;border-radius:20px;box-shadow:0 14px 34px rgba(15,61,62,.25);background:${C.teal}}
.s30 .ring{position:relative;width:132px;height:132px}.s30 .ring svg{transform:rotate(-90deg)}.s30 .ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:2.2rem}
.s30 .ring circle{fill:none;stroke-width:10;stroke-linecap:round}.s30 .ring .tr{stroke:var(--line,#eae1d8)}.s30 .ring .pg{stroke:${C.coral};stroke-dasharray:314;stroke-dashoffset:0;transition:stroke-dashoffset 1s linear}
@media(prefers-reduced-motion:reduce){.s30 .ring .pg{transition:none}}.s30 .stats{display:grid;gap:.2rem;margin:0}`;
    d.head.appendChild(st);
  };
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Khung = khung chung của app (thanh trên + 5 tab + đường dẫn Kỹ năng › … do App.crumb chèn vào .page-head) – cùng trang con khác (frame-consistency); thân tự vẽ
  function frame(view, title) {
    cssOnce();
    view.innerHTML = `<div class="page-head"><div><h1>${esc(title)}</h1></div></div><div class="s30" id="s30"></div>`;
    return $('#s30', view);
  }

  routes.score = App.guard(async function (arg) {
    const view = $('#view'), id = idOk(arg) ? arg : '', title = T('Thử thách nói 30 giây');
    const box = frame(view, title); let chal = null, pid = Math.floor(Date.now() / 864e5) % PROMPTS.length;  // đoạn của ngày (cả nhà cùng một đoạn; trang ổn định cho test đua route)
    if (id) { try { const r = await App.W(fetch('/api/challenge?id=' + id)); if (r.ok) { chal = await r.json(); pid = chal.pid; } } catch (e) { /* link hỏng → bài mới */ } }
    ev(chal ? 'cstart' : 'view'); intro(box, pid, chal, id);
  });

  function intro(box, pid, chal, id) {
    box.innerHTML = `${chal ? `<p class="banner" role="status">${esc(T('Bạn của bạn đạt {s} ({c}). Vượt qua nhé!', { s: chal.score, c: chal.cefr }))}</p>` : ''}
      <p class="muted">${esc(T('Đọc to đoạn văn này trong 30 giây'))}</p><p class="txt" lang="en">${esc(PROMPTS[pid])}</p>
      <button class="btn cta" id="s30go" type="button">🎤 ${esc(T('Bắt đầu'))}</button><p class="muted" style="font-size:.85rem">${esc(T('Cần micro. Âm thanh không rời khỏi máy bạn.'))}</p>`;
    $('#s30go', box).onclick = () => listen(box, pid, chal, id);
  }

  async function listen(box, pid, chal, id) {
    let left = 30, stopped = false, tm = 0;
    const live = n => `<div class="ring" aria-hidden="true"><svg width="132" height="132" viewBox="0 0 120 120"><circle class="tr" cx="60" cy="60" r="50"/><circle class="pg" cx="60" cy="60" r="50" style="stroke-dashoffset:${Math.round(314 * (30 - n) / 30)}"/></svg><b>${n}</b></div>`;
    box.innerHTML = `<p class="txt" lang="en">${esc(PROMPTS[pid])}</p><div id="s30t">${live(left)}</div><p class="muted" role="status" aria-live="polite" id="s30s">${esc(T('Đang nghe… còn {n} giây', { n: left }))}</p><button class="btn" id="s30done" type="button">${esc(T('Xong'))}</button>`;
    const stop = () => { if (!stopped) { stopped = true; clearInterval(tm); try { g.Speak.stop(); } catch (e) { /* đã dừng */ } } };
    $('#s30done', box).onclick = stop;
    tm = setInterval(() => { left--; const t = $('#s30t', box); if (t) t.innerHTML = live(Math.max(0, left)); const s = $('#s30s', box); if (s && (left % 5 === 0 || left <= 3)) s.textContent = T('Đang nghe… còn {n} giây', { n: Math.max(0, left) }); if (left <= 0) stop(); }, 1000);
    ev(chal ? 'cstart' : 'start');
    const r = await g.Speak.score({ target: PROMPTS[pid], mode: 'free' }).catch(() => null); clearInterval(tm); stopped = true;
    if (!d.getElementById('s30')) return; // đã rời trang
    const s = grade(r);
    if (!s) { box.innerHTML = `<p class="txt">${esc(r && r.error === 'unsupported' ? T('Trình duyệt này chưa hỗ trợ nhận giọng nói. Hãy thử Chrome hoặc app Lexkite.') : T('Không nghe rõ – thử lại ở nơi yên tĩnh hơn nhé.'))}</p><button class="btn cta" id="s30re" type="button">${esc(T('Làm lại'))}</button>`; $('#s30re', box).onclick = () => intro(box, pid, chal, id); return; }
    ev(chal ? 'cdone' : 'done'); result(box, s, pid, chal, id);
  }

  function result(box, s, pid, chal, id) {
    let cmp = '';
    if (chal) { // so điểm với người gửi link
      api({ op: 'reply', id });
      cmp = `<p class="banner" role="status">${esc(s.score > chal.score ? T('Bạn thắng! {me} so với {fr}', { me: s.score, fr: chal.score }) : s.score === chal.score ? T('Hòa nhau! {me} so với {fr}', { me: s.score, fr: chal.score }) : T('Bạn của bạn hơn {n} điểm – thử lại nhé!', { n: chal.score - s.score }))}</p>`;
    }
    box.innerHTML = `${cmp}<canvas id="s30cv" role="img" aria-label="${esc(T('Điểm {s}/100, trình độ {c}', { s: s.score, c: s.cefr }))}"></canvas>
      <p class="stats"><b>${esc(T('Điểm tổng'))}: ${s.score}/100 · ${s.cefr}</b><span>${esc(T('Lưu loát'))}: ${s.fl} · ${esc(T('Phát âm'))}: ${s.pr}</span><span class="muted" style="font-size:.85rem">${esc(T('Ước lượng CEFR – chỉ mang tính tham khảo'))}</span></p>
      <div class="row"><button class="btn cta" id="s30sh" type="button">${esc(T('Thách bạn bè'))}</button><button class="btn" id="s30dl" type="button">${esc(T('Tải ảnh'))}</button><button class="btn" id="s30re" type="button">${esc(T('Làm lại'))}</button></div>${App.vdOn && !App.vdOn() ? '' : `<a class="btn ghost" href="#/diary">🎙️ ${esc(T('Nhật ký giọng nói'))}</a>`}`;
    const cv = $('#s30cv', box); paint(cv, s); let linkP = null;
    const mk = () => linkP || (linkP = api({ op: 'create', fl: s.fl, pr: s.pr, pid, lang: lang() }).then(j => { if (!j.id) { linkP = null; return ''; } return j.id; }));
    const text = u => T('Mình nói tiếng Anh được {s}/100 ({c}) trên Lexkite. Bạn hơn được không? {url}', { s: s.score, c: s.cefr, url: u });
    $('#s30dl', box).onclick = async () => { ev('dl'); const b = await toBlob(cv); if (b && g.LKFile) LKFile.save(b, 'lexkite-speaking-score.png', { share: false }); };
    $('#s30re', box).onclick = () => intro(box, chal ? pid : Math.floor(Math.random() * PROMPTS.length), chal, id); // thử thách: làm lại ĐÚNG đoạn đó; bài mới: đoạn khác
    $('#s30sh', box).onclick = async () => {
      ev('share'); const id2 = await mk(); if (!id2) return toast(T('Link thử thách không dùng được lúc này – thử lại sau.'));
      const url = linkOf(id2, lang(), 'share'), b = await toBlob(cv); let r = 'saved';
      if (b && g.LKFile) { try { r = await LKFile.save(b, 'lexkite-speaking-score.png', { share: true, title: T('Thẻ điểm nói tiếng Anh'), text: text(url) }); } catch (e) { r = 'saved'; } }
      if (r !== 'shared') try { await navigator.clipboard.writeText(text(url)); toast(T('Đã chép link thử thách – dán gửi bạn nhé')); } catch (e) { toast(url); }
    };
  }
})(typeof self !== 'undefined' ? self : globalThis);
