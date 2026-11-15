// Test chuỗi AI người dùng (docs/AI-CHAIN.md): functions/api/_aichain.js (chọn model thật, Gemini → Groq → báo bận, không Llama 8B cho người học),
// _aimix.js (đếm tuyến + cảnh báo > 10 %/giờ), keysync.js (chỉ workflow main), bộ golden scripts/ai-golden (dữ liệu + chấm điểm + ghép lời nhắn THẬT của web/js).
// Chạy: node scripts/test/ai-chain.mjs (không mạng – fetch/Gemini/D1 giả)
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const log = console.log; console.log = (...a) => { if (!/^(gemini|ai )/.test(String(a[0]))) log(...a); };

// ---------- D1 giả ----------
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
globalThis.caches = { default: { match: async () => undefined, put: async () => {}, delete: async () => {} } };

// ---------- nhà cung cấp giả ----------
const GOOD_IELTS = JSON.stringify({ overall: 6, criteria: [{ name: 'TR', band: 6, comment: 'x' }], errors: [] });
let gemMode = 'ok', groqMode = 'ok', gemGen = 0, groqGen = 0, waiN = 0;
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('generativelanguage.googleapis.com/v1beta/models?')) return new Response(JSON.stringify({ models: ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-3.9-flash-lite', 'gemini-3.9-flash-preview', 'gemini-3.6-flash', 'gemini-3.8-pro'].map(m => ({ name: 'models/' + m, supportedGenerationMethods: ['generateContent'] })) }), { status: 200 });
  if (url === 'https://api.groq.com/openai/v1/models') return new Response(JSON.stringify({ data: [{ id: 'openai/gpt-oss-120b' }, { id: 'llama-3.1-8b-instant' }] }), { status: 200 });
  if (url === 'https://api.groq.com/openai/v1/chat/completions') { groqGen++; const b = JSON.parse(init.body);
    if (groqMode === 'dead') return new Response('{"error":{"message":"Invalid API Key"}}', { status: 401 });
    if (groqMode === 'jsonfail' && b.response_format) return new Response('{"error":{"message":"Failed to generate JSON. Please adjust your prompt. See \'failed_generation\' for more details.","type":"invalid_request_error","code":"json_validate_failed"}}', { status: 400 });
    if (groqMode === '429') return new Response('{"error":{"message":"Rate limit reached ... requests per day (RPD)"}}', { status: 429 });
    return new Response(JSON.stringify({ choices: [{ message: { content: /"overall": number/.test(b.messages[1].content) ? GOOD_IELTS : '{"reply":"Sure! Small, medium or large?","advance":true}' } }] }), { status: 200 }); }
  throw new Error('mạng bị chặn: ' + url);
};
const GEM = { fetch: async (u, init) => { const b = JSON.parse(init.body);
  if (b.method === 'GET') return new Response('{}', { status: 200 });
  gemGen++;
  if (gemMode === 'dead') return new Response('{"error":{"code":403,"message":"Permission denied: Consumer has been suspended.","status":"PERMISSION_DENIED"}}', { status: 403 });
  if (gemMode === 'hang') return new Promise(() => {});
  const txt = gemMode === 'bad' ? '{"band":6}' : /"overall": number/.test(b.body.contents[0].parts[0].text) ? GOOD_IELTS : '{"reply":"Sure. Small, medium or large?","advance":true}';
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'thinking…', thought: true }, { text: txt }] } }] }), { status: 200 }); } };
const AI = { run: async () => { waiN++; return { response: { reply: 'Would you like whole bean or ground coffee?', advance: true } }; } };
const ENV = { DB, GEM, AI, GEMINI_KEY: 'AIzaSyTEST_chain_gemini_key_0000000000', GROQ_API_KEY: 'gsk_TESTchainGroqKey0123456789abcd' };

const C = await import(new URL('../../functions/api/_aichain.js', import.meta.url));
const K = await import(new URL('../../functions/api/_keys.js', import.meta.url));
const MX = await import(new URL('../../functions/api/_aimix.js', import.meta.url));
const KS = await import(new URL('../../functions/api/keysync.js', import.meta.url));
const S = await import(new URL('../ai-golden/score.mjs', import.meta.url));
const CL = await import(new URL('../ai-golden/client.mjs', import.meta.url));

// 1) chọn model từ danh sách THẬT (không ghi cứng tên sắp hết hạn)
ok(JSON.stringify(C.pickGemini(['models/gemini-2.5-flash', 'models/gemini-3.8-flash', 'models/gemini-3.9-flash-preview', 'models/gemini-3.9-flash-lite', 'models/gemini-3.8-pro'])) === '["gemini-3.9-flash-preview","gemini-3.8-flash"]', 'pickGemini: Flash số lớn nhất trước, bỏ lite/pro');
ok(JSON.stringify(C.pickGemini(['gemini-3.9-flash', 'gemini-3.9-flash-preview'])) === '["gemini-3.9-flash","gemini-3.9-flash-preview"]', 'pickGemini: bản ổn định trước preview cùng số');
ok(C.pickGemini([]).length === 0, 'pickGemini: rỗng → [] (dùng dò tên dự phòng)');
ok(JSON.stringify(C.pickGroq(['llama-3.1-8b-instant', 'openai/gpt-oss-120b'])) === JSON.stringify(C.GROQ_OK.filter(m => m === 'openai/gpt-oss-120b')), 'pickGroq: chỉ model đạt golden (GROQ_OK), bỏ model nhỏ');
ok(JSON.stringify(C.pickGroq(null)) === JSON.stringify(C.GROQ_OK), 'pickGroq: đọc danh sách lỗi → giữ GROQ_OK');
ok(C.WEAK_OK === false, 'Llama 3.1 8B không phục vụ người học (golden 03/11 trượt)');

// 2) khuôn kết quả
const IELTS_P = 'JSON schema:\n{\n  "overall": number (IELTS band, multiple of 0.5),', RP_P = 'JSON: {"reply": string (what Tom says next, under 45 words), "advance": boolean}';
ok(!C.validOut({ band: 6 }, IELTS_P) && C.validOut(JSON.parse(GOOD_IELTS), IELTS_P), 'validOut: chấm IELTS cần overall + criteria');
ok(!C.validOut({ advance: true }, RP_P) && C.validOut({ reply: 'Hi', advance: true }, RP_P), 'validOut: roleplay cần reply');
ok(!C.validOut([], 'x') && !C.validOut({}, 'x') && C.validOut({ a: 1 }, 'x'), 'validOut: object không rỗng');
ok(C.gemText({ candidates: [{ content: { parts: [{ text: 'nghĩ', thought: true }, { text: '{"a":1}' }] } }] }) === '{"a":1}', 'gemText bỏ phần thought');
ok(C.JSON_FAIL.test('{"error":{"message":"Failed to generate JSON. Please adjust your prompt."}}') && !('response_format' in C.groqRetry(C.groqBody('m', 's', 'p'))) && !C.JSON_FAIL.test('Invalid API Key'), 'Groq lỗi sinh JSON → thử lại không ép JSON (không phải lỗi khóa)');
  ok(C.groqBody('openai/gpt-oss-120b', 's', 'p', 0.7, true).reasoning_effort === 'low' && C.groqBody('openai/gpt-oss-120b', 's', 'p').reasoning_effort === 'medium' && C.groqBody('x', 's', 'p').response_format.type === 'json_object', 'groqBody: gpt-oss lý luận thấp cho thoại, vừa cho chấm; JSON mode');
ok(C.gemBody('gemini-3.8-flash', 's', 'p').generationConfig.thinkingConfig.thinkingLevel === 'low' && C.gemBody('gemini-2.5-flash', 's', 'p', 0.7, true).generationConfig.thinkingConfig.thinkingBudget === 0, 'gemBody: cấu hình suy nghĩ theo đời model');

// 3) chuỗi: Gemini → Groq → báo bận
{
  C.resetModels(); K.resetPool();
  let r = await C.runChain(ENV, 'sys', IELTS_P);
  ok(r.route === 'gemini' && r.tier === 'high' && r.model === 'gemini-3.9-flash-preview' && r.out.overall === 6, 'Gemini sống → Flash số lớn nhất theo danh sách thật (' + r.model + ')');
  gemMode = 'bad'; r = await C.runChain(ENV, 'sys', IELTS_P);
  ok(r.route === 'groq' && r.model === 'groq/openai/gpt-oss-120b', 'Gemini trả sai khuôn → Groq gpt-oss-120b');
  gemMode = 'dead'; K.resetPool(); r = await C.runChain(ENV, 'sys', RP_P, { rp: true, temp: 0.7 });
  ok(r.route === 'groq' && r.out.reply, 'Gemini chết (403) → Groq');
  ok(sql.prepare("SELECT status FROM api_keys WHERE id = 'env:GEMINI_KEY'").get().status === 'dead', 'khóa Gemini 403 → đánh dấu dead trong kho');
  groqMode = 'jsonfail'; r = await C.runChain(ENV, 'sys', IELTS_P);
  ok(r.route === 'groq' && r.out.overall === 6 && /json-retry/.test(r.diag), 'Groq 400 "Failed to generate JSON" → thử lại không ép JSON, vẫn trả kết quả');
  ok(sql.prepare("SELECT status FROM api_keys WHERE id = 'env:GROQ_API_KEY'").get().status === 'live', 'lỗi sinh JSON không làm khóa Groq bị đánh dấu hỏng');
  groqMode = '429'; const w0 = waiN; let err = null;
  try { await C.runChain(ENV, 'sys', RP_P, { rp: true }); } catch (e) { err = e; }
  ok(err && err.message === 'no-model' && waiN === w0, 'Gemini chết + Groq hết lượt → no-model (báo bận), KHÔNG gọi Llama 8B');
  ok(err && /groq/.test(err.diag), 'diag ghi lý do (không lộ khóa): ' + (err && err.diag));
  ok(!(err && /TEST/.test(err.diag)), 'diag không chứa khóa');
  r = await C.runChain(ENV, 'sys', RP_P, { rp: true, allowWeak: true }).catch(e => e);
  ok(r.route === 'wai' && r.tier === 'low', 'người gọi nội bộ (allowWeak) → Llama 8B kèm tier low');
  groqMode = 'ok'; gemMode = 'hang'; sql.exec("UPDATE api_keys SET status = 'live', err_count = 0, cooldown_until = 0"); K.resetPool();
  const t0 = Date.now(); r = await C.runChain(ENV, 'sys', RP_P, { rp: true, gemMs: 3e3 });
  ok(r.route === 'groq' && Date.now() - t0 < 25e3 && Date.now() - t0 >= 3e3, 'Gemini treo → hết giờ, vẫn kịp Groq trong hạn (' + (Date.now() - t0) + ' ms)');
  gemMode = 'ok';
}
// 4) đếm không giải mã (CPU 10 ms gói miễn phí) + candidates giới hạn
{
  K.resetPool(); ok(await K.poolCount(ENV, 'groq') === 1 && (await K.candidates(ENV, 'groq', 1)).length === 1, 'poolCount / candidates(limit)');
  ok(K.HEALTH_BATCH <= 20, 'kiểm sức khỏe theo lô ≤ 20 khóa/lượt (50 subrequest + 50 truy vấn D1 của gói miễn phí)');
}
// 5) giám sát tỉ lệ model
{
  sql.exec('CREATE TABLE IF NOT EXISTS ai_quota (id TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (id, day)) WITHOUT ROWID');
  ok(MX.bucket(Date.UTC(2026, 10, 3, 10, 27)) === '2026-11-03T10:2', 'khung 10 phút');
  ok(MX.buckets(3600e3, Date.UTC(2026, 10, 3, 10, 27)).length === 6, '1 giờ = 6 khung');
  const now = Date.now(), add = (route, k) => DB.batch(Array.from({ length: k }, () => MX.mixStmt(DB, route, now)));
  await add('gemini', 8); await add('groq', 1); await add('busy', 1);
  let m = await MX.aiMix(DB, 3600e3, now);
  ok(m.total === 10 && m.weak === 1 && m.share === 0.1 && !MX.mixAlerts(m).length, '10 % yếu/bận → chưa cảnh báo (ngưỡng > 10 %)');
  await add('wai', 1); m = await MX.aiMix(DB, 3600e3, now); const a = MX.mixAlerts(m);
  ok(a.length === 1 && a[0].kind === 'ai:weak' && a[0].level === 'warn' && /Llama 1/.test(a[0].msg), '> 10 % → cảnh báo ai:weak (' + Math.round(m.share * 100) + '%)');
  ok(!MX.mixAlerts({ total: 4, weak: 3, share: 0.75 }).length, '< 5 lượt/giờ → không kết luận');
  ok(MX.mixAlerts({ total: 10, weak: 6, share: 0.6, gemini: 4, groq: 0, wai: 0, busy: 6 })[0].level === 'crit', '> 50 % → crit');
  const old = await MX.aiMix(DB, 3600e3, now + 2 * 3600e3); ok(old.total === 0, 'ngoài cửa sổ 1 giờ → không tính');
  await DB.batch([MX.pruneStmt(DB, now + 4 * 86400e3)]); ok(sql.prepare("SELECT COUNT(*) AS n FROM ai_quota WHERE id LIKE 'm:%'").get().n === 0, 'dọn dòng đếm > 3 ngày');
  const src = fs.readFileSync(new URL('../../functions/api/_keys.js', import.meta.url), 'utf8');
  ok(/mixAlerts\(await aiMix\(env\.DB/.test(src), 'refreshAlerts gộp cảnh báo tỉ lệ model (thư + Quản trị → Khóa API)');
}
// 6) keysync: chỉ workflow ai-keys-sync.yml trên main
{
  const base = { ref: 'refs/heads/main', job_workflow_ref: 'lexkiteapp/lexkiteapp.github.io/.github/workflows/ai-keys-sync.yml@refs/heads/main', event_name: 'workflow_dispatch' };
  ok(KS.allowed(base) && KS.allowed({ ...base, event_name: 'schedule' }), 'keysync: workflow main được phép');
  ok(!KS.allowed({ ...base, ref: 'refs/heads/x' }) && !KS.allowed({ ...base, job_workflow_ref: base.job_workflow_ref.replace('ai-keys-sync', 'evil') }) && !KS.allowed({ ...base, event_name: 'pull_request' }) && !KS.allowed(null), 'keysync: nhánh khác / workflow khác / PR / không token → từ chối');
  const res = await KS.onRequestPost({ request: new Request('https://lexkite.com/api/keysync', { method: 'POST', body: '{}' }), env: ENV });
  ok(res.status === 401, 'keysync: không có OIDC → 401');
}
// 7) bộ golden: dữ liệu + chấm điểm
{
  const IE = JSON.parse(fs.readFileSync(new URL('../ai-golden/ielts.json', import.meta.url), 'utf8')).cases, RP = JSON.parse(fs.readFileSync(new URL('../ai-golden/roleplay.json', import.meta.url), 'utf8'));
  ok(IE.length >= 20 && RP.cases.length >= 20, `golden đủ cỡ (${IE.length} IELTS, ${RP.cases.length} roleplay)`);
  const norm = s => s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ');
  const missing = IE.flatMap(c => c.errors.filter(e => !norm(c.text).includes(norm(e.q))).map(e => c.id + ':' + e.q));
  ok(!missing.length, 'mọi lỗi đã biết có thật trong bài: ' + missing.join(', '));
  ok(IE.every(c => c.errors.length <= 6 && c.band >= 3 && c.band <= 9 && S.LANGS[c.lang || 'vi']), 'mỗi bài ≤ 6 lỗi (khuôn trả tối đa 12), band hợp lệ, ngôn ngữ hỗ trợ');
  ok(new Set(IE.map(c => c.lang)).size >= 4, 'golden có lời giải nhiều ngôn ngữ (vi + ≥ 3 khác)');
  ok(RP.decoys.some(d => /whole bean/.test(d.reply) && d.max <= 2), 'câu mồi có câu vô lý thật ngày 03/11');
  ok(S.caught({ q: 'thinks', fix: 'think' }, [{ quote: 'many people thinks', fix: 'many people think' }]), 'caught: đúng chỗ + sửa đúng');
  ok(!S.caught({ q: 'thinks', fix: 'think' }, [{ quote: 'many people thinks', fix: 'many people thinks that' }]), 'caught: "sửa" mà giữ nguyên lỗi → không tính');
  ok(!S.caught({ q: 'it help', fix: 'helps' }, [{ quote: 'education are important', fix: 'education is important' }]), 'caught: sửa sai chỗ → không tính (lỗi 03/11)');
  ok(S.caught({ q: 'in the dinner', fix: 'at dinner|for dinner' }, [{ quote: 'eat rice with my family in the dinner', fix: 'eat rice with my family for dinner' }]), 'caught: nhiều phương án đúng');
  // golden 03/11 lần 3: so chuỗi con thô chấm oan gpt-oss-120b (81 % → 98 % khi so theo ranh giới từ)
  ok(S.caught({ q: 'many tourist', fix: 'tourists' }, [{ quote: 'tourist come', fix: 'tourists come' }]) && !S.caught({ q: 'am come', fix: 'i come|come' }, [{ quote: 'i am come from', fix: 'i am come from' }]), 'caught: trích ngắn "tourist come" (golden lần 8); sửa giữ nguyên lỗi vẫn không tính');
  ok(/does not actually answer your last question/.test(CL.rpCase(JSON.parse(fs.readFileSync(new URL('../ai-golden/roleplay.json', import.meta.url), 'utf8')).cases[2]).req.prompt), 'lời nhắn roleplay: trả lời không đúng câu hỏi ("yes" cho câu lựa chọn) → hỏi lại');
  ok(S.caught({ q: 'invest more money on', fix: 'money in' }, [{ quote: 'invest more money **on** public transport', fix: 'invest more money **in** public transport' }]), 'caught: bỏ dấu markdown ** trong trích/sửa (golden lần 7)');
  ok(S.caught({ q: 'it help', fix: 'helps' }, [{ quote: 'it help', fix: 'it helps' }]), 'caught: "it helps" không bị coi là còn lỗi "it help"');
  ok(S.caught({ q: 'chart illustrate', fix: 'illustrates' }, [{ quote: 'illustrate', fix: 'illustrates' }]), 'caught: trích ngắn hơn cụm lỗi vẫn đúng chỗ');
  ok(S.caught({ q: 'busy and stress', fix: 'stressful' }, [{ quote: 'and stress my', fix: 'and stressful, my' }]), 'caught: trích chồng lấn ≥ 8 ký tự');
  ok(!S.caught({ q: 'am agree', fix: 'i agree|agree' }, [{ quote: 'I am agree', fix: 'I am agree with' }]), 'caught: "sửa" còn nguyên cụm sai → không tính');
  ok(!S.caught({ q: 'rised', fix: 'rose' }, [{ quote: 'steadily', fix: 'rose steadily' }]), 'caught: sai chỗ (không chồng lấn) → không tính');
  ok(S.inLang('Tu ensayo es claro y la estructura de los párrafos es buena para el examen', 'es') && !S.inLang('Bài viết của bạn rõ ràng và có cấu trúc tốt', 'es'), 'inLang es');
  ok(S.inLang('構成がよく、論点も明確です。', 'ja') && S.inLang('مقالك واضح', 'ar') && S.inLang('Bài viết rõ ràng', 'vi') && !S.inLang('Your essay is clear', 'vi'), 'inLang ja/ar/vi');
  const c0 = IE[0], good = { overall: c0.band, criteria: [{}, {}, {}, {}], summary: 'Bài viết còn nhiều lỗi ngữ pháp cơ bản.', errors: c0.errors.map(e => ({ quote: 'x ' + e.q + ' y', fix: e.fix.split('|')[0] })) };
  const sI = S.scoreIelts(c0, good); ok(sI.valid && sI.found === c0.errors.length && sI.diff === 0 && sI.langOk, 'scoreIelts: bắt đủ lỗi, band đúng, đúng ngôn ngữ');
  const weak = { overall: 4, criteria: [{}, {}, {}, {}], summary: 'Bài viết cần cải thiện.', errors: [{ quote: 'it help the society', fix: 'it helps society' }] };
  const sW = S.sumIelts([{ ...S.scoreIelts(c0, weak), langCase: true }]); ok(!sW.pass && sW.recall < 0.9, 'sumIelts: câu chấm kiểu Llama 8B 03/11 (1/5 lỗi) → trượt');
  ok(S.sumIelts([{ ...sI, langCase: true }]).pass, 'sumIelts: chấm chuẩn → đạt');
  const rpc = RP.cases[0];
  ok(S.scoreRp(rpc, { reply: 'Whole bean or ground?', advance: true }, { score: 1, absurd: true }).absurd, 'scoreRp: giám khảo báo vô lý');
  ok(!S.scoreRp({ ...rpc, unclear: true }, { reply: 'Sure, medium.', advance: true }, { score: 4 }).clarifyOk, 'scoreRp: câu khó hiểu mà không hỏi lại → trượt mục hỏi lại');
  const rows = Array.from({ length: 10 }, () => ({ ...S.scoreRp(rpc, { reply: 'Sure. Small, medium or large?', advance: true }, { score: 5 }), unclearCase: false }));
  ok(S.sumRp(rows).pass && !S.sumRp([...rows, { ...rows[0], absurd: true }, { ...rows[0], absurd: true }]).pass, 'sumRp: ≤ 1 câu vô lý');
}
// 8) lời nhắn THẬT của máy khách (web/js) khớp khuôn máy chủ + đúng ngôn ngữ người học
{
  const IE = JSON.parse(fs.readFileSync(new URL('../ai-golden/ielts.json', import.meta.url), 'utf8')).cases, RP = JSON.parse(fs.readFileSync(new URL('../ai-golden/roleplay.json', import.meta.url), 'utf8')).cases;
  const es = CL.ieltsReq(IE.find(c => c.lang === 'es')), vi = CL.ieltsReq(IE.find(c => (c.lang || 'vi') === 'vi'));
  ok(/in Spanish/.test(es.sys) && !/Vietnamese/.test(es.sys + es.prompt) && /\(Spanish, 1-3 sentences\)/.test(es.prompt), 'chấm IELTS người học es → lời giải tiếng Tây Ban Nha (không còn ép tiếng Việt)');
  ok(/in Vietnamese/.test(vi.sys), 'người học vi → tiếng Việt như cũ');
  ok(/"overall": number/.test(vi.prompt) && !C.validOut({ band: 6 }, vi.prompt), 'khuôn chấm của máy khách khớp validOut máy chủ (model trả sai khuôn → thử model kế)');
  const x = CL.rpCase(RP[0]); ok(/JSON: \{"reply": string/.test(x.req.prompt) && !C.validOut({ advance: true }, x.req.prompt) && /Small, medium or large/.test(x.req.prompt) && /Tom, barista/.test(x.req.sys), 'lượt roleplay của máy khách khớp validOut + đúng kịch bản');
  const src = fs.readFileSync(new URL('../../web/js/ai.js', import.meta.url), 'utf8');
  ok(/prompt: forLang\(prompt\), sys: forLang\(SYS\)/.test(src), 'máy khách gửi /api/ai bằng ngôn ngữ người học (mọi AI.ask: toeic/toefl/fixer/assist…)');
}

console.log = log;
if (fails) { console.log(`✗ ai-chain: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ ai-chain: ${n} kiểm tra – chọn model thật, Gemini → Groq → báo bận (không Llama 8B), cầu dao, giám sát tỉ lệ, keysync, golden, prompt 15 ngôn ngữ`);
