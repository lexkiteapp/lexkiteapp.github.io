// Test Video Studio (functions/api/studio.js): cổng quản trị, chuyển trạng thái, thiếu cấu hình, bí mật gọi lại CI, chọn khung giờ đăng, không lộ khóa.
// Chạy: node scripts/test/studio.mjs  (không cần mạng – D1 giả bằng node:sqlite, fetch & env giả lập)
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };

const mod = await import(new URL('../../functions/api/studio.js', import.meta.url));
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; }, async batch(list) { for (const x of list) await x.run(); } };

const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (email, extra = {}) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true, ...extra })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };

// fetch giả: JWKS Google · GitHub dispatch · GrabCast · raw.githubusercontent (hàng đợi)
let calls = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('googleapis.com')) return { ok: true, json: async () => ({ keys: [jwk] }) };
  calls.push({ url, init });
  if (url.includes('api.github.com')) return new Response(null, { status: 204 });
  if (url.includes('raw.githubusercontent.com')) return new Response(JSON.stringify({ topics: [{ topic: 'Queue topic A' }, 'Queue topic B'] }), { status: 200 });
  const p = url.replace(/^.*\/api\/social\//, '').split('?')[0];
  const R = { accounts: { items: [{ id: 'acc_yt', platform: 'youtube' }, { id: 'acc_tt', platform: 'tiktok', status: 'expired' }] }, 'validate': { valid: true }, posts: { id: 'post_1' } };
  const body = /storage\/objects\/[^/]+\/use$/.test(p) ? { media_id: 'med_1' } : /posts\/[^/]+\/(schedule|unschedule)$/.test(p) ? { ok: true } : R[p] || {};
  return new Response(JSON.stringify(body), { status: 200 });
};
const SECRET = 'cb_SECRET_7f6e5d4c3b2a1', GH = 'github_pat_SECRET_abcdef123456', GK = 'gk_live_SECRET_123456';
const ENV = { DB, ADMIN_EMAILS: 'boss@lexkite.com', STUDIO_CALLBACK_SECRET: SECRET, GH_DISPATCH_TOKEN: GH, GRABCAST_API_KEY: GK };
const call = async (tk, body, env = ENV, origin = 'https://lexkite.com', extra = {}) => {
  const headers = { Origin: origin, 'Content-Type': 'application/json', ...(tk ? { Authorization: 'Bearer ' + tk } : {}), ...extra };
  const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/studio', { method: 'POST', headers, body: JSON.stringify(body) }), env });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: r.status, j, text };
};
const ci = (body, secret = SECRET, env = ENV) => call(null, body, env, undefined, { 'X-Studio-Secret': secret });
const ADM = await tok('boss@lexkite.com'), USER = await tok('someone@gmail.com');
const noLeak = (r, m) => ok(![SECRET, GH, GK].some(k => r.text.includes(k)), 'không lộ bí mật: ' + m);

// 1) Cổng quản trị
ok((await call('x.y.z', { op: 'list' })).s === 403, 'token giả → 403');
ok((await call(USER, { op: 'list' })).s === 403, 'người dùng thường → 403');
ok((await call(ADM, { op: 'list' }, ENV, 'https://evil.example')).s === 403, 'Origin lạ → 403');
ok((await call(ADM, { op: 'nope' })).s === 400, 'op lạ → 400');
let r = await call(ADM, { op: 'list' }); ok(r.s === 200 && r.j.rows.length === 0 && r.j.counts.idea === 0 && r.j.settings.manualFirst === 5, 'list rỗng + cài đặt mặc định (duyệt tay 5 video đầu)');
ok(r.j.configured.render && r.j.configured.callback && r.j.configured.grabcast, 'list báo đã cấu hình (chỉ true/false)'); noLeak(r, 'list');

// 2) Tạo job, viết kịch bản (chưa có AI → khung mẫu), chuyển trạng thái
r = await call(ADM, { op: 'create', topic: '  Stop saying I am agree ', format: 'short' }); const id = r.j.job && r.j.job.id;
ok(r.s === 200 && r.j.job.status === 'idea' && r.j.job.topic === 'Stop saying I am agree', 'tạo job → idea');
ok((await call(ADM, { op: 'create', topic: '  ' })).s === 400, 'chủ đề trống → 400');
r = await call(ADM, { op: 'render', id }); ok(r.s === 409 && r.j.error === 'bad-transition' && r.j.from === 'idea', 'idea → rendering bị chặn');
r = await call(ADM, { op: 'scriptGen', id }); ok(r.s === 200 && r.j.ai === false && r.j.job.status === 'script' && r.j.job.script.lines.length === 6, 'chưa có AI → khung mẫu 6 phần, trạng thái script');
ok(r.j.check.ok, 'khung mẫu qua kiểm kịch bản ' + JSON.stringify(r.j.check.errs));

// 3) Kiểm kịch bản: số liệu bịa, thương hiệu đối thủ, hook dài, quá 60 s
const good = { title: 'I agree', keywords: ['agree'], lines: [
  { who: 'mia', beat: 'hook', text: "Stop saying I'm agree!" }, { who: 'mia', beat: 'situation', text: 'I said it in a meeting and everyone smiled.' },
  { who: 'leo', beat: 'explain', text: 'Agree is a verb, so just say I agree.' }, { who: 'leo', beat: 'example', text: 'I agree with your plan.' },
  { who: 'kit', beat: 'tip', text: "Kit's tip: no am before agree." }, { who: 'mia', beat: 'cta', text: 'Practice this free on lexkite.com' }] };
const bad = JSON.parse(JSON.stringify(good)); bad.lines[1].text = '90% of learners get this wrong on Duolingo.'; bad.lines[0].text = 'Here is a very long hook that takes forever';
r = await call(ADM, { op: 'scriptSave', id, script: bad }); const errs = r.j.check.errs.join(' | ');
ok(r.s === 200 && !r.j.check.ok && /thống kê/.test(errs) && /đối thủ/.test(errs) && /Hook dài/.test(errs), 'chặn số liệu bịa + đối thủ + hook dài: ' + errs);
r = await call(ADM, { op: 'scriptApprove', id }); ok(r.s === 422 && r.j.error === 'script-invalid' && r.j.errs.length >= 3, 'kịch bản lỗi → không duyệt được');
const long = JSON.parse(JSON.stringify(good)); long.lines[2].text = Array(150).fill('word').join(' ').slice(0, 160); long.lines.splice(3, 0, ...Array(8).fill({ who: 'leo', beat: 'example', text: Array(30).fill('longer').join(' ').slice(0, 159) }));
ok(!mod.checkScript(mod.normScript(long, { topic: 't' })).ok && /> 60 s/.test(mod.checkScript(mod.normScript(long, { topic: 't' })).errs.join()), 'kịch bản > 60 s bị chặn');
ok(!mod.checkScript(mod.normScript({ lines: [{ who: 'bob', beat: 'hook', text: 'Hi' }] }, { topic: 't' })).ok, 'nhân vật ngoài dàn bị chặn');
r = await call(ADM, { op: 'scriptSave', id, script: good }); ok(r.j.check.ok, 'kịch bản tốt hợp lệ ' + JSON.stringify(r.j.check.errs));
r = await call(ADM, { op: 'scriptApprove', id }); ok(r.s === 200 && r.j.job.status === 'script_ok', 'duyệt → script_ok');

// 4) Dựng: thiếu cấu hình → not-configured; đủ → gọi GitHub dispatch, không lộ token
r = await call(ADM, { op: 'render', id }, { ...ENV, GH_DISPATCH_TOKEN: '' }); ok(r.s === 503 && r.j.error === 'not-configured' && r.j.need === 'GH_DISPATCH_TOKEN', 'thiếu GH_DISPATCH_TOKEN → not-configured');
r = await call(ADM, { op: 'render', id }, { ...ENV, STUDIO_CALLBACK_SECRET: '' }); ok(r.s === 503 && r.j.need === 'STUDIO_CALLBACK_SECRET', 'thiếu STUDIO_CALLBACK_SECRET → not-configured');
ok(!calls.some(c => c.url.includes('api.github.com')), 'chưa cấu hình → không gọi GitHub');
calls = []; r = await call(ADM, { op: 'render', id }); const gh = calls.find(c => c.url.includes('api.github.com'));
ok(r.s === 200 && r.j.job.status === 'rendering', 'render → rendering');
ok(gh && gh.url.endsWith('/actions/workflows/video.yml/dispatches') && gh.init.headers.Authorization === 'Bearer ' + GH && JSON.parse(gh.init.body).inputs.job_id === id, 'dispatch video.yml với job_id'); noLeak(r, 'render');

// 5) Gọi lại từ CI: kiểm bí mật
ok((await ci({ op: 'ciJob', id }, 'wrong-secret')).s === 403, 'sai bí mật → 403');
ok((await ci({ op: 'ciJob', id }, '')).s === 403, 'bí mật rỗng → 403');
r = await ci({ op: 'ciJob', id }, SECRET, { ...ENV, STUDIO_CALLBACK_SECRET: '' }); ok(r.s === 503 && r.j.error === 'not-configured', 'máy chủ chưa có bí mật → not-configured');
ok((await ci({ op: 'list' })).s === 400, 'CI không gọi được thao tác quản trị');
ok((await call(ADM, { op: 'ciResult', id, ok: true })).s === 400, 'quản trị không gọi thẳng ciResult');
r = await ci({ op: 'ciJob', id }); ok(r.s === 200 && r.j.job.script.lines.length === 6, 'CI lấy được kịch bản');
// QA thiếu tiêu chí (knowledge/share chưa chấm) → rendered (chờ người chấm)
const partial = { hook: 15, knowledge: null, lipsync: 15, audio: 10, subs: 10, pacing: 10, brand: 10, cta: 5, share: null };
r = await ci({ op: 'ciResult', id, ok: true, files: { object_id: 'obj_1', preview_url: 'https://example.com/v.mp4', run_url: 'javascript:alert(1)', duration: 19.2 }, qa: { scores: partial, total: 999 } });
ok(r.s === 200 && r.j.job.status === 'rendered', 'QA thiếu tiêu chí → rendered');
let g = (await call(ADM, { op: 'get', id })).j.job;
ok(g.qa.total === 75 && g.qa.missing.join() === 'knowledge,share', 'tổng QA tính lại ở máy chủ (bỏ total CI gửi)');
ok(g.files.object_id === 'obj_1' && g.files.preview_url && !g.files.run_url, 'chỉ nhận link https');
r = await call(ADM, { op: 'qaSet', id, scores: { knowledge: 10, share: 3 } }); ok(r.j.job.status === 'qa_fail' && r.j.job.qa.total === 88, 'chấm tay 88 < 90 → qa_fail');
r = await call(ADM, { op: 'publish', id, confirm: true }); ok(r.s === 409 && r.j.error === 'bad-transition', 'qa_fail không đăng được');
r = await call(ADM, { op: 'qaSet', id, scores: { knowledge: 20, share: 99 } }); ok(r.j.job.status === 'qa_ok' && r.j.job.qa.scores.share === 5 && r.j.job.qa.total === 100, 'chấm đủ ≥ 90 → qa_ok (điểm bị kẹp theo thang)');

// 6) Đăng & lên lịch
r = await call(ADM, { op: 'publish', id }); ok(r.s === 400 && r.j.error === 'confirm', 'đăng phải có confirm');
r = await call(ADM, { op: 'publish', id, confirm: true }, { ...ENV, GRABCAST_API_KEY: '' }); ok(r.s === 503 && r.j.need === 'GRABCAST_API_KEY', 'thiếu GRABCAST_API_KEY → not-configured');
calls = []; r = await call(ADM, { op: 'publish', id, confirm: true }); g = r.j.job;
ok(r.s === 200 && g.status === 'scheduled' && g.media_id === 'med_1' && g.post_id === 'post_1', 'đăng: use → validate → posts → schedule ' + r.text.slice(0, 200));
const paths = calls.map(c => c.init.method + ' ' + c.url.replace(/^.*\/api\/social\//, ''));
ok(paths.join('|') === 'POST storage/objects/obj_1/use|GET accounts|POST validate|POST posts|POST posts/post_1/schedule', 'thứ tự gọi GrabCast: ' + paths.join('|'));
const created = calls.find(c => /\/posts$/.test(c.url));
ok(created && /^[0-9a-f]{40}$/.test(created.init.headers['Idempotency-Key']) && JSON.parse(created.init.body).targets.map(t => t.account_id).join() === 'acc_yt', 'Idempotency-Key + bỏ kênh hết hạn');
const sch = JSON.parse(calls[calls.length - 1].init.body), nyH = +new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', hourCycle: 'h23' }).format(new Date(sch.scheduled_at));
ok(mod.SLOTS.includes(nyH) && sch.consent === true && g.schedule_at === Date.parse(sch.scheduled_at), 'lên lịch đúng khung giờ vàng New York (' + nyH + 'h)'); noLeak(r, 'publish');
r = await call(ADM, { op: 'jobDelete', id }); ok(r.s === 409, 'job đã có bài không xóa được');
r = await call(ADM, { op: 'unschedule', id }); ok(r.j.job.status === 'uploaded' && !r.j.job.schedule_at, 'hủy lịch → uploaded');
r = await call(ADM, { op: 'schedule', id, at: new Date(Date.now() - 1e5).toISOString() }); ok(r.s === 400 && r.j.error === 'at-past', 'giờ quá khứ → 400');

// 7) Chế độ tự động: tôn trọng "duyệt tay N video đầu"
const mk = async t => { const x = (await call(ADM, { op: 'create', topic: t })).j.job.id; await call(ADM, { op: 'scriptSave', id: x, script: good }); await call(ADM, { op: 'scriptApprove', id: x }); await call(ADM, { op: 'render', id: x }); return x; };
const full = { hook: 15, knowledge: 20, lipsync: 15, audio: 10, subs: 10, pacing: 10, brand: 10, cta: 5, share: 5 };
let id2 = await mk('auto 1');
r = await ci({ op: 'ciResult', id: id2, ok: true, files: { object_id: 'obj_2' }, qa: { scores: full } }); ok(r.j.job.status === 'qa_ok' && r.j.auto === 'auto-off', 'tắt tự động → dừng ở qa_ok');
await call(ADM, { op: 'settingsSet', settings: { auto: true } });
id2 = await mk('auto 2');
r = await ci({ op: 'ciResult', id: id2, ok: true, files: { object_id: 'obj_3' }, qa: { scores: full } }); ok(r.j.job.status === 'qa_ok' && r.j.auto === 'manual-approval', 'chưa đủ 5 video duyệt tay → không tự đăng');
r = await call(ADM, { op: 'settingsSet', settings: { manualFirst: 0, dailyQuota: 99, platforms: ['YouTube!'], accounts: ['ok_1', 'bad id'] } });
ok(r.j.settings.manualFirst === 0 && r.j.settings.dailyQuota === 10 && r.j.settings.platforms[0] === 'youtube' && r.j.settings.accounts.join() === 'ok_1', 'chuẩn hóa cài đặt');
await call(ADM, { op: 'settingsSet', settings: { accounts: [] } });
id2 = await mk('auto 3');
r = await ci({ op: 'ciResult', id: id2, ok: true, files: { object_id: 'obj_4' }, qa: { scores: full } }); ok(r.j.job.status === 'scheduled' && r.j.auto === 'scheduled', 'đủ điều kiện → tự lên lịch');
id2 = await mk('render fail');
r = await ci({ op: 'ciResult', id: id2, ok: false, error: 'ffmpeg exploded' }); g = (await call(ADM, { op: 'get', id: id2 })).j.job;
ok(g.status === 'script_ok' && /ffmpeg/.test(g.error), 'CI lỗi → về script_ok + ghi lỗi');
r = await ci({ op: 'ciResult', id: id2, ok: true, qa: { scores: full } }); ok(r.s === 409, 'gọi lại khi không ở trạng thái dựng → 409');

// 8) Hàng đợi
r = await call(ADM, { op: 'createFromQueue', n: 5 }); ok(r.s === 200 && r.j.jobs.length === 2 && r.j.left === 0, 'tạo job từ queue.json');
r = await call(ADM, { op: 'createFromQueue', n: 5 }); ok(r.j.jobs.length === 0, 'không tạo trùng chủ đề');
r = await call(ADM, { op: 'list' }); ok(r.j.counts.scheduled === 1 && r.j.counts.uploaded === 1 && r.j.done === 1, 'đếm theo trạng thái');

// 9) Chọn khung giờ (thuần)
const jan = Date.UTC(2027, 0, 11, 5), jul = Date.UTC(2027, 6, 12, 5); // 00:00 / 01:00 New York
let s = mod.nextSlots({ now: jan, n: 5, quota: 5 }); ok(s.map(x => new Date(x.at).getUTCHours()).join() === '12,13,17,0,1', 'mùa đông (EST): 7/8/12/19/20h NY = 12/13/17/0/1h UTC');
s = mod.nextSlots({ now: jul, n: 3, quota: 5 }); ok(s.map(x => new Date(x.at).getUTCHours()).join() === '11,12,16', 'mùa hè (EDT): 7/8/12h NY = 11/12/16h UTC');
s = mod.nextSlots({ now: jan, n: 3, quota: 1 }); ok(new Set(s.map(x => x.day)).size === 3, 'hạn mức 1/ngày → 3 ngày khác nhau');
const first = mod.nextSlots({ now: jan, n: 1 })[0].at;
s = mod.nextSlots({ now: jan, n: 2, quota: 3, taken: [first] }); ok(!s.some(x => x.at === first) && s[0].day === s[1].day, 'bỏ khung đã chiếm');
ok(mod.nextSlots({ now: jan, n: 1, quota: 1, taken: [first] })[0].day !== mod.nextSlots({ now: jan, n: 1 })[0].day, 'ngày đã đủ hạn mức → sang ngày sau');
ok(mod.nextSlots({ now: Date.UTC(2027, 0, 11, 11, 50), n: 1 })[0].at - Date.UTC(2027, 0, 11, 11, 50) >= 20 * 6e4, 'không chọn khung sát giờ hiện tại');

// 10) Bảng chuyển trạng thái
ok(mod.STATUSES.every(x => mod.TRANS[x]) && mod.TRANS.published.length === 0 && !mod.canMove('idea', 'published') && mod.canMove('scheduled', 'published'), 'bảng chuyển trạng thái đủ & chặt');
ok(mod.RUBRIC.reduce((t, x) => t + x.max, 0) === 100 && mod.PASS === 90, 'thang QA tổng 100, ngưỡng 90');

if (fails) { console.error(`✗ studio: ${fails} lỗi`); process.exit(1); }
console.log('✓ studio: cổng quản trị, luồng trạng thái, kiểm kịch bản, not-configured, bí mật CI, đăng/lên lịch, tự động, khung giờ đều đạt');
