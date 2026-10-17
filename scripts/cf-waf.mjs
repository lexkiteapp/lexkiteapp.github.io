// Luật Cloudflare chống cào nội dung lexkite.com dưới dạng mã (idempotent). Luật dựng ở scripts/lib/cf-waf-rules.mjs.
// Dùng: node scripts/cf-waf.mjs dry-run            in luật sẽ áp (che header bí mật) – không cần token
//       node scripts/cf-waf.mjs perms              token hiện tại làm được gì (đọc WAF/rate limit/bot/hotlink)
//       node scripts/cf-waf.mjs apply [--rl-action block] [--rl-requests 40]   ghi luật (giữ nguyên luật không phải lexkite_*)
//       node scripts/cf-waf.mjs verify [--live]    so luật đang chạy với bản mong muốn (+ --live: gửi request thử thật)
//       node scripts/cf-waf.mjs live               chỉ gửi request thử thật (không cần token; cần header CI) – CI hằng tuần
// Token: CF_WAF_TOKEN hoặc ~/.config/lexkite/cf-waf-token (quyền Zone WAF Edit + Zone Read), dự phòng ~/.config/lexkite/cf-token.
// Header CI: LEXKITE_CI_HEADER hoặc ~/.config/lexkite/ci-header (cùng giá trị secret GitHub LEXKITE_CI_HEADER). Không bao giờ in token/secret.
import fs from 'node:fs'; import os from 'node:os'; import { execFileSync } from 'node:child_process';
import { buildRules, mergeRules, sameRules, mask, CI_HEADER, REF } from './lib/cf-waf-rules.mjs';

const args = process.argv.slice(2), cmd = args[0] || 'dry-run', opt = k => { const i = args.indexOf(k); return i > 0 ? args[i + 1] : undefined; };
const ZONE = process.env.CF_ZONE_ID || '286a2bb29e2c39622e44151cbebb2fad', SITE = 'https://lexkite.com';
const readF = f => { try { return fs.readFileSync(f.replace(/^~/, os.homedir()), 'utf8').trim(); } catch { return ''; } };
const TOKEN = process.env.CF_WAF_TOKEN || readF('~/.config/lexkite/cf-waf-token') || readF('~/.config/lexkite/cf-token');
let SECRET = process.env.LEXKITE_CI_HEADER || readF('~/.config/lexkite/ci-header');
if (!SECRET && cmd === 'dry-run') SECRET = 'PLACEHOLDER_ci_header_value_000000';
const rl = { ...(opt('--rl-action') ? { action: opt('--rl-action') } : {}), ...(opt('--rl-requests') ? { requests: Number(opt('--rl-requests')) } : {}) };
const PHASES = { custom: 'http_request_firewall_custom', ratelimit: 'http_ratelimit' }, LIMIT = { custom: 5, ratelimit: 1 }; // gói Free
const out = s => console.log(mask(s, SECRET));

// curl thay fetch (proxy máy cá nhân chặn DNS của Node); token truyền qua stdin (-K -) để không lộ trong danh sách tiến trình
function cf(method, p, body) {
  const conf = `header = "Authorization: Bearer ${TOKEN}"\nheader = "Content-Type: application/json"\n`;
  const a = ['-s', '-K', '-', '-X', method, `https://api.cloudflare.com/client/v4${p}`, ...(body ? ['--data-binary', '@-'] : [])];
  // -K - và @- cùng đọc stdin → gửi body qua file tạm
  let tmp; if (body) { tmp = fs.mkdtempSync(`${os.tmpdir()}/cfwaf-`) + '/b.json'; fs.writeFileSync(tmp, JSON.stringify(body), { mode: 0o600 }); a.splice(a.indexOf('@-'), 1, `@${tmp}`); }
  try { const r = JSON.parse(execFileSync('curl', a, { input: conf, maxBuffer: 20e6 }).toString() || '{}'); return r; }
  catch (e) { return { success: false, errors: [{ message: e.message }] }; } finally { if (tmp) fs.rmSync(tmp, { force: true }); }
}
const errs = r => (r.errors || []).map(e => `${e.code || ''} ${e.message}`).join('; ');
const getPhase = ph => { const r = cf('GET', `/zones/${ZONE}/rulesets/phases/${ph}/entrypoint`); if (r.success) return { ok: true, rules: r.result.rules || [] }; return { ok: false, notFound: /10003|not found/i.test(errs(r)), why: errs(r) }; };

function perms() {
  if (!TOKEN) { console.log('✗ không có token'); return {}; }
  const v = cf('GET', '/user/tokens/verify'), res = { token: v.success ? v.result.status : 'invalid' };
  for (const [k, ph] of Object.entries(PHASES)) { const g = getPhase(ph); res[k] = g.ok || g.notFound ? 'đọc được' : `KHÔNG (${g.why})`; }
  const bm = cf('GET', `/zones/${ZONE}/bot_management`); res.bot_management = bm.success ? `fight_mode=${bm.result.fight_mode}` : `KHÔNG (${errs(bm)})`;
  const hl = cf('GET', `/zones/${ZONE}/settings/hotlink_protection`); res.hotlink = hl.success ? hl.result.value : `KHÔNG (${errs(hl)})`;
  for (const [k, v2] of Object.entries(res)) console.log(`· ${k}: ${v2}`);
  if (/fight_mode=true/.test(res.bot_management)) console.log('⚠ Bot Fight Mode đang BẬT – gói Free không miễn trừ được bằng luật, sẽ chặn GitHub Actions/add-on gọi /api/*. Tắt: Security → Bots → Bot Fight Mode → Off.');
  return res;
}

function apply() {
  const want = buildRules({ ciSecret: SECRET, rl });
  for (const [k, ph] of Object.entries(PHASES)) {
    const g = getPhase(ph);
    if (!g.ok && !g.notFound) { console.error(`✗ ${ph}: ${g.why}\n  → token thiếu quyền "Zone · Zone WAF · Edit" (xem docs/CONTENT-PROTECTION.md §Việc của chủ site)`); process.exit(1); }
    const rules = mergeRules(g.rules || [], want[k]);
    if (rules.length > LIMIT[k]) { console.error(`✗ ${ph}: ${rules.length} luật > giới hạn gói Free ${LIMIT[k]} – gỡ bớt luật không phải ${REF}* trước (dashboard)`); process.exit(1); }
    if (g.ok && sameRules(g.rules, want[k])) { console.log(`· ${ph}: đã đúng, không đổi`); continue; }
    const r = cf('PUT', `/zones/${ZONE}/rulesets/phases/${ph}/entrypoint`, { rules });
    if (!r.success) { console.error(`✗ ${ph}: ${mask(errs(r), SECRET)}${k === 'ratelimit' ? '\n  → gói Free có thể không cho hành động này: thử --rl-action block' : ''}`); process.exit(1); }
    console.log(`✓ ${ph}: ${want[k].map(x => x.ref).join(', ')} (tổng ${rules.length} luật)`);
  }
  return verify();
}

function live() {
  const code = (p, ua, ci) => execFileSync('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-A', ua, ...(ci ? ['-K', '-'] : []), SITE + p], { input: ci ? `header = "${CI_HEADER}: ${SECRET}"\n` : '' }).toString();
  const T = [ // [mô tả, path, UA, gửi header CI, kỳ vọng]
    ['trình duyệt đọc blog', '/vi/blog/', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36', false, c => c === '200'],
    ['python-requests đọc blog → chặn', '/vi/blog/', 'python-requests/2.32', false, c => c === '403'],
    ['python-requests + header CI → qua', '/vi/blog/', 'python-requests/2.32', true, c => c === '200'],
    ['python-requests vào RSS → qua', '/vi/blog/rss.xml', 'python-requests/2.32', false, c => c === '200'],
    ['python-requests vào /sw.js → không bị WAF chặn', '/sw.js', 'python-requests/2.32', false, c => c !== '403'],
    ['UA trống vào /api/hit → không bị WAF chặn', '/api/hit', '', false, c => c !== '403'],
  ];
  let bad = 0; for (const [d, p, ua, ci, ok] of T) { const c = code(p, ua, ci); if (!ok(c)) bad++; console.log(`${ok(c) ? '✓' : '✗'} ${d}: HTTP ${c}`); }
  return bad;
}

function verify() {
  const want = buildRules({ ciSecret: SECRET, rl }); let bad = 0;
  for (const [k, ph] of Object.entries(PHASES)) {
    const g = getPhase(ph);
    if (!g.ok) { console.log(`✗ ${ph}: ${g.notFound ? 'chưa có luật' : g.why}`); bad++; continue; }
    const ok = sameRules(g.rules, want[k]); if (!ok) bad++;
    console.log(`${ok ? '✓' : '✗'} ${ph}: ${g.rules.filter(r => r.ref?.startsWith(REF)).map(r => r.ref).join(', ') || '(không có luật lexkite_*)'}`);
  }
  if (args.includes('--live')) bad += live();
  if (bad) { console.error(`✗ cf-waf verify: ${bad} mục chưa khớp`); process.exit(1); }
  console.log('✓ cf-waf verify: khớp'); return 0;
}

if (cmd === 'live') { if (!SECRET) { console.error('✗ thiếu LEXKITE_CI_HEADER'); process.exit(1); } const b = live(); if (b) { console.error(`✗ cf-waf live: ${b} kiểm tra sai`); process.exit(1); } console.log('✓ cf-waf live: WAF hoạt động đúng'); }
else if (cmd === 'dry-run') { const r = buildRules({ ciSecret: SECRET, rl }); out(JSON.stringify(r, null, 1)); console.log(`· ${r.custom.length} luật custom (giới hạn Free 5) · ${r.ratelimit.length} luật rate limit (giới hạn Free 1) · độ dài biểu thức max ${Math.max(...[...r.custom, ...r.ratelimit].map(x => x.expression.length))}/4096`); }
else if (!TOKEN) { console.error('✗ thiếu token Cloudflare (CF_WAF_TOKEN hoặc ~/.config/lexkite/cf-waf-token)'); process.exit(1); }
else if (cmd === 'perms') perms();
else if (!SECRET) { console.error('✗ thiếu LEXKITE_CI_HEADER (~/.config/lexkite/ci-header)'); process.exit(1); }
else if (cmd === 'apply') apply();
else if (cmd === 'verify') verify();
else { console.error('Lệnh: dry-run | perms | apply | verify [--live]'); process.exit(2); }
