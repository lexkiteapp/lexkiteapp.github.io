/* Máy gác ĐÚNG page · ĐÚNG ngôn ngữ · ĐÚNG giờ cao điểm (chủ 23/11: lịch đăng loạn, sai page/kênh, sai giờ). Hàm thuần `auditPosts` (test: scripts/test/social-audit.mjs) + op 'audit' của /api/social-auto (chỉ ĐỌC D1,
 * 0 lượt GrabCast) + CI social-coverage.yml (đỏ khi còn lệch) + cổng trước khi xếp/đẩy bài (`postViolation`). Một nguồn giờ cao điểm: PEAK_WINDOWS (_distribution.js). */
import { localDate, localHM, normCfg, capCfg, langOfChannel, LANG_TZ, foreignAccount, isMainLang, MAIN_DAY, PEAK_WINDOWS, peakOk } from './_distribution.js';

const norm = t => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
/** ngôn ngữ của clip: trường lang của manifest, không có thì suy từ id t2_l1_<lang>_… (clip bản ngữ), còn lại 'en'. */
export const clipLang = it => { const l = String((it && it.lang) || '').toLowerCase(); if (/^[a-z]{2}$/.test(l)) return l; const m = /^t2_l1_([a-z]{2})_/.exec(String((it && it.id) || '')); return m ? m[1] : 'en'; };
/** Vi phạm của MỘT bài (cổng chặn trước khi xếp/đẩy): { code, detail } hoặc null. chan = { lang, tz }. */
export function postViolation(chan, clip, atMs) {
  const cl = clipLang(clip), lang = chan.lang || 'en';
  if (cl !== lang) return { code: 'wrong-lang', detail: `clip ${cl} lên kênh ${lang}` };
  if (!peakOk(atMs, chan.tz)) return { code: 'off-peak', detail: `${localHM(atMs, chan.tz)} ngoài giờ cao điểm ${chan.tz}` };
  return null;
}
/** posts: [{platform, channel_id, clip, ms, state}], chans: Map(channel_id → {title, platform, cfg}), clips: Map(id → {lang,title}). */
export function auditPosts({ posts, chans, clips, now = Date.now(), days = 14 }) {
  const bad = [], add = (p, code, detail, ch) => bad.push({ platform: ch.platform, channel_id: p.channel_id, title: ch.title, clip: p.clip, at: new Date(p.ms).toISOString(), code, detail }), lim = now + days * 864e5;
  const info = new Map(); for (const [id, c] of chans) { const cfg = normCfg(c.cfg || {}), lang = cfg.lang || langOfChannel(c.title) || 'en'; info.set(id, { ...c, lang, tz: capCfg({ ...cfg, lang }).tz, rawTz: c.cfg && c.cfg.tz, declared: cfg.lang, titleLang: langOfChannel(c.title) }); }
  const per = new Map(), seenClip = new Set(), seenTitle = new Set();
  for (const [id, ch] of info) {
    const p0 = { channel_id: id, clip: '', ms: now };
    if (ch.declared && ch.titleLang && ch.declared !== ch.titleLang) add(p0, 'map-lang', `cấu hình ${ch.declared} ≠ tên kênh ${ch.titleLang}`, ch);
    if (ch.rawTz !== LANG_TZ[ch.lang]) add(p0, 'map-tz', `múi giờ cấu hình ${ch.rawTz || '(trống → mặc định NY)'} ≠ thị trường ${LANG_TZ[ch.lang]}`, ch);
  }
  for (const p of posts) {
    if (p.ms < now || p.ms > lim) continue; const ch = info.get(p.channel_id); if (!ch) continue;
    const it = clips.get(p.clip) || { id: p.clip }, v = postViolation(ch, it, p.ms); if (v) add(p, v.code, v.detail, ch);
    const k = p.channel_id + '|' + p.clip; if (seenClip.has(k)) add(p, 'dup-clip', 'cùng clip hai lần trên kênh', ch); seenClip.add(k);
    const t = norm(it.title), kt = p.channel_id + '|' + t; if (t && seenTitle.has(kt)) add(p, 'dup-title', 'trùng tiêu đề trên kênh', ch); seenTitle.add(kt);
    const d = localDate(p.ms, ch.tz), key = p.channel_id + '|' + d; per.set(key, (per.get(key) || 0) + 1);
  }
  for (const [key, n] of per) { const [id, d] = key.split('|'), ch = info.get(id), max = isMainLang(ch.lang) ? MAIN_DAY.max : 1; if (n > max) add({ channel_id: id, clip: '', ms: Date.parse(d + 'T12:00:00Z') }, 'over-day', `${n} bài ngày ${d} (tối đa ${max})`, ch); }
  const summary = {}; for (const b of bad) summary[b.code] = (summary[b.code] || 0) + 1;
  return { days, at: now, posts: posts.filter(p => p.ms >= now && p.ms <= lim).length, bad: bad.slice(0, 500), n_bad: bad.length, summary };
}
export async function auditDb(db, clipsArr, now = Date.now(), days = 14) {
  const all = async (sql, ...p) => ((await db.prepare(sql).bind(...p).all()) || {}).results || [];
  const cfg = new Map(); for (const r of await all('SELECT channel_id, cfg FROM yt_chan_cfg')) { try { cfg.set(r.channel_id, JSON.parse(r.cfg || '{}')); } catch (e) { /* hỏng → mặc định */ } }
  const chans = new Map(); for (const c of (await all("SELECT channel_id, platform, title FROM dist_ext WHERE status = 'ok'")).filter(c => !foreignAccount({ title: c.title }))) chans.set(c.channel_id, { platform: c.platform, title: c.title, cfg: cfg.get(c.channel_id) || {} });
  for (const c of await all("SELECT channel_id, title FROM yt_channel WHERE status = 'ok'")) chans.set(c.channel_id, { platform: 'youtube', title: c.title, cfg: cfg.get(c.channel_id) || {} });
  const hi = now + (days + 1) * 864e5, iso = new Date(now).toISOString(), isoHi = new Date(hi).toISOString(), posts = [];
  for (const r of await all("SELECT clip, channel_id, slot_ms FROM dist_social WHERE slot_ms BETWEEN ? AND ? AND state NOT IN ('failed', 'cancelled')", now, hi)) posts.push({ clip: r.clip, channel_id: r.channel_id, ms: r.slot_ms });
  for (const r of await all('SELECT clip, channel_id, slot_ms FROM yt_plan WHERE slot_ms BETWEEN ? AND ?', now, hi)) posts.push({ clip: r.clip, channel_id: r.channel_id, ms: r.slot_ms });
  for (const r of await all("SELECT clip, channel_id, publish_at FROM yt_queue WHERE channel_id IS NOT NULL AND status IN ('queued', 'uploading') AND publish_at BETWEEN ? AND ?", iso, isoHi)) { const ms = Date.parse(r.publish_at); if (ms) posts.push({ clip: r.clip, channel_id: r.channel_id, ms }); }
  return auditPosts({ posts, chans, clips: new Map((clipsArr || []).map(i => [i.id, i])), now, days });
}
