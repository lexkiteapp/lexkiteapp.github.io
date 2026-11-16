/* Máy gác lịch đăng (owner 16/11: mỗi kênh đúng 1 video mỗi ngày, không ngày nào trống). Chỉ ĐỌC D1: 2 truy vấn (kênh + cấu hình) + 1 truy vấn lịch theo chỉ mục slot_ms.
 * gapsOf = hàm thuần (test); coverage = op 'coverage' của /api/social-auto, CI social-coverage.yml gọi mỗi ngày và mở issue nhãn social-alert khi có kênh-ngày trống. */
import { localDate, normCfg, foreignAccount } from './_distribution.js';

export const COVER_DAYS = 30;
/** Số trang/kênh owner muốn phủ (16/11): 15 trang Facebook + 15 kênh YouTube theo ngôn ngữ, mỗi nơi 1 video/ngày. Thiếu kênh nối được → cũng là chỗ trống (450 trang-ngày/nền tảng). */
export const EXPECT = { facebook_page: 15, youtube: 15, instagram: 1, tiktok: 1 };
/** Ngày (theo múi giờ kênh) từ NGÀY MAI đến +days chưa có bài nào: 'YYYY-MM-DD'[] – hôm nay bỏ qua vì giờ đăng có thể đã qua. */
export function gapsOf(slotsMs, tz, now, days = COVER_DAYS) {
  const have = new Set((slotsMs || []).map(ms => localDate(ms, tz))), [y, m, d] = localDate(now, tz).split('-').map(Number), out = [];
  for (let i = 1; i <= days; i++) { const day = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10); if (!have.has(day)) out.push(day); }
  return out;
}
export async function coverage(db, now = Date.now(), days = COVER_DAYS) {
  const all = async (sql, ...p) => ((await db.prepare(sql).bind(...p).all()) || {}).results || [];
  const ext = (await all("SELECT channel_id, platform, title FROM dist_ext WHERE status = 'ok' ORDER BY platform, title")).filter(c => !foreignAccount({ title: c.title }));
  const cfg = new Map(); for (const r of await all('SELECT channel_id, cfg FROM yt_chan_cfg')) { try { cfg.set(r.channel_id, JSON.parse(r.cfg || '{}')); } catch (e) { /* cấu hình hỏng → mặc định */ } }
  const slots = new Map(); for (const r of await all("SELECT channel_id, slot_ms FROM dist_social WHERE slot_ms BETWEEN ? AND ? AND state NOT IN ('failed', 'cancelled')", now - 864e5, now + (days + 2) * 864e5)) (slots.get(r.channel_id) || slots.set(r.channel_id, []).get(r.channel_id)).push(r.slot_ms);
  const posted = new Map(); for (const r of await all("SELECT channel_id, COUNT(*) AS n FROM dist_social WHERE slot_ms BETWEEN ? AND ? AND state IN ('pushed', 'published') GROUP BY channel_id", now - 864e5, now)) posted.set(r.channel_id, +r.n || 0); // 24 giờ qua: kênh có bài đã đẩy/đăng không?
  const ytDone = new Map(); for (const r of await all("SELECT channel_id, COUNT(*) AS n FROM yt_queue WHERE status = 'done' AND channel_id IS NOT NULL AND ((publish_at BETWEEN ? AND ?) OR (publish_at IS NULL AND updated > ?)) GROUP BY channel_id", new Date(now - 864e5).toISOString(), new Date(now).toISOString(), now - 864e5)) ytDone.set(r.channel_id, +r.n || 0); // YouTube trực tiếp: đã tải + tới giờ công khai trong 24 giờ qua
  const rows = [];
  // YouTube có 2 đường (docs/VIDEO.md): API trực tiếp (yt_channel UC… + yt_plan) và GrabCast (dist_ext gc-youtube-* + dist_social). Cùng 1 kênh thật (trùng tên) thì GỘP lịch hai đường, không đếm hai lần.
  const norm = t => String(t || '').toLowerCase().replace(/\s+/g, ' ').trim(), direct = (await all("SELECT channel_id, title FROM yt_channel WHERE status = 'ok'")), plan = new Map();
  for (const r of await all('SELECT channel_id, slot_ms FROM yt_plan WHERE slot_ms BETWEEN ? AND ?', now - 864e5, now + (days + 2) * 864e5)) (plan.get(r.channel_id) || plan.set(r.channel_id, []).get(r.channel_id)).push(r.slot_ms);
  const byTitle = new Map(ext.filter(c => c.platform === 'youtube').map(c => [norm(c.title), c])), used = new Set();
  const add = (id, platform, title, tz, ms) => { const miss = gapsOf(ms, tz, now, days); rows.push({ channel_id: id, platform, title, tz, have: days - miss.length, missing: miss, last24h: posted.get(id) || 0 }); };
  for (const d of direct) { const cf = normCfg(cfg.get(d.channel_id) || {}); if (cf.active === 0) continue; const g = byTitle.get(norm(d.title)); if (g) used.add(g.channel_id); add(d.channel_id, 'youtube', d.title, cf.tz, [...(plan.get(d.channel_id) || []), ...(g ? slots.get(g.channel_id) || [] : [])]); rows[rows.length - 1].last24h += (g ? posted.get(g.channel_id) || 0 : 0) + (ytDone.get(d.channel_id) || 0); }
  for (const c of ext) { if (used.has(c.channel_id)) continue; const cf = normCfg(cfg.get(c.channel_id) || {}); if (cf.active === 0) continue; add(c.channel_id, c.platform, c.title, cf.tz, slots.get(c.channel_id)); }
  const per = {}; for (const r of rows) { const x = per[r.platform] || (per[r.platform] = { channels: 0, have: 0 }); x.channels++; x.have += r.have; }
  const platforms = Object.entries(EXPECT).map(([p, want]) => { const x = per[p] || { channels: 0, have: 0 }; return { platform: p, want, channels: x.channels, have: x.have, total: want * days, unconnected: Math.max(0, want - x.channels) }; });
  return { days, at: now, channels: rows.length, rows, platforms, short: rows.filter(r => r.missing.length).length, idle24: rows.filter(r => !r.last24h).length };
}
