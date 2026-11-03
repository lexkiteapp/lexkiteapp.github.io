/* Canh dòng đọc/ghi D1 trong ngày → báo chủ ở 50 % và 75 % (sự cố 03/11/2026: mình "mù" tới khi Cloudflare gửi thư 90 %).
 * Gói Paid (tài khoản chính từ 03/11): bậc tính trên DỰ BÁO cuối tháng / phần đã gồm (25 tỷ đọc, 50 triệu ghi); 50/75 % báo 1 lần/THÁNG;
 * bậc 1 = TRẦN CHI TIÊU (dự báo vượt phần đã gồm → tốn tiền thật, vd. vòng lặp lỗi) báo ngay, kể cả giờ yên lặng, 1 lần/ngày.
 * Gọi từ POST /api/cron-kick (Worker lexkite-cronkick, 30 phút/lần) và lười từ Quản trị › Kho Drive (drive.js d1Alert).
 * Chuẩn thông báo (memory notifications-ux): MỘT thư cho mỗi bậc mỗi ngày UTC (tối đa 2 thư/ngày), bậc đã báo không báo lại;
 * 50 % (thông tin) tôn trọng giờ yên lặng 22:00–07:00 giờ VN (chỉ chuông, thư dời tới khi hết yên lặng nếu vẫn còn trong ngày);
 * 75 % (khẩn) gửi ngay. Chuông Quản trị 'd1' luôn cập nhật; dưới 50 % → gỡ. Không chạm D1 ngoài vài câu theo khoá (drive_meta, drive_alerts).
 * Số liệu: d1Usage() (Cloudflare GraphQL d1AnalyticsAdaptiveGroups, cả tài khoản). Thiếu CF_ANALYTICS_TOKEN → { skip:'no-analytics' } (không đoán bằng số tự đếm). */
import { d1Usage, WARN_PCTS, SHED_PCT, D1_PAID, day, month, secsToReset } from './_d1guard.js';

const QUIET = [22, 7]; // giờ VN (UTC+7)
export const quietVN = (now = Date.now()) => { const h = new Date(now + 7 * 3600e3).getUTCHours(); return h >= QUIET[0] || h < QUIET[1]; };
/** Bậc cao nhất đã chạm: 0 | 0.5 | 0.75 */
export const levelOf = ratio => WARN_PCTS.filter(p => ratio >= p).pop() || 0;
/** Dự báo giờ (UTC) chạm 100 % theo tốc độ trung bình từ 00:00Z – null nếu không chạm trước khi đặt lại. */
export function etaFull(ratio, now = Date.now()) {
  const start = Date.parse(day(now) + 'T00:00:00Z'), el = now - start; if (!(ratio > 0) || el < 30 * 60e3) return null;
  const t = start + el / ratio; return t < start + 86400e3 ? new Date(t).toISOString().slice(11, 16) + 'Z' : null;
}
const fmt = n => (n >= 1e9 ? (n / 1e9).toFixed(2) + ' tỷ' : n >= 1e6 ? (n / 1e6).toFixed(2) + ' M' : Math.round(n / 1e3) + 'k');
export function message(u, lvl, now = Date.now()) {
  const pct = Math.round(u.ratio * 100), w = u.kind === 'writes', kind = w ? 'ghi' : 'đọc';
  if (u.plan === 'paid') {
    const proj = w ? u.projWrites : u.projReads, inc = w ? D1_PAID.writes : D1_PAID.reads, today = w ? u.writes : u.reads, mtd = w ? u.mWrites : u.mReads;
    const over = Math.max(0, proj - inc), usd = over / 1e6 * (w ? D1_PAID.usd.writesPerM : D1_PAID.usd.readsPerM);
    const subject = lvl >= 1 ? `[Lexkite] ⚠️ D1 sắp TỐN TIỀN: dự báo ${pct} % phần đã gồm (${kind})` : `[Lexkite] D1 dự báo tháng ${pct} % phần đã gồm (${kind})`;
    const text = [`D1 (gói Paid): tháng ${month(now)} đã ${kind} ${fmt(mtd)} dòng, hôm nay ${fmt(today)}; dự báo cuối tháng ${fmt(proj)}/${fmt(inc)} (${pct} %).`,
      lvl >= 1 ? `Vượt phần đã gồm ≈ ${fmt(over)} dòng ≈ ${usd.toFixed(2)} USD. Kiểm vòng lặp/nguồn đọc ngay (Quản trị › Hạn mức, node scripts/capacity/d1-sources.mjs).` : 'Chưa tốn thêm tiền – đây là báo sớm.',
      `Từ ${Math.round(SHED_PCT * 100)} %: Quản trị và thông báo tự trả số liệu đệm; đồng bộ thẻ, đăng nhập, tiến độ học vẫn chạy.`].join('\n');
    return { subject, text, pct };
  }
  const n = w ? `${Math.round((u.writes || 0) / 1e3)}k/100k` : `${(u.reads / 1e6).toFixed(2)} M/5 M`;
  const eta = etaFull(u.ratio, now), h = Math.round(secsToReset(now) / 360) / 10;
  const subject = `[Lexkite] D1 đã dùng ${pct} % hạn mức ${kind} hôm nay`;
  const text = [`D1 lexkite-sync: ${n} dòng ${kind} (${pct} %) lúc ${new Date(now).toISOString().slice(11, 16)}Z; hạn mức đặt lại sau ~${h} giờ (00:00 UTC).`,
    eta ? `Theo tốc độ hiện tại sẽ chạm 100 % khoảng ${eta}.` : 'Theo tốc độ hiện tại sẽ không chạm 100 % trước khi đặt lại.',
    lvl >= 0.75 ? `Từ ${Math.round(SHED_PCT * 100)} %: Quản trị và thông báo tự trả số liệu đệm; đồng bộ thẻ, đăng nhập, tiến độ học vẫn chạy.` : 'Chưa cần làm gì – đây là báo sớm.',
    'Nguồn đọc theo câu SQL: Quản trị › Hạn mức (hoặc node scripts/capacity/d1-sources.mjs). Không tự nâng gói trả phí.'].join('\n');
  return { subject, text, pct };
}
/** → { level, mailed, skip? } — deps: { mail(subject, text) → bool, fetcher } */
export async function watchD1(env, db, now = Date.now(), deps = {}) {
  const u = await d1Usage(env, db, now, deps.fetcher || fetch, 'main');
  if (u.source !== 'cloudflare') return { skip: 'no-analytics', level: 0, mailed: false };
  const lvl = levelOf(u.ratio), paid = u.plan === 'paid';
  // Gói Paid: 50/75 % theo THÁNG (dự báo đổi chậm), trần chi tiêu theo NGÀY (tiền thật – nhắc lại mỗi ngày còn vượt); gói Free: theo ngày
  const k = paid ? (lvl >= 1 ? 'd1spend:' + day(now) : 'd1warn:' + month(now)) : 'd1warn:' + day(now);
  if (!lvl) { await db.prepare("DELETE FROM drive_alerts WHERE kind = 'd1'").run().catch(() => {}); return { level: 0, mailed: false, pct: Math.round(u.ratio * 100) }; }
  const msg = message(u, lvl, now);
  await db.prepare("INSERT INTO drive_alerts (kind, level, drive_id, msg, since, seen, mailed) VALUES ('d1', ?1, NULL, ?2, ?3, ?3, NULL) ON CONFLICT(kind) DO UPDATE SET level = excluded.level, msg = excluded.msg, seen = excluded.seen")
    .bind(lvl >= 0.75 ? 'crit' : 'warn', JSON.stringify({ t: 'd1', p: { pct: msg.pct, n: +(u.reads / 1e6).toFixed(2) }, msg: msg.text.split('\n').slice(0, lvl >= 1 ? 2 : 1).join(' ') }), now).run();
  const done = +(((await db.prepare('SELECT v FROM drive_meta WHERE k = ?').bind(k).first()) || {}).v) || 0;
  if (lvl <= done || (paid && lvl >= 1 && done)) return { level: lvl, mailed: false, pct: msg.pct, already: done };
  if (lvl < 0.75 && quietVN(now)) return { level: lvl, mailed: false, pct: msg.pct, quiet: true };
  const ok = deps.mail ? await deps.mail(msg.subject, msg.text).catch(() => false) : false;
  if (ok) await db.prepare('INSERT INTO drive_meta (k, v) VALUES (?1, ?2) ON CONFLICT(k) DO UPDATE SET v = ?2').bind(k, String(lvl)).run();
  return { level: lvl, mailed: !!ok, pct: msg.pct };
}
