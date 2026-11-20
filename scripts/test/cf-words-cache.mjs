// Cổng luật cache biên trang từ (scripts/cf-words-cache.mjs): phủ ĐÚNG 13 ngôn ngữ R2, không đụng en/vi, TTL ≥ 1 giờ, mergeRules giữ luật khác.
import { rule, expression, mergeRules, REF, TTL, TTL_404 } from '../cf-words-cache.mjs';
import { R2_LANGS } from '../../functions/[lang]/words/[[path]].js';
let bad = 0; const ok = (c, m) => { if (!c) { console.log('✗ cf-words-cache: ' + m); bad++; } };
const e = expression();
for (const l of R2_LANGS) ok(e.includes(`"/${l}/words/"`), `thiếu ${l}`);
ok(R2_LANGS.length === 13 && !/"\/(en|vi)\/words\//.test(e), 'không được phủ en/vi (file tĩnh Pages)');
ok(TTL >= 3600, 'TTL quá ngắn'); ok(rule().action_parameters.cache === true && rule().expression.length < 4000, 'luật sai');
{ const t = rule().action_parameters.edge_ttl.status_code_ttl || []; ok(t.length === 1 && t[0].status_code === 404 && t[0].value === TTL_404 && TTL_404 >= 60 && TTL_404 <= 900, '404 phải có TTL ngắn (1–15 phút) để từ mới không bị kẹt'); }
ok(!('cache_key' in rule({ keyed: false }).action_parameters), 'dự phòng không khoá tuỳ chỉnh');
const m = mergeRules([{ ref: 'x', id: 1 }, { ref: REF + 'cache' }], [rule()]);
ok(m.length === 2 && m[0].ref === 'x' && !('id' in m[0]) && m[1].ref === REF + 'cache', 'mergeRules phải giữ luật khác, thay luật mình');
if (bad) process.exit(1); console.log(`✓ cf-words-cache: ${R2_LANGS.length} ngôn ngữ, TTL ${TTL}s, gộp luật đúng`);
