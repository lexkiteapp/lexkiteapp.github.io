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
export function auditPosts({ posts, chans, clips, now = Date.now(), days = 14, back = 0 }) {
  const bad = [], add = (p, code, detail, ch) => bad.push({ platform: ch.platform, channel_id: p.channel_id, title: ch.title, clip: p.clip, at: new Date(p.ms).toISOString(), code, detail }), lim = now + days * 864e5, from = now - back * 864e5;
  const info = new Map(); for (const [id, c] of chans) { const cfg = normCfg(c.cfg || {}), lang = cfg.lang || langOfChannel(c.title) || 'en'; info.set(id, { ...c, lang, tz: capCfg({ ...cfg, lang }).tz, rawTz: c.cfg && c.cfg.tz, declared: cfg.lang, titleLang: langOfChannel(c.title) }); }
  const per = new Map(), seenClip = new Set(), seenTitle = new Set(), xch = new Map();
  for (const [id, ch] of info) {
    const p0 = { channel_id: id, clip: '', ms: now };
    if (ch.declared && ch.titleLang && ch.declared !== ch.titleLang) add(p0, 'map-lang', `cấu hình ${ch.declared} ≠ tên kênh ${ch.titleLang}`, ch);
    if (ch.rawTz !== LANG_TZ[ch.lang]) add(p0, 'map-tz', `múi giờ cấu hình ${ch.rawTz || '(trống → mặc định NY)'} ≠ thị trường ${LANG_TZ[ch.lang]}`, ch);
  }
  for (const p of posts) {
    if (p.ms < from || p.ms > lim) continue; const ch = info.get(p.channel_id); if (!ch) continue;
    const it = clips.get(p.clip) || { id: p.clip }, v = postViolation(ch, it, p.ms); if (v) add(p, v.code, v.detail, ch);
    const k = p.channel_id + '|' + p.clip; if (seenClip.has(k)) add(p, 'dup-clip', 'cùng clip hai lần trên kênh', ch); seenClip.add(k);
    const t = norm(it.title), kt = p.channel_id + '|' + t; if (t && seenTitle.has(kt)) add(p, 'dup-title', 'trùng tiêu đề trên kênh', ch); seenTitle.add(kt);
    if (p.clip) { const xk = ch.platform + '|' + p.clip, real = norm(ch.title); (xch.get(xk) || xch.set(xk, []).get(xk)).push({ channel_id: real || p.channel_id, title: ch.title, at: new Date(p.ms).toISOString() }); }
    const d = localDate(p.ms, ch.tz), key = p.channel_id + '|' + d; per.set(key, (per.get(key) || 0) + 1);
  }
  for (const [key, n] of per) { const [id, d] = key.split('|'), ch = info.get(id), max = isMainLang(ch.lang) ? MAIN_DAY.max : 1; if (n > max) add({ channel_id: id, clip: '', ms: Date.parse(d + 'T12:00:00Z') }, 'over-day', `${n} bài ngày ${d} (tối đa ${max})`, ch); }
  // 24/11 (chủ: không lấp slot bằng bản lặp): CÙNG clip gốc trên ≥2 kênh CÙNG nền tảng = trùng chéo kênh. Chỉ ĐO (không vào bad/n_bad để không làm đỏ coverage); gỡ bằng purge sau khi chủ chốt luật.
  const xchan = []; for (const [k, v] of xch) if (new Set(v.map(x => x.channel_id)).size > 1) xchan.push({ platform: k.split('|')[0], clip: k.slice(k.indexOf('|') + 1), channels: v.length });
  const summary = {}; for (const b of bad) summary[b.code] = (summary[b.code] || 0) + 1;
  return { days, back, at: now, posts: posts.filter(p => p.ms >= from && p.ms <= lim).length, past: bad.filter(b => Date.parse(b.at) < now).length, bad: bad.slice(0, 500), n_bad: bad.length, summary, xchan_n: xchan.length, xchan: xchan.slice(0, 200) };
}
export async function auditDb(db, clipsArr, now = Date.now(), days = 14, back = 0) {
  const all = async (sql, ...p) => ((await db.prepare(sql).bind(...p).all()) || {}).results || [];
  const cfg = new Map(); for (const r of await all('SELECT channel_id, cfg FROM yt_chan_cfg')) { try { cfg.set(r.channel_id, JSON.parse(r.cfg || '{}')); } catch (e) { /* hỏng → mặc định */ } }
  const chans = new Map(); for (const c of (await all("SELECT channel_id, platform, title FROM dist_ext WHERE status = 'ok'")).filter(c => !foreignAccount({ title: c.title }))) chans.set(c.channel_id, { platform: c.platform, title: c.title, cfg: cfg.get(c.channel_id) || {} });
  for (const c of await all("SELECT channel_id, title FROM yt_channel WHERE status = 'ok'")) chans.set(c.channel_id, { platform: 'youtube', title: c.title, cfg: cfg.get(c.channel_id) || {} });
  const lo = now - back * 864e5, hi = now + (days + 1) * 864e5, iso = new Date(lo).toISOString(), isoHi = new Date(hi).toISOString(), posts = [];
  for (const r of await all("SELECT clip, channel_id, slot_ms FROM dist_social WHERE slot_ms BETWEEN ? AND ? AND state NOT IN ('failed', 'cancelled', 'skipped')", lo, hi)) posts.push({ clip: r.clip, channel_id: r.channel_id, ms: r.slot_ms });
  for (const r of await all('SELECT clip, channel_id, slot_ms FROM yt_plan WHERE slot_ms BETWEEN ? AND ?', lo, hi)) posts.push({ clip: r.clip, channel_id: r.channel_id, ms: r.slot_ms });
  for (const r of await all("SELECT clip, channel_id, publish_at FROM yt_queue WHERE channel_id IS NOT NULL AND status IN ('queued', 'uploading', 'done') AND publish_at BETWEEN ? AND ?", iso, isoHi)) { const ms = Date.parse(r.publish_at); if (ms) posts.push({ clip: r.clip, channel_id: r.channel_id, ms }); }
  return auditPosts({ posts, chans, clips: new Map((clipsArr || []).map(i => [i.id, i])), now, days, back });
}

/** 24/11 (chủ: đăng sai ngôn ngữ page): GỠ bài TƯƠNG LAI lên SAI NGÔN NGỮ kênh khỏi lịch để bộ lấp (autofill/fill) thay bằng tập đúng ngôn ngữ.
 *  Chỉ chạm bài chưa lên nền tảng: dist_social 'planned' → 'skipped' (err purge-wrong-lang), yt_plan xoá, yt_queue 'queued'/'failed' xoá.
 *  Bài ĐÃ đẩy GrabCast ('pushed') hoặc ĐÃ tải lên YouTube ('done'/'uploading') chỉ ĐẾM (cần API nền tảng để gỡ/dời), không đụng. apply=false → chỉ đếm (dry-run). */
export async function purgeWrongLang(db, clipsArr, now = Date.now(), apply = false) {
  const all = async (sql, ...p) => ((await db.prepare(sql).bind(...p).all()) || {}).results || [], run = (sql, ...p) => db.prepare(sql).bind(...p).run();
  const cfg = new Map(); for (const r of await all('SELECT channel_id, cfg FROM yt_chan_cfg')) { try { cfg.set(r.channel_id, JSON.parse(r.cfg || '{}')); } catch (e) { /* mặc định */ } }
  const lang = new Map();
  for (const c of await all("SELECT channel_id, title FROM dist_ext WHERE status = 'ok'")) lang.set(c.channel_id, (normCfg(cfg.get(c.channel_id) || {}).lang || langOfChannel(c.title) || 'en'));
  for (const c of await all("SELECT channel_id, title FROM yt_channel WHERE status = 'ok'")) lang.set(c.channel_id, (normCfg(cfg.get(c.channel_id) || {}).lang || langOfChannel(c.title) || 'en'));
  const clips = new Map((clipsArr || []).map(i => [i.id, i])), wrong = r => lang.has(r.channel_id) && clipLang(clips.get(r.clip) || { id: r.clip }) !== lang.get(r.channel_id), lo = now + 15 * 60e3;
  const out = { apply: !!apply, cancelled_social: 0, removed_plan: 0, removed_queue: 0, kept_pushed: 0, kept_uploaded: 0, by_lang: {} }, seen = (r, k) => { out[k]++; const key = clipLang(clips.get(r.clip) || { id: r.clip }) + '→' + lang.get(r.channel_id); out.by_lang[key] = (out.by_lang[key] || 0) + 1; };
  for (const r of (await all("SELECT clip, channel_id, state FROM dist_social WHERE slot_ms > ? AND state IN ('planned', 'pushed')", lo)).filter(wrong)) {
    if (r.state === 'pushed') { out.kept_pushed++; continue; }
    seen(r, 'cancelled_social'); if (apply) await run("UPDATE dist_social SET state = 'skipped', err = 'purge-wrong-lang', updated = ? WHERE clip = ? AND channel_id = ? AND state = 'planned'", now, r.clip, r.channel_id);
  }
  for (const r of (await all('SELECT clip, channel_id FROM yt_plan WHERE slot_ms > ?', lo)).filter(wrong)) { seen(r, 'removed_plan'); if (apply) await run('DELETE FROM yt_plan WHERE clip = ? AND channel_id = ?', r.clip, r.channel_id); }
  for (const r of (await all("SELECT clip, channel_id, status, publish_at FROM yt_queue WHERE channel_id IS NOT NULL AND publish_at > ? AND status IN ('queued', 'failed', 'uploading', 'done')", new Date(lo).toISOString())).filter(wrong)) {
    if (r.status === 'uploading' || r.status === 'done') { out.kept_uploaded++; continue; }
    seen(r, 'removed_queue'); if (apply) await run("DELETE FROM yt_queue WHERE clip = ? AND channel_id = ? AND status IN ('queued', 'failed')", r.clip, r.channel_id);
  }
  return out;
}

/** 25/11 (audit dup-clip/dup-title/over-day trên kênh YouTube trực tiếp): kế hoạch `yt_plan` mà clip ĐÃ nằm trong `yt_queue` (queued/uploading/done) hoặc ngày đó kênh ĐÃ có bài trong hàng tải → bài trùng; hàng tải thắng, xoá dòng kế hoạch (chỉ nguồn 'auto', chỉ tương lai).
 *  apply=false → chỉ đếm. Trả { apply, dup_clip, over_day, removed }. */
export async function dedupePlan(db, now = Date.now(), apply = false) {
  const all = async (sql, ...p) => ((await db.prepare(sql).bind(...p).all()) || {}).results || [], out = { apply: !!apply, dup_clip: 0, over_day: 0, removed: 0 };
  const cfg = new Map(); for (const r of await all('SELECT channel_id, cfg FROM yt_chan_cfg')) { try { cfg.set(r.channel_id, JSON.parse(r.cfg || '{}')); } catch (e) { /* mặc định */ } }
  const q = await all("SELECT clip, channel_id, publish_at FROM yt_queue WHERE channel_id IS NOT NULL AND status IN ('queued', 'uploading', 'done') AND publish_at > ?", new Date(now).toISOString());
  const tzOf = id => capCfg(normCfg(cfg.get(id) || {})).tz, clips = new Set(q.map(r => r.clip)), days = new Set(q.map(r => r.channel_id + '|' + localDate(Date.parse(r.publish_at), tzOf(r.channel_id))));
  for (const r of await all("SELECT clip, channel_id, slot_ms FROM yt_plan WHERE source = 'auto' AND slot_ms > ?", now + 15 * 60e3)) {
    const dupClip = clips.has(r.clip), dupDay = !dupClip && days.has(r.channel_id + '|' + localDate(r.slot_ms, tzOf(r.channel_id)));
    if (!dupClip && !dupDay) continue; out[dupClip ? 'dup_clip' : 'over_day']++; out.removed++;
    if (apply) await db.prepare('DELETE FROM yt_plan WHERE clip = ? AND channel_id = ?').bind(r.clip, r.channel_id).run();
  }
  return out;
}

/** 25/11 (chủ: lịch đúng giờ cao điểm theo múi giờ thị trường): cấu hình kênh phải LƯU đúng ngôn ngữ + múi giờ thị trường (audit map-tz). Lịch đã ép múi giờ qua capCfg nhưng bản ghi thô (trống → mặc định NY, hoặc Taipei cho zh)
 *  làm báo lệch và dễ bị công cụ khác đọc sai → ghi lại cfg = capCfg(normCfg({ ...cũ, lang })) cho mọi kênh còn lệch (giữ nguyên các trường khác: active, cửa sổ, vai trò). apply=false → chỉ đếm. */
export async function healChanCfg(db, apply = false) {
  const all = async (sql, ...p) => ((await db.prepare(sql).bind(...p).all()) || {}).results || [], out = { apply: !!apply, fixed: 0, ids: [] };
  const raw = new Map(); for (const r of await all('SELECT channel_id, cfg FROM yt_chan_cfg')) { try { raw.set(r.channel_id, JSON.parse(r.cfg || '{}')); } catch (e) { raw.set(r.channel_id, {}); } }
  const chans = [...(await all("SELECT channel_id, title FROM dist_ext WHERE status = 'ok'")).filter(c => !foreignAccount({ title: c.title })), ...(await all("SELECT channel_id, title FROM yt_channel WHERE status = 'ok'"))];
  for (const c of chans) {
    const cur = raw.get(c.channel_id) || {}, lang = normCfg(cur).lang || langOfChannel(c.title) || 'en', want = LANG_TZ[lang];
    if (!want || (cur.tz === want && cur.lang === lang)) continue;
    const next = capCfg(normCfg({ ...cur, lang, tz: want })); out.fixed++; out.ids.push(c.channel_id);
    if (apply) await db.prepare('INSERT INTO yt_chan_cfg (channel_id, cfg, paused_reason, updated) VALUES (?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET cfg = excluded.cfg, updated = excluded.updated').bind(c.channel_id, JSON.stringify(next), '', Date.now()).run();
  }
  return out;
}
