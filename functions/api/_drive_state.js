/* Trạng thái thật của từng file trên Kho Drive – MỘT nguồn logic cho trang Kho, Dọn kho, cron tự dọn (tidy_run) và autopilot social (docs/ASSET-LIBRARY.md §8.6.5).
 * Thuần, không gọi mạng (trừ loadSignals). Đầu vào: kết quả classify() của _drive_files.js + tín hiệu đăng bài (yt_queue · dist_social · soc_board · clip_review · manifest shorts).
 * Luật không ngoại lệ: lock ≠ null = KHÔNG dọn (đã đăng, đang lên lịch/hàng chờ, đang tham chiếu, footage bank, sao lưu; thiếu tín hiệu → khoá hết shorts). */
const DAY = 864e5;
export const STATES = ['published', 'draft', 'junk', 'stale', 'active'];
export const TIDY_DEFAULT = { on: true, stale_on: false, stale_days: 90, every_days: 7 };
const clamp = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
export const cleanTidy = c => { c = c && typeof c === 'object' ? c : {}; const d = TIDY_DEFAULT; return { on: c.on == null ? d.on : !!c.on, stale_on: !!c.stale_on, stale_days: clamp(c.stale_days, 30, 3650, d.stale_days), every_days: clamp(c.every_days, 1, 90, d.every_days) }; };
/** Clip không được đăng (dùng chung với autopilot social): bị xoá/loại/tạm dừng, hoặc master đã rời kho. */
export const clipHeld = (it, rv) => !!((rv && (rv.deleted || ['rejected', 'paused'].includes(rv.state))) || (it && (it.rejected || it.paused || (it.drive && it.drive.video && it.drive.video.retired))));
const qcLow = it => !!(it && it.qa && (it.qa.status === 'fail' || (it.qa.score != null && +it.qa.score < 90)));
const isUrl = u => /^https:\/\//.test(String(u || ''));
const LIVE_BOARD = new Set(['review', 'approved', 'scheduled', 'publishing']);
const groupBy = rows => { const m = new Map(); for (const r of rows) if (r && r.clip) (m.get(r.clip) || m.set(r.clip, []).get(r.clip)).push(r); return m; };
const parse = s => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };

/** Gom tín hiệu → tra file → clip. ok = false khi manifest/bảng đăng bài không đọc được: mọi file shorts bị khoá (không biết thì không dọn). */
export function buildSignals({ items = [], yt = [], social = [], board = [], review = [], ok = true, now = Date.now() } = {}) {
  const Y = groupBy(yt), So = groupBy(social), B = groupBy(board), R = new Map(review.map(r => [r.clip, r]));
  const make = (id, it) => {
    const posts = [], pending = [], ids = [...new Set([id, it && it.lesson].filter(Boolean))], rv = R.get(id);
    const add = (p, url, at) => { const old = posts.find(x => x.p === p); if (old) { old.u = old.u || url; old.t = old.t || at; } else posts.push({ p, u: url, t: at }); };
    const links = ids.flatMap(k => (B.get(k) || []).flatMap(b => parse(b.links)));
    for (const k of ids) {
      for (const r of Y.get(k) || []) { if (r.status === 'done' && r.video_id) add('youtube', 'https://youtu.be/' + encodeURIComponent(r.video_id), +r.updated || null); else pending.push({ p: 'youtube', t: Date.parse(r.publish_at || '') || null }); }
      for (const r of So.get(k) || []) {
        if (r.state === 'published') { const l = links.find(x => x.p === r.platform && isUrl(x.u)); add(r.platform || 'social', l ? l.u : '', +r.updated || +r.slot_ms || null); }
        else pending.push({ p: r.platform || 'social', t: +r.slot_ms || null });
      }
      for (const b of B.get(k) || []) {
        if (b.state === 'published') { const ls = parse(b.links).filter(x => isUrl(x.u)); if (ls.length) ls.forEach(l => add(l.p || 'social', l.u, +b.updated || null)); else add('social', '', +b.updated || null); }
        else if (LIVE_BOARD.has(b.state)) pending.push({ p: 'social', t: +b.want_at || null });
      }
    }
    if (it && (it.youtube_id || it.published) && !posts.length) add('youtube', it.youtube_id ? 'https://youtu.be/' + encodeURIComponent(it.youtube_id) : '', Date.parse(it.published || '') || null);
    if (rv && rv.slot_date && !rv.deleted) pending.push({ p: 'plan', t: Date.parse(rv.slot_date + 'T00:00:00Z') || null });
    const future = pending.map(x => x.t).filter(t => t && t > now).sort((a, b) => a - b);
    return { id, title: (it && it.title) || '', posts, pending, scheduled: future[0] || null, paused: !!((it && it.paused) || (rv && rv.state === 'paused')),
      junk: (it && it.rejected) || (rv && (rv.deleted || rv.state === 'rejected')) ? 'rejected' : qcLow(it) ? 'qc-low' : null };
  };
  const byFile = new Map(), bySha = new Map(), byStem = new Map(), links = [];
  for (const it of items) {
    if (!it || !it.id) continue;
    const c = make(it.id, it), d = it.drive || {}; byStem.set(it.id, c);
    for (const k of ['video', 'cover']) {
      const x = d[k]; if (!x || x.retired) continue;
      if (x.fileId) byFile.set(String(x.fileId), c);
      if (x.sha256) bySha.set(String(x.sha256).toLowerCase(), c);
      links.push({ src: 'shorts', sha: x.sha256 ? String(x.sha256).toLowerCase() : null, file_id: x.fileId ? String(x.fileId) : null, name: null, status: 'approved' });
    }
  }
  for (const id of new Set([...Y.keys(), ...So.keys()])) if (!byStem.has(id)) byStem.set(id, make(id, null));
  const link = (f, path, sha) => {
    const exact = byFile.get(f.id); if (exact) return { clip: exact, exact: true, master: true };
    const s = sha && bySha.get(String(sha).toLowerCase()); if (s) return { clip: s, exact: false, master: true };
    if (!/^shorts\//.test(path)) return null;
    const c = byStem.get(String(f.name || '').replace(/\.[^.]+$/, '')) || byStem.get(path.split('/').pop());
    return c ? { clip: c, exact: false, master: false } : null;
  };
  return { ok: !!ok, link, links, clips: byStem.size };
}

/** Đọc tín hiệu từ D1 chính + manifest. Bảng chưa tạo = rỗng (chưa từng đăng); lỗi khác / manifest dự phòng → ok:false. manifest tiêm từ drive.js (tránh vòng import). */
export async function loadSignals(env, manifest) {
  const q = sql => env.DB.prepare(sql).all().then(r => r.results || []).catch(e => { if (/no such table/i.test(String(e && e.message))) return []; throw e; });
  try {
    const [m, yt, social, board, review] = await Promise.all([manifest(env), q('SELECT clip, status, publish_at, video_id, updated FROM yt_queue LIMIT 20000'), q('SELECT clip, platform, slot_ms, state, updated FROM dist_social LIMIT 20000'), q('SELECT clip, state, want_at, links, updated FROM soc_board WHERE clip IS NOT NULL LIMIT 20000'), q('SELECT clip, state, slot_date, deleted FROM clip_review LIMIT 20000')]);
    return buildSignals({ items: m.items, yt, social, board, review, ok: m.source !== 'bundle' && m.items.length > 0 });
  } catch (e) { return buildSignals({ ok: false }); }
}

/** Mỗi file sống → { state, lock, clean, … }. clean: 'junk' | 'stale' | 'intermediate' = được phép dọn; lock ≠ null = cấm. scan = classify() (có seen). */
export function fileStates(scan, sig, { now = Date.now(), stale_days = 90, reject_days = 30 } = {}) {
  const hit = new Map(); for (const [c, g] of Object.entries(scan.groups)) for (const x of g) hit.set(x.id, { c, x });
  const items = [];
  for (const { f, path: p0, sha, row } of scan.seen) {
    const path = p0 || (row && row.folder) || '', h = hit.get(f.id), c = h && h.c, x = (h && h.x) || {};
    const ageD = (now - (Date.parse(f.modifiedTime || f.createdTime || '') || now)) / DAY, L = sig.link(f, path, sha), clip = L && L.clip;
    const sys = /^footage(\/|$)/.test(path) ? 'footage' : /^(backups|releases|shorts\/_admin)(\/|$)/.test(path) ? 'system' : null, dup = c === 'duplicate' && !!x.keep, zero = x.reason === 'zero-byte';
    let state = 'active', lock = 'referenced', clean = null, reason = x.reason || null;
    if (clip && clip.posts.length) {
      state = 'published'; lock = 'published';
      if (!L.exact && (dup || (!L.master && (c === 'temp' || /^shorts\/_ytpack(\/|$)/.test(path))))) { lock = null; clean = 'intermediate'; reason = reason || 'intermediate'; }
    } else if (clip && (clip.pending.length || clip.scheduled)) { state = 'draft'; lock = clip.scheduled ? 'scheduled' : 'queued'; }
    else if (sys) { if (dup || zero) { state = 'junk'; lock = null; clean = 'junk'; } else lock = sys; }
    else if (clip) {
      if (dup && !L.exact) { state = 'junk'; lock = null; clean = 'junk'; }
      else if (clip.junk) { state = 'junk'; reason = clip.junk; if (ageD >= reject_days && !clip.paused) { lock = null; clean = 'junk'; } else lock = 'waiting'; }
      else { state = 'draft'; lock = 'clip'; }
    } else if (c === 'orphan') {
      if (/^shorts\//.test(path)) lock = 'clip';
      else if (ageD >= stale_days) { state = 'stale'; lock = null; clean = 'stale'; }
      else lock = null; // còn mới: chưa đủ tuổi tự dọn, chỉ dọn tay
    } else if (c && !(c === 'temp' && x.ref)) { state = 'junk'; lock = null; clean = 'junk'; }
    if (!sig.ok && /^shorts\//.test(path)) { lock = 'signals'; clean = null; }
    items.push({ id: f.id, name: f.name, path: p0, size: +f.size || 0, mime: f.mimeType, modified: f.modifiedTime || null, state, lock, clean, reason, cat: c || null, clip: clip ? clip.id : null, posts: state === 'published' && clip ? clip.posts : undefined, scheduled: state === 'draft' && clip ? clip.scheduled : undefined, keep: x.keep ? x.keep.name : undefined });
  }
  const summary = Object.fromEntries(STATES.map(s => [s, { files: 0, bytes: 0 }])); let scheduled = 0;
  for (const x of items) { summary[x.state].files++; summary[x.state].bytes += x.size; if (x.scheduled) scheduled++; }
  const plan = { junk: { files: 0, bytes: 0 }, stale: { files: 0, bytes: 0 }, intermediate: { files: 0, bytes: 0 } };
  for (const x of items) if (x.clean) { plan[x.clean].files++; plan[x.clean].bytes += x.size; }
  return { items, summary, scheduled, plan };
}

/** cleanup_scan dùng chung luật khoá: bỏ file bị khoá khỏi nhóm ứng viên, tính lại tổng. */
export function dropLocked(scan, items) {
  const lock = new Set(items.filter(x => x.lock).map(x => x.id)), groups = {}, by = {}; let total = 0, count = 0, hidden = 0;
  for (const [c, g] of Object.entries(scan.groups)) { const keep = g.filter(x => !lock.has(x.id)); hidden += g.length - keep.length; groups[c] = keep; const b = keep.reduce((s, x) => s + x.size, 0); by[c] = { files: keep.length, bytes: b }; total += b; count += keep.length; }
  return { groups, by, total, count, refs_synced: scan.refs_synced, protected: hidden };
}
/** Tự dọn: chỉ Rác an toàn (bật công tắc mới thêm Lâu không dùng); bản trung gian của video đã đăng KHÔNG BAO GIỜ tự dọn (chỉ đề xuất). Lớn trước. */
export const autoPlan = (items, cfg) => items.filter(x => !x.lock && (x.clean === 'junk' || (cfg.stale_on && x.clean === 'stale'))).sort((a, b) => b.size - a.size);
/** Cầu dao: 1 lượt định dọn > 25 % dung lượng file của Drive (và > 20 file) = bất thường (sổ/manifest lệch?) → dừng, báo admin. */
export const tidyTripped = (plan, items) => { const all = items.reduce((s, x) => s + x.size, 0), b = plan.reduce((s, x) => s + x.size, 0); return plan.length > 20 && all > 0 && b / all > 0.25; };
