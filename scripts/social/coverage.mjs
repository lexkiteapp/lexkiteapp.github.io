// CI hằng ngày (social-coverage.yml): mỗi kênh đang bật phải có bài MỖI ngày trong 30 ngày tới (owner 16/11). POST /api/social-auto op coverage (ký HMAC, chỉ đọc D1).
// Máy gác luật 1 video/kênh/ngày: kênh-ngày trống trong NEAR_DAYS (7) ngày tới → ĐỎ (exit 1) + issue social-alert; trống ở ngày 8–30 → cảnh báo issue (không đỏ). Dùng: node scripts/social/coverage.mjs
import { driveCliKey, driveSign } from '../video/library.mjs';
import { alert } from './alert.mjs';
import { run as audit } from './audit.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, ''), key = driveCliKey();
const ranges = days => { const out = []; let a = null, b = null; for (const d of days) { if (a && Date.parse(d) - Date.parse(b) === 864e5) { b = d; continue; } if (a) out.push(a === b ? a : a + '..' + b); a = b = d; } if (a) out.push(a === b ? a : a + '..' + b); return out; };
const weekly = j => ['| nền tảng | kênh nối/cần | trang-ngày có lịch | kênh còn trống |', '|---|---|---|---|', ...(j.platforms || []).map(p => `| ${p.platform} | ${p.channels}/${p.want} | ${p.have}/${p.total} | ${(j.rows || []).filter(r => r.platform === p.platform && r.missing.length).length} |`), '', '| kênh | nền | có lịch/' + j.days + ' | trống |', '|---|---|---|---|', ...(j.rows || []).map(r => `| ${r.title} | ${r.platform} | ${r.have} | ${r.missing.length ? ranges(r.missing).slice(0, 4).join(', ') : '—'} |`)].join('\n');
export const NEAR_DAYS = 7;
/** Ngày trống GẦN (≤ NEAR_DAYS ngày kể từ hôm nay UTC) theo từng kênh – đây là điều làm máy gác đỏ. */
export const near = (j, now = j.at || Date.now()) => { const lim = new Date(now + NEAR_DAYS * 864e5).toISOString().slice(0, 10); return (j.rows || []).map(r => ({ ...r, gap: r.missing.filter(d => d <= lim) })).filter(r => r.gap.length); };
export const WARN_DAYS = 14;   // cảnh báo SỚM: kênh nào hết lịch trong ≤ 14 ngày tới (còn ≥ 7 ngày trước khi thành ngày trống đỏ) → báo ngay để dựng clip kịp (23/11)
/** Số ngày lịch còn phủ liên tục từ hôm nay (ngày trống đầu tiên); kênh còn ≤ WARN_DAYS ngày → cần dựng thêm clip trước khi thành đỏ. */
export const runway = (j, now = j.at || Date.now()) => (j.rows || []).map(r => { const first = [...r.missing].sort()[0]; return { ...r, left: first ? Math.max(0, Math.floor((Date.parse(first) - Date.parse(new Date(now).toISOString().slice(0, 10))) / 864e5)) : j.days || 30 }; }).filter(r => r.left <= WARN_DAYS).sort((a, b) => a.left - b.left);
const matrix = (j, nr) => ['| kênh | nền | trống ' + NEAR_DAYS + ' ngày tới |', '|---|---|---|', ...nr.map(r => `| ${r.title} | ${r.platform} | ${ranges(r.gap).join(', ')} |`)].join('\n');
export const report = j => {
  const bad = (j.rows || []).filter(r => r.missing.length), lines = [`Lịch ${j.days} ngày tới: ${j.channels - bad.length}/${j.channels} kênh đủ mỗi ngày 1 bài; ${bad.length} kênh còn trống.`];
  for (const r of bad) lines.push(`- ${r.platform} · ${r.title} (${r.channel_id}): ${r.have}/${j.days} ngày · trống ${ranges(r.missing).slice(0, 6).join(', ')}${ranges(r.missing).length > 6 ? ' …' : ''}`);
  const idle = (j.rows || []).filter(r => !r.last24h); if (idle.length) lines.push(`⚠ ${idle.length} kênh KHÔNG có bài nào đã đẩy/đăng trong 24 giờ qua: ${idle.slice(0, 12).map(r => r.title).join(', ')}${idle.length > 12 ? ' …' : ''}`);
  const miss = (j.platforms || []).filter(p => p.unconnected); for (const p of miss) lines.push(`- ${p.platform}: mới nối ${p.channels}/${p.want} kênh → thiếu ${p.unconnected} kênh (${p.unconnected * j.days} ${'trang-ngày'} chưa thể có lịch)`);
  return { bad, miss, idle, text: lines.join('\n'), table: weekly(j) };
};
if (process.argv[1] && /(^|[\\/])coverage\.mjs$/.test(process.argv[1])) {
  if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
  const text = JSON.stringify({ op: 'coverage' });
  const r = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(60e3) }).catch(() => null);
  let fillNote = null; const j = r ? await r.json().catch(() => ({})) : {};
  if (r && r.status === 429) { console.log('⏭ bỏ qua:', j.error || 429); process.exit(0); }
  if (!r || !r.ok) { console.error('✗ coverage', r ? r.status : 'fetch', j.error || ''); process.exit(1); }
  let jj = j; // máy gác tự lấp: có ngày trống gần → autofill (duyệt thêm + xếp lịch) rồi ĐO LẠI; chỉ báo đỏ phần mà kho clip thật sự không đủ
  if (near(j).length) {
    const ft = JSON.stringify({ op: 'autofill' }), fr = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, ft) }, body: ft, signal: AbortSignal.timeout(90e3) }).catch(() => null), fj = fr ? await fr.json().catch(() => ({})) : {};
    console.log('autofill:', fr ? fr.status : 'fetch-fail', JSON.stringify(fj).slice(0, 400)); fillNote = fj;
    const t2 = JSON.stringify({ op: 'coverage' }), r2 = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, t2) }, body: t2, signal: AbortSignal.timeout(60e3) }).catch(() => null);
    if (r2 && r2.ok) { const j2 = await r2.json().catch(() => null); if (j2 && j2.rows) jj = j2; }
  }
  const { bad, miss, idle, text: out, table } = report(jj); console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Lịch đăng 30 ngày\n```\n' + out + '\n```\n');
  if (process.env.WEEKLY === '1' || new Date().getUTCDay() === 1) await alert({ k: 'coverage-weekly', text: 'Bảng phủ lịch theo trang (mỗi tuần):\n\n' + table, at: Date.now() });
  if (idle.length) await alert({ k: 'channel-idle-24h', text: `${idle.length} kênh không có bài nào trong 24 giờ qua (đẩy/đăng): ` + idle.map(r => `${r.platform} · ${r.title}`).join('; ') + '\n\nKiểm: Quản trị › Video & Social › Hàng đợi (bài nháp chờ duyệt?), autopub từng nền tảng, kênh GrabCast/Meta đã nối?', at: Date.now() });
  if (bad.length || miss.length) await alert({ k: 'coverage-gap', text: out + '\n\nLấp: plan_run từ kho clip (Quản trị › Video & Social › Phân phối) hoặc thêm clip bản ngữ cho trang ngôn ngữ.', at: Date.now() });
  const rw = runway(jj);
  if (rw.length) { const m = ['| kênh | nền | lịch còn phủ (ngày) |', '|---|---|---|', ...rw.map(r => `| ${r.title} | ${r.platform} | ${r.left} |`)].join('\n'); console.log(`⚠ ${rw.length} kênh sắp hết lịch (≤ ${WARN_DAYS} ngày):\n` + m); await alert({ k: 'coverage-runway', text: `⚠ ${rw.length} kênh chỉ còn lịch ≤ ${WARN_DAYS} ngày – dựng thêm clip bản ngữ NGAY (còn ≥ ${WARN_DAYS - NEAR_DAYS} ngày trước khi thành ngày trống):\n\n` + m, at: Date.now() }); }
  const nr = near(jj);
  if (nr.length) { const m = matrix(jj, nr); console.error(`✗ ${nr.length} kênh có ngày TRỐNG trong ${NEAR_DAYS} ngày tới (luật 1 video/kênh/ngày):\n` + m); if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ✗ Ngày trống ${NEAR_DAYS} ngày tới\n` + m + '\n'); await alert({ k: 'coverage-near', text: `✗ ${nr.length} kênh có ngày trống trong ${NEAR_DAYS} ngày tới SAU khi tự lấp (${JSON.stringify(fillNote && fillNote.skipped || {})}) – kho clip bản ngữ không đủ, cần dựng thêm:\n\n` + m, at: Date.now() }); }
  if (idle.length) console.error(`✗ ${idle.length} kênh không có bài trong 24 giờ qua`);
  const bad2 = await audit(14);   // 23/11: đúng page · ngôn ngữ · giờ cao điểm (cùng máy gác, đỏ khi còn lệch)
  if (nr.length || idle.length || bad2) process.exit(1);
}
