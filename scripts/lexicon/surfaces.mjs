// Cổng nhất quán giữa các giao diện (gọi từ scripts/build-lexicon.mjs = dict-consistency): cùng 1 từ → cùng dữ liệu ở mọi nơi.
// Kiểm bằng DỮ LIỆU mà từng giao diện thực sự đọc (bản hiển thị thật trên Chromium: scripts/test/dict-perf.mjs, CI dict-perf.yml):
//   web/app tra từ + thẻ/quiz/widget/lớp học (IELTS_DATA.INDEX) ⇄ mảnh Lex (web, mobile, add-on service worker/popup) ⇄ tab mới add-on (extension/nt)
//   ⇄ bản chép add-on (extension/app/js) ⇄ id chủ đề trong blog ⇄ gói nghĩa 13 ngôn ngữ (khóa từ / từ#loại).
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { loadBrowserIndex, buildShards } from './shards.mjs';

const ROOT = new URL('../../', import.meta.url).pathname, rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const require = createRequire(import.meta.url);

export function surfaceErrors() {
  const errs = [], warn = [];
  const { INDEX, TOPICS } = loadBrowserIndex();
  const Lex = require(path.join(ROOT, 'web/js/lex.js'));
  // 1) mảnh = INDEX (từng mục, mọi trường – kể cả trường thêm sau như img)
  const b = buildShards();
  if (b.collide.length) errs.push(`mảnh: ${b.collide.length} từ trùng khóa sau chuẩn hóa (${b.collide.slice(0, 5).join(', ')})`);
  let bad = 0; for (const k of Object.keys(INDEX)) { const e = b.E.get(Lex.norm(k)); if (!e || JSON.stringify(e) !== JSON.stringify(INDEX[k])) { if (bad++ < 3) errs.push(`mảnh lệch INDEX: ${k}`); } }
  for (const c of b.core) for (const [k, list] of Object.entries(c.d.p || {})) for (const [w, vi, ex] of list) { const e = INDEX[w.toLowerCase()]; if (!e || e.vi !== vi || (e.ex || '') !== ex) { if (bad++ < 3) errs.push(`cụm của "${k}" lệch INDEX: ${w}`); } }
  for (const [f, base] of b.R) if (!b.E.has(base)) errs.push(`dạng bất quy tắc ${f} → ${base} không có mục`);
  // 2) tab mới add-on: IPA Anh/Mỹ, CEFR, nghĩa đầu = mục chính
  const NT = path.join(ROOT, 'extension/nt'); let ntBad = 0, ntN = 0;
  if (fs.existsSync(NT)) for (const f of fs.readdirSync(NT).filter(x => x.endsWith('.json'))) {
    const m = JSON.parse(fs.readFileSync(path.join(NT, f), 'utf8'));
    for (const [k, o] of Object.entries(m)) {
      const e = INDEX[k]; if (!e) continue; ntN++;
      const s0 = (o.s || [])[0] || [];
      const diff = [(o.i || '') !== (e.ipa || o.i || '') && 'ipa', e.ipa && (o.u || '') !== (e.ipaUS || '') && 'ipaUS', e.level && o.l !== e.level && 'level', e.def && (s0[0] !== (e.pos || '') || s0[1] !== (e.vi || '')) && 'nghĩa đầu'].filter(Boolean);
      if (diff.length && ntBad++ < 3) errs.push(`tab mới (extension/nt/${f}) "${k}" lệch kho: ${diff.join(', ')} → chạy: node scripts/gen-newtab.mjs`);
    }
  }
  if (ntBad > 3) errs.push(`… tab mới lệch kho tổng ${ntBad}/${ntN} từ`);
  // 3) bản chép add-on của mã tra từ
  for (const f of ['lex.js', 'dictionary.js']) { const a = `web/js/${f}`, c = `extension/app/js/${f}`; if (!fs.existsSync(path.join(ROOT, c)) || rd(a) !== rd(c)) errs.push(`${c} lệch ${a} → chạy: bash scripts/build-extension.sh`); }
  if (!/importScripts\([^)]*app\/js\/lex\.js/.test(rd('extension/background.js'))) errs.push('extension/background.js chưa nạp app/js/lex.js');
  if (!rd('extension/popup.html').includes('app/js/lex.js')) errs.push('extension/popup.html chưa nạp app/js/lex.js');
  // 4) blog: id chủ đề viết tay phải có thật
  const ids = new Set(TOPICS.map(t => t.id)), m = /const TOPIC_IDS = new Set\(\[([^\]]*)\]/.exec(rd('scripts/build-blog.mjs'));
  if (m) for (const id of [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1])) if (!ids.has(id)) errs.push(`scripts/build-blog.mjs TOPIC_IDS "${id}" không có trong IELTS_DATA.TOPICS`);
  // 5) gói nghĩa: khóa "từ" / "từ#loại" (loại đã chuẩn hóa) – khóa lạ = nghĩa không bao giờ hiện
  const POS = new Set(['n', 'v', 'adj', 'adv', 'phrv']);
  for (const f of fs.readdirSync(path.join(ROOT, 'web/packs')).filter(x => /^[a-z]{2}\.json$/.test(x))) {
    const P = JSON.parse(rd('web/packs/' + f)); let odd = 0;
    for (const k of Object.keys(P)) { const [w, p] = k.split('#'); if (p != null && !POS.has(p) && !INDEX[w]) odd++; if (!Array.isArray(P[k]) || typeof P[k][0] !== 'string') { errs.push(`web/packs/${f} "${k}": giá trị không phải [nghĩa, cờ, tin cậy]`); break; } }
    if (odd) warn.push(`web/packs/${f}: ${odd} khóa từ#loại lạ`);
  }
  return { errs, warn, stats: { words: b.E.size, irregular: b.R.size, nt: ntN } };
}
