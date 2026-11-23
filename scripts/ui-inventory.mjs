// Kiểm kê giao diện: MỌI route (từ docs/codemap.json do router), mọi sheet/hộp thoại (UI.modal) và trạng thái → docs/ui-inventory.json.
// Chạy: node scripts/ui-inventory.mjs [--check]  (--check: lỗi nếu file lệch nguồn). Dùng bởi workflow chụp toàn app (ui-audit-shots) và bảng chấm.
import fs from 'node:fs'; import path from 'node:path';
const cm = JSON.parse(fs.readFileSync('docs/codemap.json', 'utf8'));
const SAMPLE = { '#/day': '#/day/1', '#/dict': '#/dict/hello', '#/grammar': '#/grammar', '#/course': '#/course', '#/welcome': '#/welcome/setup', '#/topic': '#/topic/awl1', '#/skill': '#/skill/listening', '#/verb': '#/verb/go', '#/lesson': '#/lesson', '#/practice': '#/practice' };
const AREA = r => /home|path|day|review|practice|course|deck|library|mistakes|placement|lesson|train|tracks|reflex|rtype|topic/.test(r) ? 'hoc' : /vocab|dict|verb|phrases|letters/.test(r) ? 'tu' : /skill|grammar|speak|call|roleplay|say|pron|listen|dictation|read|write|paraphrase|task1|style|criteria|model|mediate|confidence|fix|handsfree|watch|method/.test(r) ? 'ky-nang' : /tests|cbt|quick|toeic|toefl|mock|qstats|cambridge/.test(r) ? 'thi' : /welcome/.test(r) ? 'chao' : 'toi-he-thong';
// trạng thái mỗi màn: new/returning chụp được bằng hạt giống bộ nhớ; rỗng/đang tải/lỗi/đầy cần fixture riêng (ghi 'fixture' = chưa chụp tự động)
const STATES = r => ['new', 'returning', ...(/review|mistakes|deck|library|league|stats|qstats|streak|path|home/.test(r) ? ['empty', 'full'] : []), ...(/dict|lesson|speak|call|roleplay|listen|read|write|cbt|mock/.test(r) ? ['loading', 'error'] : [])];
const routes = Object.entries(cm.routes).map(([r, files]) => ({ route: r, hash: SAMPLE[r] || r, area: AREA(r), files, states: STATES(r) })).sort((a, b) => a.route.localeCompare(b.route));
const sheets = []; const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!/i18n|node_modules/.test(f.name)) walk(p); } else if (/\.js$/.test(f.name)) scan(p); } };
function scan(p) { const s = fs.readFileSync(p, 'utf8'); let m; const re = /UI\.modal\(\s*([`'"])([\s\S]{0,160}?)(?:\1|\$\{)/g; const seen = new Set();
  while ((m = re.exec(s))) { const ln = s.slice(0, m.index).split('\n').length; const t = (m[2].match(/(?:t\(['"]([^'"]{3,60})['"]\)|<h[1-3][^>]*>([^<$]{3,60}))/) || []); const name = (t[1] || t[2] || '').trim(); const key = p + ':' + name; if (seen.has(key)) continue; seen.add(key); sheets.push({ file: p, line: ln, title: name, variant: /v:\s*'sheet'/.test(s.slice(m.index, m.index + 900)) ? 'sheet' : 'dialog' }); } }
walk('web/js'); walk('web/cpack');
const out = { _: 'Sinh bởi scripts/ui-inventory.mjs – đừng sửa tay', matrix: { viewports: [390, 768], themes: ['light', 'dark'], langs: ['vi', 'en', 'ar'] }, routes, sheets: sheets.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line) };
const txt = JSON.stringify(out, null, 1) + '\n';
if (process.argv.includes('--check')) { const cur = fs.existsSync('docs/ui-inventory.json') ? fs.readFileSync('docs/ui-inventory.json', 'utf8') : ''; if (cur !== txt) { console.error('✗ docs/ui-inventory.json lệch nguồn – chạy node scripts/ui-inventory.mjs'); process.exit(1); } console.log('✓ ui-inventory khớp'); }
else { fs.writeFileSync('docs/ui-inventory.json', txt); console.log(`ui-inventory: ${routes.length} route, ${sheets.length} sheet/hộp thoại`); }
