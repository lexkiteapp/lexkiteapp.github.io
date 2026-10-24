// Mở rộng kho từ – cổng + nạp mục đã xuất (một nguồn: content/lexicon/expand/<lô>.json). docs/LEXICON.md §Mở rộng 20k.
// Mọi giao diện/việc hạ nguồn đọc mục mở rộng QUA ĐÂY (loadExpand / expandRows) – test scripts/test/lexicon-consumers.mjs chặn việc bỏ sót.
import fs from 'fs';
import { ROOT, rd } from '../lib.mjs';
import { badChars } from '../ipa.mjs';
import { agree, trIssues, VI, CE, SCRIPT } from '../../content-qa/lib.mjs';
export const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const QUEUE = 'content/qa/review-queue.json';
const DIR = 'content/lexicon/expand/';
// chủ đề sẵn có (bộ theo chủ đề) + bộ mới cho từ mở rộng (xw-*)
export const TOPIC_CHOICES = ['education', 'environment', 'technology', 'health', 'work', 'society', 'crime', 'media', 'urban', 'travel', 'culture', 'sport', 'science', 'government', 'economy', 'energy', 'wildlife', 'architecture', 'consumerism', 'space', 'language', 'food',
  'office-it', 'office-hr', 'us-housing', 'us-money', 'us-health', 'dom-it', 'dom-biz', 'dom-med', 'dom-eng', 'dom-law', 'dom-mkt', 'dom-env', 'dom-hosp', 'dom-edu', 'dom-log',
  'xw-people', 'xw-feelings', 'xw-body', 'xw-home', 'xw-nature', 'xw-objects', 'xw-actions', 'xw-qualities', 'xw-time-place', 'xw-arts', 'xw-religion-history', 'xw-military', 'xw-everyday'];
const ex = p => fs.existsSync(new URL(p, ROOT));
const J = p => JSON.parse(rd(p));
const words = s => String(s || '').toLowerCase().match(/[a-z]+/g) || [];
// dịch ngược khớp: bản dịch ngược chứa từ đầu mục / đồng nghĩa / cùng gốc 5 chữ
export function btMatch(bt, w, syn = []) {
  const T = new Set([w, ...syn.flatMap(words)].filter(Boolean)), stem = x => x.slice(0, Math.max(4, Math.min(5, x.length - 1)));
  const S = new Set([...T].map(stem));
  return words(bt).some(t => T.has(t) || (t.length >= 4 && S.has(stem(t))));
}
const formOf = (w, s) => { const t = words(s), st = w.split('-')[0].slice(0, Math.min(w.length, 4)); return t.some(x => x === w || x.startsWith(st)); }; // biến tố/bất quy tắc (forsook) vẫn khớp 4 chữ đầu
// Cổng 1 mục (CỨNG): lược đồ · IPA hợp lệ (Anh từ Wiktionary, Mỹ từ CMUdict) · 2 giám khảo khác họ ≥ 4 lệch ≤ 1 · CEFR · dịch (≥ 4 cả 2 giám khảo, đúng chữ viết, không lẫn tiếng Việt, dịch ngược ≥ 0.8)
export function gateEntry(e, { keep } = {}) {
  const why = [];
  if (!e) return { ok: false, why: ['gen: không sinh được'] };
  if (keep === false) return { ok: false, why: ['keep: không phải mục từ chuẩn'] };
  if (!['n', 'v', 'adj', 'adv'].includes(e.pos)) why.push('schema: pos');
  if (!e.ipa) why.push('ipa: thiếu IPA Anh (Wiktionary)'); else if (badChars(e.ipa).length) why.push('ipa: ký hiệu ngoài bảng ' + badChars(e.ipa).join(''));
  if (!e.ipaUS) why.push('ipa: thiếu IPA Mỹ'); else if (badChars(e.ipaUS).length) why.push('ipa: Mỹ ngoài bảng ' + badChars(e.ipaUS).join(''));
  if (!e.def || words(e.def).length > 18 || words(e.def).includes(e.w)) why.push('schema: định nghĩa');
  if (!Array.isArray(e.ex) || e.ex.length !== 2 || e.ex[0] === e.ex[1] || e.ex.some(s => !formOf(e.w, s))) why.push('schema: 2 ví dụ chứa từ');
  if (!Array.isArray(e.col) || !e.col.length) why.push('schema: cụm từ');
  if (!CE.includes(e.level)) why.push('cefr: cấp');
  else if (Math.abs(CE.indexOf(e.level) - CE.indexOf(e.cefrF || e.level)) > 2) why.push('cefr: lệch tần suất > 2 bậc');
  if (!e.vi || !VI.test(e.vi) && !/[àáâãèéêìíòóôõùúýđ]/i.test(e.vi)) why.push('dịch vi: không phải tiếng Việt');
  const a = agree(e.qa); if (!a.ok) why.push('giám khảo: ' + a.why);
  let bt = 0;
  for (const l of LANGS) {
    const t = (e.m || {})[l], sc = (e.qa.tr || {})[l] || [];
    const is = trIssues(e.w, t, l); if (t && SCRIPT[l] && !SCRIPT[l].test(t)) is.push('không có chữ bản địa'); if (t && String(t).toLowerCase().trim() === e.w && !['es', 'pt', 'fr', 'de', 'id', 'tr'].includes(l)) is.push('chép nguyên từ tiếng Anh');
    if (is.length) { why.push(`dịch ${l}: ${is.join(', ')}`); continue; }
    if (sc.length < 2 || Math.min(...sc) < 4) why.push(`dịch ${l}: giám khảo < 4 (${sc.join('/')})`);
    if (((e.qa.btw || {})[l] || []).some(b => btMatch(b, e.w, e.syn))) bt++;
  }
  const btr = e.qa.btw ? bt / LANGS.length : e.qa.bt;
  if (!(btr >= 0.8)) why.push(`dịch ngược ${btr && btr.toFixed(2)} < 0.8`);
  return why.length ? { ok: false, why } : { ok: true, bt: +btr.toFixed(2) };
}
const files = sub => ex(DIR + sub) ? fs.readdirSync(new URL(DIR + sub, ROOT)).filter(f => /^[\w.-]+\.json$/.test(f) && f !== 'candidates.json').map(f => DIR + sub + f) : [];
// từ đã xử lý (đã xuất + chờ soát + hàng duyệt) – để chạy lại không làm trùng
export function doneWords() {
  const s = new Set();
  for (const f of [...files(''), ...files('pending/')]) for (const k of Object.keys(J(f).items || {})) s.add(k.split('#')[0]);
  if (ex(QUEUE)) for (const q of J(QUEUE).items || []) if (q.src === 'lexicon-expand') s.add(String(q.id).split('#')[0]);
  return s;
}
// Mục ĐÃ XUẤT: lô ở content/lexicon/expand/<lô>.json có tệp kiểm mẫu content/qa/batches/lx-<lô>.json đạt (status published)
export function loadExpand() {
  const out = [];
  for (const f of files('')) {
    const b = J(f), bf = `content/qa/batches/lx-${b.id}.json`;
    if (!ex(bf) || J(bf).status !== 'published') continue;
    for (const [k, e] of Object.entries(b.items)) out.push({ k, e, batch: b.id, file: f });
  }
  return out;
}
// Dạng INDEX (giống IELTS_DATA.INDEX của trình duyệt) cho mảnh tra từ
export const toIndex = e => ({ word: e.w, ipa: e.ipa, pos: e.pos, vi: e.vi, def: e.def, ex: e.ex[0], col: e.col, syn: e.syn, level: e.level, emoji: e.emoji || '', ipaUS: e.ipaUS === e.ipa ? '' : e.ipaUS, topic: e.topic || '', ex2: e.ex[1], ...(e.note_vi ? { note: e.note_vi } : {}), x: 1 });
// Dạng dòng kho (scripts/lexicon/lib.mjs loadAll) cho việc Node hạ nguồn (âm thanh, kịch bản, dist/lexicon.json…)
export const expandRows = () => loadExpand().map(({ e, batch, file }) => ({ file, line: -1, set: e.topic || 'xw-everyday', x: 1, batch, row: [e.w, e.ipa, e.pos, e.vi, e.def, e.ex[0], e.col.join('|'), e.syn.join('|'), e.level, e.emoji || '', e.ipaUS === e.ipa ? '' : e.ipaUS] }));
