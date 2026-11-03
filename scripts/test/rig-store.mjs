// Kho clip mạng xã hội (scripts/rig/store.mjs + todo.mjs): clip TRƯỢT cổng không được xuất (không kho, không Release), clip Reels được lưu,
// todo cho ci-filler không dựng lại spec đã đạt/đã trượt ở cùng nội dung, dựng lại khi spec đổi. Lỗi gốc 03/11: store xuất cả clip trượt (pass:false).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const R = path.resolve('scripts/rig'), T = fs.mkdtempSync(path.join(os.tmpdir(), 'rigstore-'));
const w = (f, j) => { fs.mkdirSync(path.dirname(path.join(T, f)), { recursive: true }); fs.writeFileSync(path.join(T, f), typeof j === 'string' ? j : JSON.stringify(j)); };
const spec = (id, tpl) => ({ id, lang: 'vi', slug: id, who: 'ama', template: tpl, mistake: { en: 'x', vi: 'x' }, en: { hook: 'h' }, deeplink: '#/grammar' });
w('content/video/rig/l1/vi/a.json', spec('vi-a', 'tip-card')); w('content/video/rig/l1/vi/b.json', spec('vi-b', 'tip-card')); w('content/video/rig/reels/vi/r.json', spec('vi-reel-r', 'phrase'));
const clip = (id, pass) => { const d = `art/clip-${id}/${id}`;
  w(`${d}/qc.json`, { score: pass ? 100 : 94, gates: { safe_zone_frames: pass, no_stray_text: true }, voices: [{ who: 'ama' }], total: 20, wpmSpeech: 120 });
  w(`${d}/native-qa.json`, { hook: 'Tiêu đề', post: 'bài', gates: {} }); w(`${d}/${id}.mp4`, 'v'); w(`${d}/cover.jpg`, 'c'); };
clip('vi-a', true); clip('vi-b', false); clip('vi-reel-r', true);
const run = (...a) => execFileSync('node', a, { cwd: T, encoding: 'utf8' });
const ok = (c, m) => { if (!c) { console.error('✗', m); process.exit(1); } console.log('✓', m); };
ok(/cần dựng 3 \/ 3/.test(run(`${R}/todo.mjs`, '--count')), 'todo: kho trống → 3 spec cần dựng');
run(`${R}/store.mjs`, 'art', '2026-11-03', 'o/r');
const V = path.join(T, 'content/social/videos/vi'), up = fs.readFileSync(path.join(T, 'art/uploads.tsv'), 'utf8');
ok(fs.existsSync(path.join(V, '2026-11-03-vi-a/meta.json')) && !fs.existsSync(path.join(V, '2026-11-03-vi-b')), 'clip trượt không vào kho');
ok(!up.includes('vi-b') && up.includes('vi-a') && up.includes('vi-reel-r'), 'clip trượt không lên Release; clip Reels đạt được xuất');
ok(JSON.parse(fs.readFileSync(path.join(T, 'content/social/videos/rejected.json'), 'utf8'))['vi-b'].failed[0] === 'safe_zone_frames', 'rejected.json ghi cổng trượt');
ok(/cần dựng 0 \/ 3/.test(run(`${R}/todo.mjs`, '--count')), 'todo: đạt + đã trượt cùng sha → không dựng lại (không lặp runner)');
w('content/video/rig/l1/vi/b.json', { ...spec('vi-b', 'tip-card'), cta: 'sửa' });
ok(run(`${R}/todo.mjs`, '--list').trim() === 'content/video/rig/l1/vi/b.json', 'todo: spec trượt được sửa → dựng lại');
fs.rmSync(T, { recursive: true, force: true }); console.log('rig-store: ok');
