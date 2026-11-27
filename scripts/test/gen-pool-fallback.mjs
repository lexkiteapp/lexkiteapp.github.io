// 🔁 target-content chịu cầu dao 429: gen.mjs có tuyến dự phòng cf2 (Workers AI kho CF_POOL), lùi theo cầu dao thật (ai-pool nextReadyMs), báo yield/lượt,
// và hết tuyến KHÔNG đỏ 'words rỗng' (run 45574279256: gem + groq cùng 429 → 6/300 từ). Ngoại tuyến, 0 mạng.
import fs from 'node:fs';
import { createPool } from '../lib/ai-pool.mjs';
import { validate } from '../target/lib.mjs';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.error('  ✗ ' + m); } };
const gen = fs.readFileSync('scripts/target/gen.mjs', 'utf8'), wf = fs.readFileSync('.github/workflows/target-content.yml', 'utf8');
ok(/budget: \{ lexai: 0, cf2: \+\(process\.env\.AI_POOL_CF2_NEURONS \|\| 0\) \}/.test(gen), 'gen.mjs: cf2 lấy trần neuron từ AI_POOL_CF2_NEURONS (không cứng 0)');
ok(/GEN_CHAIN = \['groq', 'gc-groq', \.\.\.\(\+\(process\.env\.AI_POOL_CF2_NEURONS \|\| 0\) > 0 \? \['cf2'\] : \[\]\)\]/.test(gen), 'gen.mjs: GEN_CHAIN có cf2 khi bật trần neuron');
ok(/AI\.nextReadyMs/.test(gen) && /35 \* 60e3/.test(gen), 'gen.mjs: patient() lùi theo nextReadyMs (≤ 35 phút)');
ok(/yield\/lượt/.test(gen) && /GITHUB_STEP_SUMMARY/.test(gen), 'gen.mjs: in yield/lượt + ghi step summary');
ok(/!fresh\.length && poolStop[\s\S]{0,400}process\.exit\(0\)/.test(gen), 'gen.mjs: hết tuyến ai-pool → thoát 0 (không đỏ "words rỗng")');
ok(/AI_POOL_CF2_NEURONS: '\d+'/.test(wf), 'target-content.yml: đặt AI_POOL_CF2_NEURONS cho bước sinh');
const p = createPool({ fetch: async () => { throw new Error('no net'); }, env: {}, log: () => {}, sleep: async () => {} });
ok(typeof p.nextReadyMs === 'function' && p.nextReadyMs() === 0, 'ai-pool: nextReadyMs() = 0 khi không tuyến nào nghỉ');
// AI trả exForm/ex sai kiểu → lỗi cổng, KHÔNG ném (run 45821771094 mất 161 từ vì TypeError)
{ const w = { word: 'casa', pos: 'n', gender: 'f', plural: 'casas', ipa: 'ˈkasa', gl: { en: 'house' }, ex: { es: 'Mi casa es grande.', en: 'My house is big.' } };
  let r; try { r = validate({ v: 1, tl: 'es', words: [{ ...w, exForm: ['casa'] }, { ...w, word: 'mesa', ex: { es: ['x'], en: 'y' } }] }); } catch (e) { r = null; }
  ok(Array.isArray(r) && r.filter(x => /phải là chuỗi/.test(x)).length === 2, 'validate: exForm/ex sai kiểu → báo lỗi cổng, không ném TypeError'); }
console.log(fails ? `✗ gen-pool-fallback: ${fails}/${n} lỗi` : `✓ gen-pool-fallback: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
