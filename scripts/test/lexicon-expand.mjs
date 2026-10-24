// Mở rộng kho từ (docs/LEXICON.md §Mở rộng 20k): cổng mục (gateEntry), dịch ngược, sổ việc hạ nguồn (infra/lexicon-consumers.json).
import fs from 'fs';
import path from 'path';
import { gateEntry, btMatch, toIndex, LANGS, loadExpand } from '../lexicon/expand/lib.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };
const TR = { es: 'abandonar', pt: 'abandonar', fr: 'abandonner', de: 'verlassen', id: 'meninggalkan', th: 'ละทิ้ง', zh: '放弃', ja: '見捨てる', ko: '버리다', hi: 'छोड़ देना', ar: 'يتخلى عن', ru: 'покидать', tr: 'terk etmek' };
const good = () => ({ w: 'forsake', pos: 'v', ipa: '/fəˈseɪk/', ipaUS: '/fərˈseɪk/', def: 'to leave someone or something completely', ex: ['He would never forsake his friends.', 'She forsook her career for her family.'], col: ['forsake a friend'], syn: ['abandon', 'desert'], level: 'C1', cefrF: 'C2', emoji: '', topic: 'xw-actions', vi: 'bỏ rơi; từ bỏ', note_vi: '', m: { ...TR },
  qa: { j: { 'gemini:gemini-3.5-flash': 5, 'gemma:gemma-3-27b-it': 4 }, tr: Object.fromEntries(LANGS.map(l => [l, [5, 4]])), btw: Object.fromEntries(LANGS.map(l => [l, ['abandon']])) } });
ok(gateEntry(good()).ok, 'mục tốt phải đạt: ' + JSON.stringify(gateEntry(good()).why));
const bad = (f, m) => { const e = good(); f(e); ok(!gateEntry(e).ok, 'phải trượt: ' + m); };
bad(e => e.ipa = '', 'thiếu IPA Anh');
bad(e => e.ipaUS = '/fɚˈseɪk/', 'IPA Mỹ ký hiệu ngoài bảng');
bad(e => e.qa.j = { 'gemini:a': 5, 'gemini:b': 5 }, '2 giám khảo cùng họ');
bad(e => e.qa.j['gemma:gemma-3-27b-it'] = 3, 'giám khảo < 4');
bad(e => e.m.th = 'bỏ rơi', 'lẫn tiếng Việt ở th');
bad(e => e.m.ja = 'forsake', 'sai chữ viết ja / chưa dịch');
bad(e => e.qa.tr.ko = [5, 3], 'dịch ko giám khảo 3');
bad(e => e.qa.btw = Object.fromEntries(LANGS.map(l => [l, ['leave']])), 'dịch ngược < 0.8');
bad(e => e.ex = ['He left.', 'She went.'], 'ví dụ không chứa từ');
bad(e => e.vi = 'abandon', 'vi không phải tiếng Việt');
ok(gateEntry(null).ok === false && gateEntry(good(), { keep: false }).ok === false, 'không sinh được / keep=false → hàng duyệt');
ok(btMatch('to abandon', 'forsake', ['abandon']) && !btMatch('to eat', 'forsake', ['abandon']), 'btMatch');
// sổ việc hạ nguồn: mọi script đọc kho phải đăng ký + đường nạp còn trong mã
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/lexicon-consumers.json'), 'utf8'));
const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(x => x.isDirectory() ? (x.name === 'test' && d === 'scripts' ? [] : walk(d + '/' + x.name)) : /\.(mjs|js|cjs|py)$/.test(x.name) ? [d + '/' + x.name] : []);
const READS = /loadAll\(|loadAllPlus\(|loadBrowserIndex\(|dist\/lexicon\.json|IELTS_DATA\.INDEX/;
for (const f of walk('scripts')) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); if (!READS.test(s)) continue; const c = REG.consumers[f]; ok(c, `${f} đọc kho từ nhưng chưa có trong infra/lexicon-consumers.json (via expand-aware hoặc skip + lý do)`); if (c && c.via) ok(s.includes(c.via) || (c.via === 'loadBrowserIndex' && s.includes('loadBrowserIndex')), `${f}: via "${c.via}" không còn trong mã`); }
for (const f of Object.keys(REG.consumers)) ok(fs.existsSync(path.join(ROOT, f)), `infra/lexicon-consumers.json: ${f} không tồn tại`);
// trường mới của mục từ mở rộng phải khai trong fields (để rà việc hạ nguồn)
for (const k of Object.keys(toIndex({ ...good(), note_vi: 'x' }))) ok(REG.fields.includes(k), `trường "${k}" của mục mở rộng chưa khai trong infra/lexicon-consumers.json fields`);
// mục đã xuất: qua lại cổng + có trong mảnh
const pub = loadExpand();
if (pub.length) { const { buildShards } = await import('../lexicon/shards.mjs'); const b = buildShards(); const Lex = (await import('module')).createRequire(import.meta.url)(path.join(ROOT, 'web/js/lex.js'));
  for (const { k, e } of pub) { ok(gateEntry(e).ok, `${k} đã xuất nhưng trượt cổng`); ok(b.E.has(Lex.norm(e.w)), `${k} đã xuất nhưng không có trong mảnh tra từ`); } }
if (REG.todo && Object.keys(REG.todo).length) console.log('⚠ lexicon-expand việc hạ nguồn còn thiếu: ' + Object.keys(REG.todo).join(', '));
if (fail) { console.error(`✗ lexicon-expand: ${fail} lỗi`); process.exit(1); }
console.log(`✓ lexicon-expand: cổng mục + dịch ngược + ${Object.keys(REG.consumers).length} việc hạ nguồn · ${pub.length} mục đã xuất`);
