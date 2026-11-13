// Ghi chú lỗi theo tiếng mẹ đẻ (web/js/grammar/l1/<lang>.js, trục whyL1 của WORLD.md). Kiểm khuôn + sàn số mục (CHỈ TĂNG, scripts/test/l1-floors.json).
// Mỗi mục [✗ câu sai, ✓ câu đúng, vì sao, l1Form]: l1Form (BẮT BUỘC khi ngôn ngữ ≥ 100 mục) = câu/cấu trúc tiếng mẹ đẻ gây lỗi, dạng `<câu L1> → "<dịch sát>"`; D.because = nhãn dòng đó.
// ✗ ≠ ✓, hai câu tiếng Anh, vì sao viết ĐÚNG chữ ngôn ngữ đó (không lẫn tiếng Việt/Anh), bài tồn tại, không trùng ✗.
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
  const seen = new Set(); let n = 0; const need = Object.values(D.notes || {}).flat().length >= 100; if (need && !String(D.because || '').trim()) err.push(`${l}: thiếu because (nhãn dòng l1Form)`);
  for (const [id, list] of Object.entries(D.notes || {})) {
    if (!ids.has(id)) err.push(`${l}: bài không tồn tại "${id}"`);
    for (const x of list) {
      n++; const [bad, good, why, f] =Array.isArray(x) ? x : [], at = `${l}/${id}#${n}`;
      if (![bad, good, why].every(s => typeof s === 'string' && s.trim())) { err.push(`${at}: thiếu trường`); continue; }
      if (bad.trim() === good.trim()) err.push(`${at}: ✗ trùng ✓`);
      if (!/^[\x20-\x7E’‘“”–—…]+$/.test(bad + good) || bad.split(/\s+/).length < 2 || good.split(/\s+/).length < 2) err.push(`${at}: ✗/✓ phải là câu tiếng Anh ASCII ≥ 2 từ`);
      if (why.trim().length < 25) err.push(`${at}: lời giải quá ngắn`);
      if (why.length > 420) err.push(`${at}: lời giải quá dài (>420)`);
      if (l !== 'vi' && VI.test(why)) err.push(`${at}: lẫn tiếng Việt`);
      if (SCRIPT[l]) { const s = why.replace(/[A-Za-z0-9\s.,;:!?'"()\[\]\/+\-–—→=*<>…]/g, '').replace(/[“”‘’「」『』（）、。，：；！？]/g, ''); const k = [...s].filter(c => SCRIPT[l].test(c)).length; if (k < 6) err.push(`${at}: không đủ chữ ${l}`); }
      else if (l === 'vi' && !VI.test(why)) err.push(`${at}: không phải tiếng Việt`);
      if (need) {
        if (typeof f !== 'string' || !/→\s*"[^"]{2,}"\s*$/.test(f.trim())) err.push(`${at}: thiếu/sai l1Form (dạng: câu L1 → "dịch sát")`);
        else {
          const lf = f.split('→')[0]; if (lf.trim().length < 3 || lf.length > 140) err.push(`${at}: l1Form quá ngắn/dài`);
          if (SCRIPT[l] && ![...lf].some(c => SCRIPT[l].test(c))) err.push(`${at}: l1Form không có chữ ${l}`);
          if (l === 'vi' && !/[\u0300-\u036f]|đ/i.test(lf.normalize('NFD'))) err.push(`${at}: l1Form không phải tiếng Việt`);
          if (l !== 'vi' && VI.test(lf)) err.push(`${at}: l1Form lẫn tiếng Việt`);
          // máy kiểm: lời giải phải TRÍCH một đoạn của câu L1 trong l1Form; gloss phải chứa ≥ 50% từ của câu sai
          const nt = x => String(x).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean), lt = new Set(nt(lf));
          if (![...why.matchAll(/[«“"]([^»”"]{2,60})[»”"]/g)].some(m => { const t = nt(m[1]); return t.length && t.filter(y => lt.has(y)).length / t.length >= 0.8; })) err.push(`${at}: lời giải không trích đoạn nào của câu L1 trong l1Form`);
          const gl = new Set(nt((f.match(/→\s*"([^"]+)"/) || [])[1] || '').flatMap(y => y.split('-'))), wt = nt(bad).filter(y => /[a-z0-9]/.test(y));
          if (wt.filter(y => gl.has(y)).length / wt.length < 0.5) err.push(`${at}: gloss không khớp câu sai ("${bad}")`);
          if (norm(lf) === norm(bad) || norm(lf) === norm(good)) err.push(`${at}: l1Form phải là câu tiếng mẹ đẻ, không phải câu tiếng Anh`);
        }
      }
      const key = norm(bad); if (seen.has(key)) err.push(`${at}: trùng ✗ "${bad}"`); seen.add(key);
    }
  }
  rows.push(`${l} ${n}`); if (n < (floors[l] || 0)) err.push(`${l}: ${n} mục < sàn ${floors[l]}`);
}
console.log('L1 notes:', rows.join(' · '));
if (err.length) { console.error(err.slice(0, 40).join('\n') + (err.length > 40 ? `\n… +${err.length - 40}` : '')); process.exit(1); }
console.log('✓ l1-notes');
