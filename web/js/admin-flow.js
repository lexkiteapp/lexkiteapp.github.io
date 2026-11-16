/* Quản trị › Nội dung & Video: dải luồng chung đầu 4 mục (docs/VIDEO.md §9)
 *   1 Studio (#studio) → 2 Trung tâm video (#video) → 3 Kênh & phân phối (#dist) → 4 Đăng & hiệu quả (#social) + viên Kho Drive (#drive).
 * Mỗi số = dữ liệu thật từ POST /api/admin-clips op 'flow' (functions/api/admin-clips.js flowStats). null = "chưa có dữ liệu" (—), không bịa 0.
 * Đệm 60 s phía khách: chuyển qua lại giữa 4 mục không gọi lại máy chủ. Đang tải / lỗi (+ Thử lại) / rỗng đều có trạng thái rõ.
 * AdminFlow.paint(el, tab, { capi, go, L, esc }) – el nằm NGOÀI #main nên các mô-đun mục vẽ lại #main không xóa dải. */
(function () {
  'use strict';
  const EN = {
    'Luồng video': 'Video pipeline', 'Studio': 'Studio', 'Trung tâm video': 'Video hub', 'Kênh & phân phối': 'Channels & distribution', 'Đăng & hiệu quả': 'Publishing & results',
    'Sản xuất': 'Produce', 'Duyệt & lưu': 'Review & store', 'Phân phối': 'Distribute', 'Đăng': 'Publish',
    '{a} đang làm · {q} chờ QC': '{a} in production · {q} awaiting QC', '{n} lỗi QC': '{n} failed QC',
    '{p} chờ duyệt · {a} đã duyệt': '{p} to review · {a} approved', '{n} lỗi QA': '{n} failed QA',
    '{r} sẵn sàng cho bài · {e} đang nhúng': '{r} ready for lessons · {e} embedded', 'Chưa có kênh nhúng': 'No embed channel yet',
    '{s} đã lên lịch · {p} đã đăng': '{s} scheduled · {p} published', '{n} bài chờ duyệt': '{n} posts to review', '{n} lỗi đăng': '{n} failed posts',
    'Kho Drive': 'Drive storage', '{u} / {t} · {n} Drive': '{u} / {t} · {n} Drives', 'Chưa nối Drive': 'No Drive connected', '{n} cảnh báo': '{n} alert(s)',
    'Chưa có dữ liệu': 'No data yet', 'Không tải được số liệu luồng': 'Could not load pipeline numbers', 'Thử lại': 'Retry', 'Bạn đang ở bước này': 'You are on this step',
    'Cập nhật {t}': 'Updated {t}', 'Mở {x}': 'Open {x}',
  };
  const STEPS = [
    { tab: 'studio', n: 1, icon: '🎞️', t: 'Studio', k: 'Sản xuất' },
    { tab: 'video', n: 2, icon: '🎬', t: 'Trung tâm video', k: 'Duyệt & lưu' },
    { tab: 'dist', n: 3, icon: '🛰️', t: 'Kênh & phân phối', k: 'Phân phối' },
    { tab: 'social', n: 4, icon: '📣', t: 'Đăng & hiệu quả', k: 'Đăng' },
  ];
  const TABS = new Set(['studio', 'video', 'dist', 'social', 'drive']);
  let memo = null, inflight = null;

  const fmt = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (o && o[k] != null ? o[k] : m));
  const num = x => (x == null ? '—' : Number(x).toLocaleString());
  const gb = b => (b >= 1e12 ? (b / 1e12).toFixed(1) + ' TB' : Math.round(b / 1e9) + ' GB');

  // Thuần (test được): số liệu → mô tả từng bước { line, warn, state: ok|todo|warn|none }
  function model(d, T) {
    const tr = T || (s => s);
    if (!d) return null;
    const st = d.studio, lib = d.library || {}, di = d.dist || {}, pu = d.publish || {};
    const out = {};
    out.studio = !st ? { line: tr('Chưa có dữ liệu'), state: 'none' } : {
      line: fmt(tr('{a} đang làm · {q} chờ QC'), { a: num(st.active), q: num(st.qa) }),
      warn: st.qa_fail ? fmt(tr('{n} lỗi QC'), { n: num(st.qa_fail) }) : '',
      state: st.qa_fail ? 'warn' : st.qa ? 'todo' : 'ok',
    };
    out.video = {
      line: fmt(tr('{p} chờ duyệt · {a} đã duyệt'), { p: num(lib.pending), a: num(lib.approved) }),
      warn: lib.fail ? fmt(tr('{n} lỗi QA'), { n: num(lib.fail) }) : '',
      state: lib.fail ? 'warn' : lib.pending ? 'todo' : 'ok',
    };
    const noEmbed = di.embed_channels === 0;
    out.dist = {
      line: fmt(tr('{r} sẵn sàng cho bài · {e} đang nhúng'), { r: num(di.ready), e: num(di.embedded) }),
      warn: noEmbed ? tr('Chưa có kênh nhúng') : '',
      state: noEmbed ? 'warn' : di.ready ? 'todo' : 'ok',
    };
    const sched = pu.planned == null && pu.scheduled == null ? null : (pu.planned || 0) + (pu.scheduled || 0);
    const pub = pu.published == null && pu.posted == null ? null : (pu.published || 0) + (pu.posted || 0);
    out.social = {
      line: fmt(tr('{s} đã lên lịch · {p} đã đăng'), { s: num(sched), p: num(pub) }),
      warn: pu.failed ? fmt(tr('{n} lỗi đăng'), { n: num(pu.failed) }) : pu.review ? fmt(tr('{n} bài chờ duyệt'), { n: num(pu.review) }) : '',
      state: pu.failed ? 'warn' : pu.review ? 'todo' : 'ok',
    };
    const dr = d.drive;
    out.drive = !dr ? { line: tr('Chưa nối Drive'), state: 'warn' } : {
      line: fmt(tr('{u} / {t} · {n} Drive'), { u: gb(dr.used), t: gb(dr.total), n: num(dr.drives) }),
      warn: dr.crit || dr.warn ? fmt(tr('{n} cảnh báo'), { n: num((dr.crit || 0) + (dr.warn || 0)) }) : '',
      state: dr.crit ? 'bad' : dr.warn ? 'warn' : 'ok',
      pct: dr.total ? Math.min(100, Math.round(dr.used / dr.total * 100)) : 0,
    };
    return out;
  }

  function html(m, tab, T, esc) {
    const steps = STEPS.map((s, i) => {
      const x = m[s.tab], cur = s.tab === tab;
      return `${i ? '<span class="flow-arr" aria-hidden="true">›</span>' : ''}<a class="flow-step st-${x.state}" href="#${s.tab}" data-flow="${s.tab}"${cur ? ' aria-current="step"' : ''} title="${esc(cur ? T('Bạn đang ở bước này') : fmt(T('Mở {x}'), { x: T(s.t) }))}">`
        + `<span class="flow-n" aria-hidden="true">${s.n}</span><span class="flow-b"><span class="flow-k">${esc(T(s.k))}</span><span class="flow-t">${s.icon} ${esc(T(s.t))}</span>`
        + `<span class="flow-l tnum">${esc(x.line)}</span>${x.warn ? `<span class="flow-w">${esc(x.warn)}</span>` : ''}</span></a>`;
    }).join('');
    const dv = m.drive;
    const drive = `<a class="flow-drive st-${dv.state}" href="#drive" data-flow="drive"${tab === 'drive' ? ' aria-current="page"' : ''}><span class="flow-t">🗄️ ${esc(T('Kho Drive'))}</span>`
      + `<span class="flow-l tnum">${esc(dv.line)}</span>${dv.pct != null ? `<span class="flow-bar" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${dv.pct}" aria-label="${esc(T('Kho Drive'))}"><i style="width:${dv.pct}%"></i></span>` : ''}${dv.warn ? `<span class="flow-w">${esc(dv.warn)}</span>` : ''}</a>`;
    return `<div class="flow-steps">${steps}</div>${drive}`;
  }

  async function data(capi, force) {
    if (!force && memo && Date.now() - memo.at < 60e3) return memo.d;
    if (!inflight) inflight = capi('flow').then(d => { memo = { at: Date.now(), d }; return d; }).finally(() => { inflight = null; });
    return inflight;
  }

  async function paint(el, tab, o) {
    if (!el) return;
    if (!TABS.has(tab)) { el.hidden = true; el.innerHTML = ''; return; }
    const L = o.L || (s => s), esc = o.esc || (s => String(s)), lang = typeof o.lang === 'function' ? o.lang() : 'vi';
    const T = s => (lang === 'en' && EN[s]) || L(s);
    el.hidden = false; el.setAttribute('aria-label', T('Luồng video'));
    if (!el.onclick) el.onclick = e => { const a = e.target.closest('[data-flow]'); if (a && !(e.metaKey || e.ctrlKey)) { e.preventDefault(); o.go(a.dataset.flow); return; } if (e.target.closest('[data-flow-retry]')) paint(el, el.dataset.tab, { ...o, force: true }); };
    el.dataset.tab = tab;
    if (!memo || o.force) el.innerHTML = `<div class="flow-steps flow-skel" aria-busy="true">${STEPS.map(() => '<span class="flow-step skel"></span>').join('')}</div>`;
    try {
      const d = await data(o.capi, o.force);
      if (el.dataset.tab !== tab) return; // đã sang mục khác
      el.innerHTML = html(model(d, T), tab, T, esc);
    } catch (e) {
      if (el.dataset.tab !== tab) return;
      el.innerHTML = `<div class="flow-err" role="status">⚠️ ${esc(T('Không tải được số liệu luồng'))} <button type="button" class="btn sm" data-flow-retry>${esc(T('Thử lại'))}</button></div>`;
    }
  }

  window.AdminFlow = { paint, TABS, pure: { model, html, STEPS, EN }, _reset: () => { memo = null; inflight = null; } };
})();
