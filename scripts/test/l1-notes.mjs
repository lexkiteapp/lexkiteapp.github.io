// Ghi chú lỗi theo tiếng mẹ đẻ (web/js/grammar/l1/<lang>.js, trục whyL1 của WORLD.md). Kiểm khuôn + sàn số mục (CHỈ TĂNG, scripts/test/l1-floors.json).
// Mỗi mục [✗ câu sai, ✓ câu đúng, vì sao]: ✗ ≠ ✓, hai câu tiếng Anh, vì sao viết ĐÚNG chữ ngôn ngữ đó (không lẫn tiếng Việt/Anh), bài tồn tại, không trùng ✗.
import fs from 'fs'; import path from 'path'; import vm from 'vm'; import { fileURLToPath } from 'url';
import { SCRIPT, VI, norm } from '../content-qa/lib.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LANGS = 'vi es pt fr de id th zh ja ko hi ar ru tr'.split(' ');
const g = { window: {}, self: {} }; g.window = g; g.self = g; vm.createContext(g);
for (const d of ['web/js/grammar', 'web/cpack/grammar']) for (const f of fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.js'))) { try { vm.runInContext(fs.readFileSync(path.join(ROOT, d, f), 'utf8'), g); } catch { /* tệp cần DOM: bỏ */ } }
const ids = new Set((g.GRAMMAR || []).map(x => x.id));
const floors = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/test/l1-floors.json'), 'utf8'));
const err = [], rows = [];
for (const l of LANGS) {
  const f = path.join(ROOT, `web/js/grammar/l1/${l}.js`); if (!fs.existsSync(f)) { err.push(`${l}: thiếu tệp`); continue; }
  const w = {}; try { new Function('window', fs.readFileSync(f, 'utf8'))(w); } catch (e) { err.push(`${l}: lỗi cú pháp ${e.message}`); continue; }
  const D = w.GRAMMAR_L1; if (!D || D.lang !== l || !String(D.title || '').trim()) { err.push(`${l}: lang/title sai`); continue; }
  const seen = new Set(); let n = 0;
  for (const [id, list] of Object.entries(D.notes || {})) {
    if (!ids.has(id)) err.push(`${l}: bài không tồn tại "${id}"`);
    for (const x of list) {
      n++; const [bad, good, why] = Array.isArray(x) ? x : [], at = `${l}/${id}#${n}`;
      if (![bad, good, why].every(s => typeof s === 'string' && s.trim())) { err.push(`${at}: thiếu trường`); continue; }
      if (bad.trim() === good.trim()) err.push(`${at}: ✗ trùng ✓`);
      if (!/^[\x20-\x7E’‘“”–—…]+$/.test(bad + good) || bad.split(/\s+/).length < 2 || good.split(/\s+/).length < 2) err.push(`${at}: ✗/✓ phải là câu tiếng Anh ASCII ≥ 2 từ`);
      if (why.trim().length < 25) err.push(`${at}: lời giải quá ngắn`);
      if (why.length > 420) err.push(`${at}: lời giải quá dài (>420)`);
      if (l !== 'vi' && VI.test(why)) err.push(`${at}: lẫn tiếng Việt`);
      if (SCRIPT[l]) { const s = why.replace(/[A-Za-z0-9\s.,;:!?'"()\[\]\/+\-–—→=*<>…]/g, '').replace(/[“”‘’「」『』（）、。，：；！？]/g, ''); const k = [...s].filter(c => SCRIPT[l].test(c)).length; if (k < 6) err.push(`${at}: không đủ chữ ${l}`); }
      else if (l === 'vi' && !VI.test(why)) err.push(`${at}: không phải tiếng Việt`);
      const key = norm(bad); if (seen.has(key)) err.push(`${at}: trùng ✗ "${bad}"`); seen.add(key);
    }
  }
  rows.push(`${l} ${n}`); if (n < (floors[l] || 0)) err.push(`${l}: ${n} mục < sàn ${floors[l]}`);
}
console.log('L1 notes:', rows.join(' · '));
if (err.length) { console.error(err.slice(0, 40).join('\n') + (err.length > 40 ? `\n… +${err.length - 40}` : '')); process.exit(1); }
console.log('✓ l1-notes');
