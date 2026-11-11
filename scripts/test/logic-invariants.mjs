// Bất biến logic dò ngẫu nhiên (property-based, 0 phụ thuộc) cho lõi học web/js/core.js – nguồn cho trục "Lỗi tiềm ẩn & logic" của Top-1 score
// (docs/TOP1-SCORE.md). Hạt giống cố định → lặp lại được; chạy lại ở 4 múi giờ (có DST, lệch 30 phút) vì chuỗi ngày dựa vào giờ máy.
//  FSRS: S > 0, 1 ≤ D ≤ 10, không NaN, due > lúc ôn, ôn theo ngày 1 ≤ interval ≤ 3650, Khó ≤ Nhớ < Dễ, điểm cao hơn không bao giờ hẹn sớm hơn,
//        Quên ở thẻ đã thuộc → lapses +1 và về bước học, khả năng nhớ ∈ (0, 1], level5 ∈ 0..5 và không giảm khi interval tăng.
//  Chuỗi ngày: Stats.streak = mô hình tham chiếu (đếm ngày liên tiếp lùi từ hôm nay, hôm nay chưa học vẫn giữ chuỗi), todayKey ổn định qua DST.
// Chạy: node scripts/test/logic-invariants.mjs [--json]   (--json: in 1 dòng {pass, fail, checks} cho scripts/top1/score.mjs)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ZONES = ['UTC', 'America/New_York', 'Asia/Ho_Chi_Minh', 'Australia/Lord_Howe'];
const JSON_OUT = process.argv.includes('--json');

export function loadCore() {
  const ctx = { console, Math, Date, JSON, Promise, setTimeout, clearTimeout };
  ctx.self = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'web/js/core.js'), 'utf8'), ctx);
  return { Core: ctx.Core, ctx };
}
export function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
/** Mô hình tham chiếu chuỗi ngày: bước theo ngày lịch (không cộng 86400000 ms – sai ở ngày đổi giờ). */
export function refStreak(days, todayKey, now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  if (!days[todayKey(d)]) d.setDate(d.getDate() - 1);
  let n = 0; while (days[todayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function run({ Core, ctx }, { seed = 20261103, cases = 400 } = {}) {
  const fails = [], checks = { n: 0 };
  const ok = (c, m) => { checks.n++; if (!c && fails.length < 20) fails.push(m); };
  const { SRS, Stats, todayKey, DAY } = Core, r = rng(seed);
  const fin = x => typeof x === 'number' && Number.isFinite(x);
  // --- FSRS
  for (let c = 0; c < cases; c++) {
    let s = SRS.newState(), now = Date.UTC(2026, 0, 1) + Math.floor(r() * 300) * DAY;
    s.due = now;
    for (let step = 0; step < 25; step++) {
      const g = Math.floor(r() * 4), wasReview = s.reps > 0, lapses = s.lapses || 0;
      if (wasReview && s.S != null) {
        const iv = SRS._reviewIvls(s, now); ok(iv[2].ivl <= iv[3].ivl && iv[3].ivl < iv[4].ivl, `#${c}.${step} Khó ≤ Nhớ < Dễ: ${iv[2].ivl}/${iv[3].ivl}/${iv[4].ivl}`);
        const dues = [1, 2, 3].map(G => SRS.review(JSON.parse(JSON.stringify(s)), G, now, true).due);
        ok(dues[0] <= dues[1] && dues[1] <= dues[2], `#${c}.${step} điểm cao hơn hẹn sớm hơn: ${dues.join('/')}`);
      }
      s = SRS.review(s, g, now, r() < 0.5);
      ok(fin(s.S) && s.S > 0, `#${c}.${step} S = ${s.S}`); ok(fin(s.D) && s.D >= 1 && s.D <= 10, `#${c}.${step} D = ${s.D}`);
      ok(fin(s.due) && s.due > now, `#${c}.${step} due ≤ lúc ôn`); ok(s.last === now, `#${c}.${step} last`);
      if (s.reps > 0) ok(Number.isInteger(s.interval) && s.interval >= 1 && s.interval <= 3650, `#${c}.${step} interval = ${s.interval}`);
      if (wasReview && g === 0) ok(s.lapses === lapses + 1 && s.reps === 0 && s.step === 0, `#${c}.${step} Quên → lapses+1, về bước học`);
      const later = now + Math.floor(r() * 400) * DAY + Math.floor(r() * DAY), R = SRS.retention(s, later);
      ok(R == null || (fin(R) && R > 0 && R <= 1), `#${c}.${step} retention = ${R}`);
      const lv = SRS.level5(s); ok(Number.isInteger(lv) && lv >= 0 && lv <= 5, `#${c}.${step} level5 = ${lv}`);
      now = r() < 0.7 ? Math.max(now + 60e3, s.due + Math.floor((r() - 0.3) * 3 * DAY)) : now + Math.floor(r() * 30) * 60e3 + 60e3;
    }
  }
  for (let i = 1; i < 3650; i += 37) ok(SRS.level5({ last: 1, reps: 1, interval: i }) <= SRS.level5({ last: 1, reps: 1, interval: i + 37 }), `level5 giảm khi interval ${i} → ${i + 37}`);
  // --- chuỗi ngày
  for (let c = 0; c < cases; c++) {
    const now = new Date(2026, Math.floor(r() * 12), 1 + Math.floor(r() * 28), Math.floor(r() * 24), Math.floor(r() * 60));
    const days = {}, d = new Date(now); d.setHours(12);
    for (let i = 0; i < 60; i++) { if (r() < 0.8) days[todayKey(d)] = 1 + Math.floor(r() * 5); d.setDate(d.getDate() - 1); }
    const RealDate = ctx.Date; let got; // core.js đọc Date của ngữ cảnh vm → giả "bây giờ" ở đó
    try { ctx.Date = class extends RealDate { constructor(...a) { a.length ? super(...a) : super(now.getTime()); } static now() { return now.getTime(); } }; got = Stats.streak({ days }); }
    finally { ctx.Date = RealDate; }
    ok(got === refStreak(days, todayKey, now), `chuỗi #${c} ${now.toISOString()}: ${got} ≠ ${refStreak(days, todayKey, now)}`);
  }
  // todayKey: 48 mốc 30 phút mỗi ngày của cả năm → đúng 1 khoá/ngày lịch, tăng dần, định dạng YYYY-MM-DD
  let prev = '', seen = new Set();
  for (let t = new Date(2026, 0, 1).getTime(); t < new Date(2027, 0, 1).getTime(); t += 30 * 60e3) {
    const k = todayKey(new Date(t)); ok(/^\d{4}-\d{2}-\d{2}$/.test(k) && k >= prev, `todayKey lùi/sai dạng: ${prev} → ${k}`); prev = k; seen.add(k);
  }
  ok(seen.size === 365, `todayKey: ${seen.size} ngày trong 2026 (≠ 365)`);
  return { pass: checks.n - fails.length, fail: fails.length, checks: checks.n, fails };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.env.LI_CHILD) { // 1 múi giờ, Date của vm dùng chung TZ tiến trình
    const out = run(loadCore());
    process.stdout.write(JSON.stringify(out));
    process.exit(0);
  }
  let pass = 0, fail = 0, checks = 0; const fails = [];
  for (const tz of ZONES) {
    const p = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], { env: { ...process.env, TZ: tz, LI_CHILD: '1' }, encoding: 'utf8', timeout: 120e3 });
    let o; try { o = JSON.parse(p.stdout); } catch { o = { pass: 0, fail: 1, checks: 1, fails: [`không chạy được: ${(p.stderr || '').slice(0, 300)}`] }; }
    pass += o.pass; fail += o.fail; checks += o.checks; for (const f of o.fails) fails.push(`[${tz}] ${f}`);
  }
  if (JSON_OUT) console.log(JSON.stringify({ pass, fail, checks, fails: fails.slice(0, 10) }));
  else if (fail) { console.error(`✗ logic-invariants: ${fail}/${checks} bất biến trượt\n  ` + fails.slice(0, 15).join('\n  ')); }
  else console.log(`✓ logic-invariants: ${checks} bất biến FSRS + chuỗi ngày + todayKey đạt ở ${ZONES.length} múi giờ`);
  process.exit(fail ? 1 : 0);
}
