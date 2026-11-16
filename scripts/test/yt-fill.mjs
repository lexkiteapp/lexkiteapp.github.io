// Lấp lịch YouTube trực tiếp (functions/api/youtube.js op fill + fillPick, scripts/social/yt-fill.mjs): clip đúng ngôn ngữ, đạt QC, không bị giữ, chưa dùng; nối dây workflow + HMAC.
// Chạy: node scripts/test/yt-fill.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fillPick, videoResource, PRIVACY, PRIVACY_UP } from '../../functions/api/youtube.js';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const it = (id, lang, o = {}) => ({ id, lang, title: 't ' + id, qa: { status: 'pass' }, ...o });
const items = [it('de-aaa', 'de'), it('de-bbb', 'de'), it('de-rej', 'de', { rejected: true }), it('de-qa', 'de', { qa: { status: 'fail' } }), it('de-pause', 'de', { paused: true }), it('de-notitle', 'de', { title: '' }), it('vi-aaa', 'vi'), it('en-aaa', undefined), it('de-held', 'de'), it('de-used', 'de'), it('bad id!', 'de')];
const held = new Map([['de-held', { state: 'rejected', deleted: 0 }], ['de-del', { deleted: 1 }]]), taken = new Set(['de-used']);
const de = fillPick(items, 'de', taken, held, 30).map(x => x.id);
ok(de.join() === 'de-aaa,de-bbb', 'chỉ clip tiếng Đức đạt QC, chưa bị loại/giữ/xoá/dùng, có tiêu đề, id hợp lệ: ' + de);
ok(fillPick(items, 'vi', taken, held, 30).length === 1 && fillPick(items, 'en', taken, held, 30)[0].id === 'en-aaa', 'clip không ghi lang tính là en; không lẫn ngôn ngữ');
ok(fillPick(items, 'de', taken, held, 1).length === 1 && fillPick(items, 'de', taken, held, 0).length === 0 && fillPick(items, 'ja', taken, held, 30).length === 0, 'cắt theo số còn thiếu; không có clip bản ngữ → rỗng (không mượn ngôn ngữ khác)');
const yt = fs.readFileSync('functions/api/youtube.js', 'utf8'), wf = fs.readFileSync('.github/workflows/social-coverage.yml', 'utf8'), sc = fs.readFileSync('scripts/social/yt-fill.mjs', 'utf8');
ok(/async fill\(db, b, who, env\)/.test(yt.slice(yt.indexOf('const CLI_OPS'))), 'op fill nằm trong CLI_OPS (chỉ CI có chữ ký HMAC)');
ok(/yt-fill\.mjs/.test(wf) && wf.indexOf('yt-fill.mjs') < wf.indexOf('coverage.mjs'), 'workflow lấp lịch trước khi máy gác đo');
ok(/driveSign/.test(sc) && /op: 'fill'/.test(sc), 'yt-fill ký HMAC và gọi op fill');
ok(/status IN \('queued','uploading','done'\) AND publish_at > \?", ch\.channel_id/.test(yt), 'autoq đếm cả bài đã upload (done) còn hẹn giờ để không trùng ngày');
// probe: 'public' chỉ cho đường tải (videoResource); duyệt/autoq vẫn chỉ private|unlisted
ok(!PRIVACY.includes('public') && PRIVACY_UP.includes('public'), "duyệt chỉ private|unlisted, 'public' chỉ ở PRIVACY_UP");
const vr = videoResource({ clip: 'en-aaa', privacy: 'public', publish_at: new Date(Date.now() + 864e5).toISOString(), title: 't' }, {}), vp = videoResource({ clip: 'en-aaa', privacy: 'private', publish_at: new Date(Date.now() + 864e5).toISOString(), title: 't' }, {});
ok(vr.status.privacyStatus === 'public' && !vr.status.publishAt && vp.status.privacyStatus === 'private' && vp.status.publishAt, 'public tải ngay không publishAt; private giữ publishAt');
ok(videoResource({ clip: 'x', privacy: 'bogus' }, {}).status.privacyStatus === 'private', 'giá trị lạ → private');
ok(/async probe\(db, b, who, env\)/.test(yt) && /async probe_status/.test(yt) && /yt-probe\.mjs/.test(wf) && /driveSign/.test(fs.readFileSync('scripts/social/yt-probe.mjs', 'utf8')), 'op probe + probe_status trong CLI_OPS, workflow gọi yt-probe');
console.log(`✓ yt-fill: ${n} kiểm`);
