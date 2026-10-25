import { allowed, SAME_FAM_PAIR } from '../lib/ai-pool.mjs';
// 🛡️ Cổng QA nội dung – hàm kiểm thuần (không I/O), dùng chung cho gate.mjs, job sinh nội dung (explain/job.mjs…) và test.
// Luật: docs/CONTENT-QA.md. Mọi nguồn nội dung đi qua: lược đồ + đối chiếu kho từ · cặp ✗/✓ · CEFR · 2 giám khảo độc lập · dịch · kiểm mẫu ≥5%/lô · báo lỗi tự ẩn.
export const CE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
export const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
export const SCRIPT = { th: /\p{Script=Thai}/u, zh: /\p{Script=Han}/u, ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u, ko: /\p{Script=Hangul}/u, hi: /\p{Script=Devanagari}/u, ar: /\p{Script=Arabic}/u, ru: /\p{Script=Cyrillic}/u };
export const norm = s => String(s ?? '').toLowerCase().replace(/<[^>]+>|\*/g, '').replace(/[^\p{L}\p{N}']+/gu, ' ').trim();
export const lvOk = l => CE.includes(l);
export const lvN = l => CE.indexOf(l);

// ✗/✓: câu sai và câu đúng phải khác nhau thật (không chỉ khác dấu câu), cả hai không rỗng, câu đúng chứa từ/cụm đích (nếu có)
export function pairOk(bad, good, target) {
  const raw = x => String(x ?? '').toLowerCase().replace(/<[^>]+>|\*/g, '').replace(/\s+/g, ' ').trim(); // sửa chỉ dấu câu (however → ; however,) vẫn hợp lệ
  const b = raw(bad), g = raw(good);
  if (!norm(b) || !norm(g) || b === g) return false;
  if (target && !g.includes(norm(target).split(' ')[0])) return false;
  return true;
}

// Giám khảo: qa.j = { '<họ mô hình>:<tên>': điểm 1–5 }. Đạt khi ≥ 2 HỌ mô hình khác nhau (gemini · llama/wai-b · …), mọi điểm ≥ 4, lệch ≤ 1.
// Không đạt → hàng duyệt (content/qa/review-queue.json), KHÔNG xuất.
export const family = k => String(k).split(':')[0].toLowerCase();
export function agree(qa) {
  const j = (qa && qa.j) || {}, all = Object.keys(j).filter(k => Number.isFinite(+j[k]));
  // Chuẩn giám khảo (scripts/lib/ai-pool.mjs): mô hình hạng S (quá nhỏ/lạ) không được tính là giám khảo
  const ks = all.filter(k => allowed('judge', k.slice(k.indexOf(':') + 1)));
  // độc lập = khác họ; NGOẠI LỆ duy nhất (25/10, neuron CF dành cho ảnh): cặp gpt-oss-120b + gpt-oss-20b (khác mô hình, giám khảo B lời nhắn khác – ai-pool JUDGE_B_SYS)
  const ident = k => { const f = family(k), m = k.slice(k.indexOf(':') + 1).replace(/^.*\//, ''); return SAME_FAM_PAIR[f] && SAME_FAM_PAIR[f].includes(m) ? f + ':' + m : f; };
  if (ks.length < all.length && new Set(ks.map(ident)).size < 2) return { ok: false, why: 'giám khảo không đủ chuẩn (mô hình nhỏ/lạ – ai-pool TIERS)' };
  const fams = new Set(ks.map(ident)), sc = ks.map(k => +j[k]);
  if (fams.size < 2) return { ok: false, why: 'cần 2 giám khảo độc lập (khác họ mô hình, hoặc cặp gpt-oss 120b + 20b)' };
  if (sc.some(s => s < 4)) return { ok: false, why: 'có giám khảo chấm < 4' };
  if (Math.max(...sc) - Math.min(...sc) > 1) return { ok: false, why: 'hai giám khảo lệch > 1 điểm' };
  return { ok: true };
}

// Dịch: giữ nguyên biến {x}, ô [đáp án], số; không lẫn tiếng Việt (trừ vi); đúng chữ viết bản địa; không phải bản tiếng Anh chép lại;
// dịch ngược (back-translation) do job ghi vào qa.bt (0–1) phải ≥ 0.8 với nội dung sinh tự động.
const toks = (s, re) => (String(s || '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).match(re) || []).sort().join('|');
export function trIssues(src, tr, lang, { bt } = {}) {
  const out = [];
  if (!tr || !String(tr).trim()) return ['rỗng'];
  if (toks(src, /\{\w+\}/g) !== toks(tr, /\{\w+\}/g)) out.push('mất/thừa biến {x}');
  if (toks(src, /\[[^\]]+\]/g) && toks(src, /\[[^\]]+\]/g) !== toks(tr, /\[[^\]]+\]/g)) out.push('mất ô [đáp án]');
  if (toks(src, /\d+/g) !== toks(tr, /\d+/g)) out.push('số không khớp');
  if (lang !== 'vi' && VI.test(tr)) out.push('lẫn tiếng Việt');
  if (SCRIPT[lang]) { const s = String(tr).replace(/“[^”]*”|"[^"]*"|\[[^\]]*\]|\{\w+\}/g, ''), n = [...s].filter(c => /\p{L}/u.test(c)), k = n.filter(c => SCRIPT[lang].test(c)).length; if (n.length >= 8 && k / n.length < 0.5) out.push('sai chữ viết bản địa'); }
  if (lang !== 'en' && String(src).length > 25 && norm(src) === norm(tr)) out.push('chưa dịch (giống bản gốc)');
  if (bt != null && !(+bt >= 0.8)) out.push('dịch ngược < 0.8');
  return out;
}

// Kiểm mẫu theo lô: ≥ 5% số mục (tối thiểu 1) được người/Claude soát; sai > 2% → loại cả lô
export function spot(batch) {
  const n = +batch.n || 0, ch = Array.isArray(batch.checked) ? batch.checked : [], bad = ch.filter(x => !x.ok).length;
  const need = Math.max(1, Math.ceil(n * 0.05));
  if (ch.length < need) return { ok: false, why: `kiểm mẫu ${ch.length}/${need} (cần ≥ 5%)` };
  if (bad / ch.length > 0.02) return { ok: false, why: `sai ${bad}/${ch.length} > 2% → loại lô` };
  return { ok: true };
}

// CEFR: từ trong câu có cấp kho từ cao hơn cấp bài > 1 bậc → "quá khó" (cho phép từ đích/tên riêng)
export function cefrOver(text, level, lex, allow = new Set()) {
  if (!lvOk(level)) return [];
  return norm(text).split(' ').filter(w => w && !allow.has(w) && lex.has(w) && lvOk(lex.get(w)) && lvN(lex.get(w)) > lvN(level) + 1);
}

// ---- Kiểm định nội dung 25/10/2026 (docs/CONTENT-AUDIT-2026-10-25.md): luật tất định cho mục từ vựng ----
// 1) IPA từ đơn có > 1 trọng âm chính (CMUdict ghi 2 ˈ cho từ ghép: /ˈhæfˈweɪ/)
export const ipaDoubleStress = (word, ipa) => !!ipa && !/\s/.test(String(word).trim()) && (String(ipa).match(/ˈ/g) || []).length > 1;
// 2) Nghĩa tiếng Việt có khúc trùng chữ tiếng Anh hay gặp (big = "to, lớn" → trắc nghiệm hiện "to" như giới từ tiếng Anh)
export const VI_EN_HOMOGRAPH = new Set(['to', 'do', 'in', 'on', 'at', 'an', 'me', 'men', 'ban', 'pin', 'con', 'the', 'a', 'bar', 'photo', 'logic', 'framework']);
export const viHomographs = (vi, word = '') => String(vi || '').split(/[;,]/).map(s => s.trim().toLowerCase()).filter(s => VI_EN_HOMOGRAPH.has(s) && s !== String(word).toLowerCase());
// 3) Nghĩa tiếng Việt lặp khúc ("địa điểm tổ chức; địa điểm (tổ chức)")
const viKey = s => s.toLowerCase().replace(/[()]/g, '').replace(/^(sự|lòng|việc|cái|thuộc về|thuộc|mang tính|một cách)\s+/, '').replace(/\s+/g, ' ').trim();
export const viDup = vi => { const k = String(vi || '').split(/[;,]/).map(viKey).filter(Boolean); return new Set(k).size < k.length; };
// 4) Từ loại ↔ định nghĩa: mục động từ phải có định nghĩa động từ ("to …"); trợ động từ khuyết thiếu dùng "used …"
export const verbDefOk = def => /^(\([^)]*\)\s*)?to\b|^used\b|^modal\b|^expressing\b|^what is expected/i.test(String(def || '').trim());
