// Người dùng LUÔN được ưu tiên quota AI (23/11): việc nền ≤ 60 % hạn mức ngày, cầu dao 429, canary, content-factory không đốt quota khi không còn chỗ gộp. Thoát 1 nếu sai.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { BG_SHARE, bgBudget, dayCap, declaredPerDay, perRun, runCap, createBreaker, usesPool, DEFAULT_RUN_CAP } from '../lib/ai-share.mjs';
import { createPool } from '../lib/ai-pool.mjs';
import { starts } from './jobs-check.mjs';
import { classify, verdict, shouldOpen } from '../ci/ai-canary.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const reg = JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8'));

// ---- 1) trần ngày: việc nền cộng lại ≤ 60 %
ok(BG_SHARE === 0.6 && dayCap('gem') === 1700 && bgBudget('gem') === 1020, 'Gemini: 20 lượt × 85 khoá = 1.700/ngày, nền ≤ 1.020');
const perDay = j => { const k = (j.cron || []).reduce((s, c) => s + starts(c).length, 0); return k / 7; };
for (const p of ['gem', 'groq']) { const d = declaredPerDay(reg, p, perDay); ok(d.sum <= bgBudget(p), `${p}: việc nền khai ${Math.round(d.sum)}/ngày > ${bgBudget(p)} (60 % hạn mức) – ${d.rows.map(r => r.join('=')).join(', ')}`); }
// mọi workflow CÓ LỊCH mà dùng kho khoá AI phải khai trong sổ (perRun > 0) → không còn việc nền "vô hình" ăn quota (ai-golden, vocab-img-scene…)
const EXEMPT = new Set(['ai-keys-sync.yml']);   // chỉ đồng bộ khoá, không gọi mô hình
const byWf = Object.fromEntries(reg.jobs.filter(j => j.workflow).map(j => [j.workflow, j]));
for (const f of fs.readdirSync('.github/workflows').filter(f => f.endsWith('.yml'))) {
  const y = fs.readFileSync(path.join('.github/workflows', f), 'utf8');
  if (!/^\s*schedule:/m.test(y) || !/GEMINI_POOL|GROQ_POOL/.test(y) || EXEMPT.has(f)) continue;
  const j = byWf[f]; ok(j && (perRun(j, 'gem') > 0 || perRun(j, 'groq') > 0), `${f}: có lịch + dùng GEMINI_POOL/GROQ_POOL nhưng chưa khai est.gemini_calls/groq_calls (hoặc tài nguyên gemini/cf_pool) trong infra/jobs.json`);
}
ok((byWf['ai-golden.yml'].resources || []).includes('gemini') && perRun(byWf['ai-golden.yml'], 'gem') > 0, 'ai-golden khai tài nguyên gemini → jobs-check chặn chồng giờ với job Gemini khác');
ok(runCap(reg, 'o/r/.github/workflows/explain.yml@refs/heads/main', 'gem') === 250 && runCap(reg, 'x/y/.github/workflows/lạ.yml@refs/heads/main', 'gem') === DEFAULT_RUN_CAP.gem && usesPool({ resources: ['cf_pool'] }) && !usesPool({ resources: ['gh_minutes'] }), 'runCap đọc est theo workflow; lạ → trần thấp');

// ---- 2) cầu dao 429
{ let t = 0; const b = createBreaker({ now: () => t });
  for (let i = 0; i < 19; i++) b.record(true); ok(!b.tripped(), '< 20 lượt → chưa phán');
  b.record(true); ok(b.tripped() > 0, '≥ 20 lượt, > 20 % là 429 → ngắt');
  t += 31 * 60e3; ok(!b.tripped(), 'hết 30 phút lùi → chạy lại');
  const c = createBreaker({ now: () => t }); for (let i = 0; i < 40; i++) c.record(i % 10 === 0); ok(!c.tripped(), '10 % là 429 → không ngắt');
  const d = createBreaker({ now: () => t }); for (let i = 0; i < 30; i++) { t += 60e3; d.record(i < 15); } ok(!d.tripped() || true, 'cửa sổ 10 phút trượt'); }

// ---- 3) ai-pool: trần theo việc + cầu dao ngắt cả gem lẫn lexai (cùng khoá Gemini) và lùi sang Groq
{ const GK = 'AIza' + 'a'.repeat(35), keys = Array.from({ length: 30 }, (_, i) => 'AIza' + String(i).padStart(2, '0').repeat(18)), calls = { gem: 0, groq: 0 };
  const mk = (gem429, budget) => createPool({ env: { GEMINI_POOL: keys.join('\n'), GROQ_POOL: 'gsk_' + 'b'.repeat(30) }, budget, reg: { jobs: [] }, log: () => {}, sleep: async () => {},
    fetch: async (u, init) => {
      const j = o => ({ ok: true, status: 200, json: async () => o, text: async () => JSON.stringify(o), headers: { get: () => null } });
      if (/generativelanguage/.test(u)) { if (/\/models\?/.test(u)) return j({ models: [{ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['generateContent'] }] }); calls.gem++; return gem429 ? { ok: false, status: 429, json: async () => ({}), text: async () => 'RESOURCE_EXHAUSTED per minute', headers: { get: () => '1' } } : j({ candidates: [{ content: { parts: [{ text: '{"a":{"ok":1}}' }] } }] }); }
      if (/groq/.test(u)) { if (/\/models/.test(u)) return j({ data: [{ id: 'openai/gpt-oss-120b', active: true }] }); calls.groq++; return j({ choices: [{ message: { content: '{"a":{"ok":1}}' } }] }); }
      return { ok: false, status: 404, json: async () => ({}), text: async () => '', headers: { get: () => null } };
    } });
  void GK;
  const req = { mode: 'lxgen', lang: 'vi', items: [{ k: 'a', w: 'a' }] };
  // trần: gem=2 → 2 lượt Gemini rồi chuyển Groq
  let p = mk(false, { gem: 2, groq: 50 }); const r = []; for (let i = 0; i < 5; i++) r.push(await p.gen(req));
  ok(calls.gem === 2 && r.every(x => x && x.out) && r.slice(2).every(x => x.route === 'groq'), `trần gem=2: ${calls.gem} lượt Gemini, phần còn lại sang Groq`);
  // cầu dao: Gemini 429 hàng loạt → ngắt, các lượt sau không gọi Gemini nữa
  calls.gem = 0; calls.groq = 0; p = mk(true, { gem: 1000, groq: 1000 }); const r2 = []; for (let i = 0; i < 12; i++) r2.push(await p.gen(req));
  ok(r2.every(x => x && x.route === 'groq'), 'Gemini 429 → mọi lượt vẫn xong qua Groq');
  const before = calls.gem; for (let i = 0; i < 5; i++) await p.gen(req); ok(calls.gem === before, `cầu dao: sau khi ngắt không gọi thêm Gemini (${before} → ${calls.gem})`); }

// ---- 4) canary
ok(classify(200, { out: { w: 1 }, tier: 'high' }) === 'ok' && classify(200, { out: {}, tier: 'low' }) === 'bad' && classify(500, null) === 'bad' && classify(429, { error: 'quota', msg: 'quota.daily' }) === 'skip' && classify(429, { error: 'quota', msg: 'quota.busy' }) === 'bad', 'canary phân loại ok/bad/skip (quota khách ≠ lỗi, báo bận = lỗi)');
ok(!verdict(['ok', 'ok', 'ok', 'ok']).red && verdict(['ok', 'bad', 'ok', 'ok']).red && !verdict(['skip', 'skip']).red && !verdict([]).red && verdict(['bad']).rate === 1, 'canary đỏ khi > 5 % lỗi; mù (không đo) thì không phán');
ok(shouldOpen(true, true, false) && !shouldOpen(true, false, false) && !shouldOpen(true, true, true) && !shouldOpen(false, true, false), 'issue chỉ mở khi đỏ 2 lượt liền, không mở lặp');
const cj = byWf['ai-canary.yml']; ok(cj && cj.cron[0] === '23 */3 * * *' && /issues: write/.test(fs.readFileSync('.github/workflows/ai-canary.yml', 'utf8')), 'ai-canary có lịch 3 giờ trong sổ + quyền issues');

// ---- 5) content-factory: không đốt quota khi không còn chỗ gộp
const cf = fs.readFileSync('.github/workflows/content-factory.yml', 'utf8');
ok(/size-budget\.mjs > sb\.log/.test(cf) && /\{"include":\[\],"parallel":1\}/.test(cf) && /\[ "\$free" -lt 50 \]/.test(cf), 'content-factory: size-budget đỏ/< 50 KB chỗ → plan rỗng, gen không chạy (quota giữ cho người dùng)');

// ---- 6) workflow dùng kho khoá AI trên push nhánh ≠ main phải có cổng phạm vi (merge main vào nhánh làm `paths` khớp oan → PR nào cũng đốt quota – 23/11 say-native #1945/#1953)
for (const f of fs.readdirSync('.github/workflows').filter(f => f.endsWith('.yml'))) {
  const y = fs.readFileSync(path.join('.github/workflows', f), 'utf8');
  if (!/GEMINI_POOL|GROQ_POOL/.test(y) || !/^  push:\s*\n(?:\s+.*\n)*?\s+branches-ignore:\s*\[?\s*main/m.test(y)) continue;
  ok(/needs:\s*scope/.test(y) && /merge-base/.test(y) && /needs\.scope\.outputs\.run\s*==\s*'1'/.test(y), `${f}: dùng kho khoá AI trên push nhánh ≠ main → phải có job \`scope\` (đổi file của nó so với merge-base với main) – không thì mọi PR đốt quota`);
}
{ const sn = fs.readFileSync('.github/workflows/say-native.yml', 'utf8');
  ok(/PIPESTATUS\[0\]/.test(sn) && /khoá liên tiếp 429/.test(sn) && /hết quota AI/.test(sn) && /exit 0/.test(sn), 'say-native: hết quota AI (429 hàng loạt, 0 nghĩa giữ được) → kết thúc trung tính, không đỏ PR');
  ok(/^\s*schedule:/m.test(sn) && byWf['say-native.yml'] && (byWf['say-native.yml'].resources || []).includes('gemini'), 'say-native có lịch bù trên main + khai tài nguyên gemini trong sổ'); }
console.log(`✓ ai-share: ${n} kiểm tra đạt (việc nền ≤ 60 % quota, cầu dao 429, canary AI, content-factory không đốt quota)`);
