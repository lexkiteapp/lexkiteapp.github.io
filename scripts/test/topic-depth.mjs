// Chủ đề sâu (docs/specs/topic-depth.md): dữ liệu đủ luật (≥ 80 từ, CEFR, tiểu chủ đề, col, hội thoại 2–4 câu…), gói sinh khớp nguồn, đã đăng ký gói lười + có giao diện.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const SRC = 'content/topic-depth', ids = fs.readdirSync(SRC).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } };
try { execFileSync(process.execPath, ['scripts/build-topic-depth.mjs', '--check'], { stdio: 'inherit' }); } catch { fails++; console.error('✗ build-topic-depth --check'); }
const B = fs.readFileSync('web/js/bundles.js', 'utf8'), UI = fs.readFileSync('web/cpack/topic/ui.js', 'utf8'), APP = fs.readFileSync('web/js/app.js', 'utf8');
ok(ids.length >= 1, 'có ít nhất 1 chủ đề sâu');
for (const id of ids) {
  ok(B.includes(`'topicx-${id}': ['cpack/topic/${id}.js']`), `bundles.js đăng ký topicx-${id}`);
  const raw = JSON.parse(fs.readFileSync(path.join(SRC, id + '.json'), 'utf8'));
  ok(raw.topic === id, `${id}: trường topic khớp tên tệp`);
  const sc = raw.sub.every(s => s.scene && s.name && s.name.en && s.name.vi && s.emoji); ok(sc, `${id}: mỗi tiểu chủ đề có name en/vi + scene + emoji`);
  const exs = raw.words.map(w => w.ex).filter(Boolean); ok(new Set(exs).size === exs.length, `${id}: câu ví dụ không trùng`);
  const keysOk = raw.dialogs.every(d => d.key.length && d.key.every(k => d.lines.some(l => l[1].toLowerCase().includes(k.toLowerCase().split(' ')[0])))); ok(keysOk, `${id}: từ khoá hội thoại xuất hiện trong lời thoại`);
}
ok(/topicx: \['cpack\/topic\/ui\.js'\]/.test(B), 'bundles.js đăng ký gói giao diện topicx');
ok(/LK_BUNDLES\[xb\]/.test(APP) && /LK_TOPICX_UI\.draw/.test(APP), 'routes.topic rẽ sang giao diện chủ đề sâu và quay về trang cũ khi lỗi tải');
ok(/window\.LK_TOPICX_UI = \{/.test(UI), 'ui.js xuất LK_TOPICX_UI');
console.log(fails ? `✗ topic-depth: ${fails} lỗi` : `✓ topic-depth: ${ids.length} chủ đề sâu`);
process.exit(fails ? 1 : 0);
