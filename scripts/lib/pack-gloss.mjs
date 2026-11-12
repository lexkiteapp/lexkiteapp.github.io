// Chọn nghĩa cho gói web/packs/<lang>.json từ phản hồi Google gtx (dt=t + dt=bd) CÓ KIỂM TRA DỊCH NGƯỢC.
// Lỗi gốc cũ (pregnant→充満,多産 · currently→実際に · victim→餌食 · diet→議会): lấy 2 bản dịch ĐẦU của đúng từ loại trong dt=bd,
// không xét bản dịch đó có dịch ngược về từ gốc hay không và không xét độ phổ biến → nghĩa cổ/hiếm/sai từ loại lọt vào.
// Nay: dt=bd cho mỗi bản dịch kèm danh sách "dịch ngược" (tiếng Anh) + điểm phổ biến → chỉ giữ bản dịch mà dịch ngược CHỨA từ gốc,
// xếp theo điểm giảm dần; bản dịch chính (dt=t) đứng đầu khi nó nằm trong số đó; không bản nào qua kiểm → bản dịch chính.
// Cờ trong gói: 0 dịch nhanh · 1 tinh chỉnh bản cũ (CHƯA kiểm ngược → sẽ làm lại) · 2 bảng tay/từ điển theo nghĩa (không bao giờ đè) · 3 tinh chỉnh + đã kiểm ngược.

export const FLAG = { QUICK: 0, LEGACY: 1, MANUAL: 2, VERIFIED: 3 };
export const POS = p => /^(n|noun)\b/.test(p) ? 'noun' : /^(v|verb|phr ?v)/.test(p) ? 'verb' : /^adj/.test(p) ? 'adjective' : /^adv/.test(p) ? 'adverb' : /^prep/.test(p) ? 'preposition' : /^conj/.test(p) ? 'conjunction' : /^pron/.test(p) ? 'pronoun' : '';

const norm = s => String(s || '').toLowerCase().replace(/^to /, '').trim();

// bd: j[1] của gtx (mảng [từ loại, [bản dịch], [[bản dịch, [dịch ngược], null, điểm]]]); base: bản dịch chính dt=t
// → { gloss, verified } (verified=false: không bản nào qua kiểm ngược, dùng bản dịch chính)
export function pickGloss(word, pos, bd, base) {
  const w = norm(word), want = POS(pos), dict = Array.isArray(bd) ? bd : [];
  const e = dict.find(d => d[0] === want) || (want ? null : dict[0]);
  const rows = e && Array.isArray(e[2]) ? e[2] : [];
  const ok = rows.filter(r => r && r[0] && Array.isArray(r[1]) && r[1].some(x => norm(x) === w)).sort((a, b) => (b[3] || 0) - (a[3] || 0));
  const b = String(base || '').trim();
  if (!ok.length) return { gloss: b, verified: false };
  const terms = ok.map(r => r[0]);
  const top = ok[0][3] || 0;
  // bản dịch chính nếu nằm trong số bản qua kiểm → đứng đầu; thêm tối đa 1 bản nữa có điểm ≥ 30 % bản đầu (cùng nghĩa phổ biến)
  const first = terms.includes(b) ? b : terms[0];
  const second = ok.find(r => r[0] !== first && (r[3] || 0) >= 0.3 * (terms.includes(b) ? Math.max(top, 0) : top));
  return { gloss: second ? first + ', ' + second[0] : first, verified: true };
}

// Kiểm ngược một bản nghĩa đã có (dùng trong cổng đối chiếu): resp = JSON gtx dịch NGƯỢC nghĩa → Anh với dt=t&dt=bd.
// Hợp lệ khi từ gốc xuất hiện trong bản dịch chính hoặc trong danh sách dịch ngược của bất kỳ từ loại nào.
export function backCheck(word, resp) {
  const w = norm(word), seen = new Set();
  if (resp && Array.isArray(resp[0])) for (const x of resp[0]) for (const part of String(x && x[0] || '').split(/[,;/]/)) seen.add(norm(part));
  if (resp && Array.isArray(resp[1])) for (const d of resp[1]) for (const t of d[1] || []) seen.add(norm(t));
  const cp = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
  return seen.has(w) || [...seen].some(s => cp(s, w) >= Math.max(4, Math.min(s.length, w.length) - 2)); // cùng gốc từ (commute ~ commuting)
}
