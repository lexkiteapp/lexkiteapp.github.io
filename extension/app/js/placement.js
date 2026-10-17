/* 🧭 Kiểm tra đầu vào (#/placement) – tải lười (app.js BUNDLES.placement, cùng gói 'words' + 'grammar').
   • Thích ứng: 20 câu xen kẽ Từ vựng / Ngữ pháp; độ khó câu kế tiếp theo năng lực ước tính của TỪNG kỹ năng (A2 → C1).
   • Ước tính trung thực: mô hình IRT 3 tham số rút gọn (độ khó = cấp CEFR, đoán mò c = 1/số phương án) + tiên nghiệm yếu,
     tính trung bình hậu nghiệm (EAP) và độ lệch → hiện KHOẢNG band (≈ 68 %), không giả vờ chính xác tới 0,5 band từ 20 câu.
   • "Tôi không biết" = không biết (không đoán) → cùng mức thông tin như trả lời sai, KHÔNG bị phạt thêm; đoán trúng chỉ được tính một phần.
   • Kết quả lưu settings.placement (đồng bộ) → Kế hoạch hôm nay (plan.js) thêm bài cho kỹ năng yếu, Lộ trình (path.js) mở từ chặng gợi ý.
   Không gọi t() lúc nạp module. */
(function () {
  const g = typeof window !== 'undefined' ? window : globalThis;
  const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  const B = { A1: -0.7, A2: 0, B1: 1, B2: 2, C1: 3, C2: 3.7 }; // độ khó (logit) theo cấp CEFR
  const LADDER = ['A2', 'B1', 'B2', 'C1'];
  const A = 1.7, MU = 1.5, SD = 1.2, N = 20;
  const sig = x => 1 / (1 + Math.exp(-x));
  // resp: [{ kind, lv, r: 'right' | 'wrong' | 'idk', c }] → { theta, se } (EAP trên lưới −2…5)
  function posterior(resp) {
    const pts = []; let max = -Infinity;
    for (let k = 0; k <= 350; k++) {
      const th = -2 + k * 0.02; let l = -((th - MU) ** 2) / (2 * SD * SD);
      for (const r of resp) {
        const p = sig(A * (th - (B[r.lv] != null ? B[r.lv] : 1))), c = r.c == null ? 0.25 : r.c;
        l += Math.log(r.r === 'right' ? c + (1 - c) * p : r.r === 'wrong' ? (1 - c) * (1 - p) : 1 - p);
      }
      pts.push([th, l]); if (l > max) max = l;
    }
    let sw = 0, s1 = 0, s2 = 0;
    for (const [th, l] of pts) { const w = Math.exp(l - max); sw += w; s1 += w * th; s2 += w * th * th; }
    const m = s1 / sw; return { theta: m, se: Math.sqrt(Math.max(0, s2 / sw - m * m)) };
  }
  // θ = 1 ↔ trả lời đúng 50 % câu B1 … Ánh xạ CEFR ↔ IELTS (Cambridge): B1 ≈ 4.0–5.0, B2 ≈ 5.5–6.5, C1 ≈ 7.0–8.0
  const bandOf = th => Math.min(8.5, Math.max(3, Math.round((2.25 + 1.5 * th) * 2) / 2));
  const cefrOf = b => (b < 4 ? 'A2' : b < 5.5 ? 'B1' : b < 7 ? 'B2' : b < 8.5 ? 'C1' : 'C2');
  const stageOf = b => (b <= 5 ? 's0' : b <= 6 ? 's1' : b <= 6.5 ? 's2' : 's3');
  const f1 = b => b.toFixed(1);
  function estimate(resp) {
    const all = posterior(resp), v = posterior(resp.filter(r => r.kind === 'vocab')), gr = posterior(resp.filter(r => r.kind === 'grammar'));
    const band = bandOf(all.theta), lo = Math.min(band, bandOf(all.theta - all.se)), hi = Math.max(band, bandOf(all.theta + all.se));
    const skill = p => { const b = bandOf(p.theta); return { band: b, cefr: cefrOf(b), theta: +p.theta.toFixed(2) }; };
    const vs = skill(v), gs = skill(gr);
    return {
      band: f1(band), lo: f1(lo), hi: f1(hi), range: lo === hi ? f1(band) : `${f1(lo)}–${f1(hi)}`,
      theta: +all.theta.toFixed(2), se: +all.se.toFixed(2), vocab: vs, grammar: gs,
      weak: v.theta <= gr.theta ? 'vocab' : 'grammar', stage: stageOf(band), n: resp.length,
      right: resp.filter(r => r.r === 'right').length, idk: resp.filter(r => r.r === 'idk').length,
    };
  }
  // Chọn cấp câu kế tiếp: hơi dưới năng lực hiện tại (ổn định với 20 câu, bắt đầu ở B1)
  const nextLevel = resp => LADDER[Math.min(LADDER.length - 1, Math.max(0, Math.round(posterior(resp).theta - 0.2)))];
  // Lấy 1 mục chưa dùng ở cấp gần nhất với cấp mong muốn
  function take(pool, lv, used, rnd) {
    const want = LADDER.indexOf(lv);
    for (let d = 0; d < LADDER.length; d++) for (const s of d ? [-1, 1] : [0]) {
      const l = LADDER[want + d * s]; if (!l) continue;
      const c = pool.filter(x => x.lv === l && !used.has(x.id));
      if (c.length) { const x = c[Math.floor(rnd() * c.length)]; used.add(x.id); return x; }
    }
    return null;
  }
  g.Placement = { posterior, estimate, bandOf, cefrOf, stageOf, nextLevel, take, N, LADDER };

  const App = g.App; if (!App || !App.routes) return; // Node (test thuần)
  const { $, $$, esc, ring, modal } = UI;
  const { state, routes } = App;
  const view = App.view;
  const D = () => g.Distract;

  routes.placement = function () {
    if (!document.getElementById('pl-css')) { const st = document.createElement('style'); st.id = 'pl-css'; st.textContent = '.pl-result { text-align: center; color: var(--text); padding: 1.6rem 1.25rem; } .pl-em { font-size: 3rem; line-height: 1; margin-bottom: .5rem; } .pl-h { color: var(--text); font-size: 1.4rem; margin-bottom: .8rem; text-wrap: balance; } .pl-rings { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; max-width: 320px; margin: .6rem auto 1rem; } .pl-skill { display: grid; justify-items: center; gap: .3rem; } .pl-skill .ring { width: 76px; height: 76px; } .pl-skill .ring b { font-size: 1rem; } .pl-how { text-wrap: pretty; } .pl-q { font-size: 1.15rem; font-weight: 700; margin-top: .4rem; line-height: 1.5; } .pl-cta { display: grid; gap: .6rem; max-width: 360px; margin: 1.2rem auto 0; } [dir="rtl"] .pl-q { direction: ltr; unicode-bidi: isolate; }'; document.head.appendChild(st); }
    const mean = w => App.meanOf(w);
    const seen = new Set();
    const vocab = (g.IELTS_DATA ? IELTS_DATA.TOPICS : []).flatMap(tp => tp.words).filter(w => {
      const k = String(w.word || '').toLowerCase();
      if (!k || seen.has(k) || /\s/.test(k) || B[w.level] == null || !mean(w) || (D() && D().posOf(w.pos) === 'phr')) return false;
      seen.add(k); return true;
    });
    const vpool = vocab.map(w => ({ id: 'v:' + w.word, kind: 'vocab', lv: w.level === 'A1' ? 'A2' : w.level === 'C2' ? 'C1' : w.level, w }));
    const gpool = (g.GRAMMAR || []).flatMap(l => (l.quiz || []).map((q, k) => ({ id: 'g:' + l.id + ':' + k, kind: 'grammar', lv: l.level, l, q })))
      .filter(x => LADDER.includes(x.lv) && x.q && Array.isArray(x.q.options) && x.q.options.length >= 3 && !VI.test(x.q.q) && !x.q.options.some(o => VI.test(o)));
    const rnd = Math.random, used = new Set(), resp = [];
    let cur = null, busy = false, keys = null;
    const ask = () => {
      if (resp.length >= N) return finish();
      const kind = !gpool.length ? 'vocab' : !vpool.length ? 'grammar' : resp.length % 2 ? 'grammar' : 'vocab';
      const item = take(kind === 'vocab' ? vpool : gpool, nextLevel(resp.filter(r => r.kind === kind)), used, rnd);
      if (!item) return finish();
      let opts, correct, prompt;
      if (kind === 'vocab') {
        const w = item.w, ds = D() ? D().pick(w, vocab, { n: 3, key: 'vi', mean, seed: Math.floor(rnd() * 1e9) }) : [];
        const all = D() ? D().shuffle([w, ...ds], rnd()) : [w, ...ds];
        opts = all.map(mean); correct = all.indexOf(w);
        prompt = `<div class="tiny muted pl-tag">${t('TỪ VỰNG')} · ${item.lv}</div><div class="entry-word" lang="en" style="margin:.3rem 0">${esc(w.word)}</div><div class="muted">${t('Chọn nghĩa đúng')}</div>`;
      } else {
        opts = item.q.options; correct = item.q.answer;
        prompt = `<div class="tiny muted pl-tag">${t('NGỮ PHÁP')} · ${item.lv}</div><div class="pl-q" lang="en">${esc(item.q.q)}</div>`;
      }
      cur = { item, correct, c: 1 / opts.length };
      const i = resp.length;
      view.innerHTML = `<div class="study-wrap pl-wrap"><div class="study-top"><a class="icon-btn" href="#/home" id="plX" aria-label="${t('Thoát')}" title="${t('Thoát')}">✕</a>
          <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="${N}" aria-valuenow="${i}"><i style="width:${i / N * 100}%"></i></div><span class="small muted">${i + 1}/${N}</span></div>
        <div class="card q-card">${prompt}</div>
        <div class="options">${opts.map((o, k) => `<button type="button" class="option" data-k="${k}"><span class="kbd" aria-hidden="true">${k + 1}</span><span${kind === 'grammar' ? ' lang="en"' : ''}>${esc(o)}</span></button>`).join('')}<button type="button" class="option opt-idk" data-k="-1"><span aria-hidden="true">🤷</span><span>${t('Tôi không biết')}</span></button></div></div>`;
      // Không mang focus/hover của câu trước sang câu mới (iOS giữ :hover tại chỗ vừa chạm)
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      busy = true; setTimeout(() => { busy = false; }, 250); // chạm đúp nhanh không trả lời luôn câu kế tiếp
      $$('.pl-wrap .option').forEach(b => b.onclick = () => answer(b));
      $('#plX').onclick = e => {
        if (!resp.length) return;
        e.preventDefault();
        modal(`<div class="celebrate"><h2>${t('Thoát giữa chừng?')}</h2><p class="muted">${t('Kết quả của lượt này sẽ không được lưu.')}</p>
          <div class="row center"><button class="btn primary" data-close>${t('Làm tiếp')}</button><a class="btn" href="#/home" data-close>${t('Thoát')}</a></div></div>`);
      };
    };
    const answer = b => {
      if (busy || !cur) return;
      busy = true;
      const k = +b.dataset.k, r = k < 0 ? 'idk' : k === cur.correct ? 'right' : 'wrong';
      resp.push({ kind: cur.item.kind, lv: cur.item.lv, r, c: cur.c });
      cur = null;
      b.classList.add('picked'); b.setAttribute('aria-pressed', 'true');
      setTimeout(ask, 160);
    };
    keys = e => {
      if (!/^#\/placement/.test(location.hash)) { document.removeEventListener('keydown', keys); return; }
      if (!cur || e.ctrlKey || e.metaKey || e.altKey || !$('#modal').hidden) return;
      const bs = $$('.pl-wrap .option');
      const k = e.key === '0' || e.key === '?' ? bs.length - 1 : /^[1-9]$/.test(e.key) ? +e.key - 1 : -1;
      if (k >= 0 && bs[k]) { e.preventDefault(); answer(bs[k]); }
    };
    App.cleanups.push(() => document.removeEventListener('keydown', keys));
    const finish = async () => {
      document.removeEventListener('keydown', keys);
      const E = estimate(resp);
      state.settings.placement = { v: 2, band: E.band, lo: E.lo, hi: E.hi, vocab: E.vocab.band, grammar: E.grammar.band, vCefr: E.vocab.cefr, gCefr: E.grammar.cefr, weak: E.weak, stage: E.stage, n: E.n, idk: E.idk, se: E.se, pct: Math.round(E.right / Math.max(1, E.n) * 100), at: Date.now() };
      await App.saveSettings();
      if (g.Sync && Sync.schedule) Sync.schedule();
      App.reward({ quizzes: 1, xp: 20 }); Sfx.win(); confetti();
      const weak = E.weak === 'vocab' ? t('từ vựng') : t('ngữ pháp');
      const STG = { s0: t('Chặng 0 · Từ cốt lõi'), s1: t('Chặng 1 · Nền tảng'), s2: t('Chặng 2 · Mở rộng chủ đề'), s3: t('Chặng 3 · Học thuật') };
      const sk = (s, label, color) => `<div class="pl-skill">${ring(s.band / 9 * 100, f1(s.band), color)}<b>${label}</b><span class="small muted">${s.cefr}</span></div>`;
      view.innerHTML = `<div class="study-wrap pl-wrap"><div class="card pl-result">
        <div class="pl-em" aria-hidden="true">🎯</div><h2 class="pl-h">${t('Trình độ ước tính: Band {band}', { band: E.range })}</h2>
        <div class="pl-rings">${sk(E.vocab, t('Từ vựng'), 'var(--primary)')}${sk(E.grammar, t('Ngữ pháp'), 'var(--accent)')}</div>
        <p>${t('Điểm cần ưu tiên: <b>{weak}</b>. Kế hoạch hôm nay trên trang chủ đã được điều chỉnh theo kết quả này.', { weak })}</p>
        <p class="small muted">${t('Gợi ý bắt đầu lộ trình từ <b>{stage}</b>.', { stage: STG[E.stage] })}</p>
        <p class="small muted pl-how">${t('Ước tính từ {n} câu thích ứng: câu khó dần khi bạn trả lời đúng, dễ dần khi bạn sai. Khoảng điểm cho biết độ chắc chắn – làm lại sau vài tuần để cập nhật.', { n: E.n })} ${t('Kết quả chỉ để tham khảo, không thay thế bài thi thật.')}</p>
        <div class="pl-cta"><a class="btn primary lg block" href="#/home">${t('Xem kế hoạch hôm nay →')}</a><a class="btn block" href="#/path">🗺️ ${t('Lộ trình')}</a></div></div></div>`;
    };
    view.innerHTML = `<div class="study-wrap pl-wrap"><div class="card pl-result"><div class="pl-em" aria-hidden="true">🧭</div><h2 class="pl-h">${t('Kiểm tra đầu vào (5 phút)')}</h2>
      <p>${t('20 câu từ vựng và ngữ pháp từ A2 đến C1. Lexkite dùng kết quả để <b>ước tính band</b>, tìm <b>điểm yếu</b> và cá nhân hóa kế hoạch học mỗi ngày.')}</p>
      <p class="small muted">${t('Không biết thì chọn “Tôi không biết” – đừng đoán, kết quả sẽ chính xác hơn.')}</p>
      <div class="pl-cta"><button class="btn primary lg block" id="go">${t('Bắt đầu →')}</button></div></div></div>`;
    $('#go').onclick = () => { document.addEventListener('keydown', keys); ask(); };
  };
})();
