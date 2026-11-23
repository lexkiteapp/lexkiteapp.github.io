// RTL + bản dịch ar (kiểm tĩnh, không mạng, ≤ 1 s):
// (a) chevron/mũi tên có hướng phải lật trong RTL: style.css có luật [dir="rtl"] .i-dir {scaleX(-1)}; UI.icon() tự gắn .i-dir cho icon có hướng; ui.js có rtlFix (Material Symbols, "→" cuối nhãn, bọc <bdi dir=ltr> cụm Latin)
// (b) mọi ngôn ngữ không được trùng nguyên văn tiếng Anh (chưa dịch) và không còn lỗi dịch máy đã biết ("deck" = "سطح السفينة"); ngoại lệ nhỏ có lý do ở ALLOW
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const rd = f => fs.readFileSync(new URL(f, import.meta.url), 'utf8');

// (a)
const css = rd('../../web/css/style.css'), ui = rd('../../web/js/ui.js');
ok(/\[dir="rtl"\]\s*\.i-dir\s*\{[^}]*scaleX\(-1\)/.test(css), 'style.css thiếu [dir="rtl"] .i-dir { transform: scaleX(-1) }');
const dir = (ui.match(/const DIRI = \/(.+)\/;/) || [])[1] || '';
for (const nm of ['arrow-left', 'arrow-right', 'chevron-left', 'chevron-right', 'chevrons-right', 'skip-forward']) ok(new RegExp(dir).test(nm), `UI.icon: "${nm}" phải tự có .i-dir (DIRI)`);
for (const nm of ['x', 'search', 'check', 'arrow-up', 'volume-2']) ok(!new RegExp(dir).test(nm), `UI.icon: icon không hướng "${nm}" không được lật`);
ok(/const rtlFix\b/.test(ui) && /documentElement\.dir !== 'rtl'/.test(ui) && /createElement\('bdi'\)/.test(ui), 'ui.js thiếu rtlFix (Material Symbols / "→" / bdi)');
ok(new RegExp((ui.match(/const MDIR = \/(.+)\/;/) || [])[1] || '$^').test('chevron_right'), 'MDIR thiếu chevron_right');
ok(/bdi\[dir="ltr"\]\s*\{[^}]*unicode-bidi:\s*isolate/.test(css), 'style.css thiếu bdi[dir="ltr"] { unicode-bidi: isolate }');

// (b)
const load = u => { const g = {}; new Function('self', rd(u))(g); return g.I18N_DICT; };
const LAZY = ((rd('../build-i18n.sh').match(/^LAZY="([^"]*)"/m) || [])[1] || '').split(/\s+/).filter(Boolean);
const all = (l, base) => Object.assign({}, load(`${base}/${l}.js`)[l], ...LAZY.map(g => { const f = new URL(`${base}/${l}/${g}.js`, import.meta.url); return fs.existsSync(f) ? load(f.href)[l] : {}; }));
const EN = all('en', '../../web/js/i18n');
const LANGS = rd('../i18n-langs.txt').split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#'));
const WORDS = s => (String(s).replace(/<[^>]*>|\{[^}]*\}/g, ' ').match(/[A-Za-z]{3,}/g) || []);
// Ngoại lệ: chuỗi cố ý giữ tiếng Anh (tên riêng/kỳ thi/mã) – thêm "lang|khóa" kèm lý do; khóa tiếng Anh (nội dung học) và chuỗi ≤ 2 từ Latin tự được bỏ qua
const ALLOW = new Set([ // thuật ngữ ngữ pháp/đề thi giữ nguyên chủ ý
  'de|Writing Task 1 – Xu hướng', 'de|IELTS Listening – Đề {n}', 'de|IELTS Reading Academic – Đề {n}', 'de|IELTS Reading General Training – Đề {n}', 'de|TOEIC Listening & Reading – Đề {n}', // "Test" cũng là tiếng Đức; tên đề thi
  'de|Hiện tại hoàn thành tiếp diễn', 'de|Quá khứ hoàn thành tiếp diễn', 'de|Tương lai hoàn thành tiếp diễn']); // tên thì tiếng Anh dùng nguyên trong sách ngữ pháp Đức
for (const l of LANGS) {
  const D = all(l, '../../i18n/ui'), bad = [];
  for (const k of Object.keys(D)) {
    const v = D[k], en = EN[k];
    if (typeof v !== 'string' || typeof en !== 'string' || ALLOW.has(l + '|' + k)) continue;
    const viKey = /[\u00C0-\u1EF9]/.test(k.replace(/[a-z]/gi, '')); // khóa tiếng Anh (nội dung học) giữ nguyên là đúng
    if (viKey && WORDS(en).length > 2 && v.trim().toLowerCase() === en.trim().toLowerCase()) bad.push(k);
    if (l === 'ar') ok(!/سطح السفينة/.test(v), `ar "deck" bị dịch "boong tàu": ${JSON.stringify(k).slice(0, 80)}`);
  }
  ok(!bad.length, `${l}: ${bad.length} khóa trùng nguyên văn tiếng Anh (chưa dịch): ${bad.slice(0, 12).map(k => JSON.stringify(k.slice(0, 50))).join(', ')} – dịch hoặc thêm vào ALLOW kèm lý do`);
}
if (fails) { console.log(`✗ rtl-i18n: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ rtl-i18n: ${n} kiểm tra – chevron RTL, rtlFix, mọi ngôn ngữ không trùng tiếng Anh`);
