// So IPA với Britfone (Anh, MIT) / CMUdict (Mỹ, BSD-2) theo ÂM VỊ – dùng chung cho ipa-audit.mjs (cả kho) và cổng mở rộng (expand/job.mjs, promote.mjs).
// Bỏ qua độ dài (ː) và ký hiệu tương đương (ɛ/e, ɐ/ʌ, ɹ/r, g/ɡ); biến thể từ điển (đổi nguyên âm yếu, thêm/bớt ə, phụ âm thành âm tiết, hoà âm j) = khớp.
// Cổng mở rộng (checkEntry) kiểm THÊM trọng âm chính (cùng nguyên âm sau khi gióng hàng) và ranh giới tiền tố (un|interesting /ʌnˈɪn…/, không /əˈnɪn…/).
import fs from 'fs';
import os from 'os';
import { arpaToIpa, usSpellings, stressIndex, ukStyle, ukToUs } from './ipa.mjs';
import { parseCmu, pickPron, heteronym, ipaAgrees } from './expand/cmu.mjs';

// ---- âm vị
const V = 'aeiouɑɒɔəɜɪʊʌæ', UNITS = ['tʃ', 'dʒ', 'eɪ', 'aɪ', 'ɔɪ', 'əʊ', 'aʊ']; // ɪə eə ʊə = 2 âm vị (Britfone ghi /iə/ cuối từ là ɪə: area ˈɛəɹɪə)
const canon = s => String(s).toLowerCase().replace(/[/().‿ː\s-]/g, '').replace(/ɡ/g, 'g').replace(/ɹ/g, 'r').replace(/ɛ/g, 'e').replace(/ɐ/g, 'ʌ').replace(/ɚ/g, 'ər').replace(/ɝ/g, 'ɜr').replace(/oʊ/g, 'əʊ')
  .replace(/əw(?=[aeiouɑɒɔəɜɪʊʌæ])/g, 'u').replace(/([ʒʃdʒtʃ])əwl$/, '$1uəl'); // CMU ghi /uə/ thành ə + w (ˈvɪʒəwl, ˈflʌktʃəweɪt)
const yod = s => s.replace(/dj(?=[ˈˌ]?[uʊə])/g, 'dʒ').replace(/tj(?=[ˈˌ]?[uʊə])/g, 'tʃ').replace(/sj(?=[ˈˌ]?[uʊ])/g, 'ʃ').replace(/zj(?=[ˈˌ]?[uʊ])/g, 'ʒ');
export const isV = p => V.includes(p[0]);
// âm vị kèm cờ nhấn (s: ˈ hoặc ˌ, pr: chỉ ˈ): nguyên âm đầu tiên sau dấu; không có dấu nào + 1 nguyên âm → nhấn chính
export const P = str => { const c = yod(canon(str)), out = []; let pend = '';
  for (let i = 0; i < c.length;) { if (c[i] === 'ˈ' || c[i] === 'ˌ') { pend = c[i]; i++; continue; } const u = UNITS.find(x => c.startsWith(x, i)) || c[i]; const v = isV(u); out.push({ p: u, s: v && !!pend, pr: v && pend === 'ˈ' }); if (v) pend = ''; i += u.length; }
  if (!out.some(x => x.pr)) { const vs = out.filter(x => isV(x.p)); if (vs.length === 1) vs[0].s = vs[0].pr = true; }
  return out; };
const WEAKV = new Set(['ə', 'ɪ', 'i', 'ʊ', 'u']);
// khoảng cách: biến thể = 0, lệch thật = 1. Biến thể: nguyên âm yếu đổi nhau (ə ɪ i ʊ u), nguyên âm KHÔNG NHẤN ↔ ə (ədˈvæntɪdʒ ~ ædˈvæntɪdʒ), thêm/bớt ə.
// Trả kèm st = số lần lệch trọng âm chính trên đường gióng tốt nhất (nguyên âm nhấn chính bên này gióng với nguyên âm không nhấn chính bên kia / bị bỏ).
// loose (chỉ cổng mở rộng): thêm ɪ ~ e KHÔNG nhấn (Britfone ghi en-/em- là ɛn: entitle, encourage)
function align(a, b, loose) {
  const n = a.length, m = b.length, D = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  const sub = (x, y) => (x.p === y.p || (WEAKV.has(x.p) && WEAKV.has(y.p)) || (isV(x.p) && isV(y.p) && ((x.p === 'ə' && !y.s) || (y.p === 'ə' && !x.s))) || (loose && !x.s && !y.s && /^[ɪe]$/.test(x.p) && /^[ɪe]$/.test(y.p)) ? 0 : 1);
  const indel = x => (x.p === 'ə' ? 0 : 1);
  const best = (...c) => c.reduce((p, q) => (q[0] < p[0] || (q[0] === p[0] && q[1] < p[1]) ? q : p));
  D[0][0] = [0, 0];
  for (let i = 1; i <= n; i++) D[i][0] = [D[i - 1][0][0] + indel(a[i - 1]), D[i - 1][0][1] + (a[i - 1].pr ? 1 : 0)];
  for (let j = 1; j <= m; j++) D[0][j] = [D[0][j - 1][0] + indel(b[j - 1]), D[0][j - 1][1] + (b[j - 1].pr ? 1 : 0)];
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const x = a[i - 1], y = b[j - 1];
    D[i][j] = best([D[i - 1][j - 1][0] + sub(x, y), D[i - 1][j - 1][1] + (x.pr !== y.pr ? 1 : 0)], [D[i - 1][j][0] + indel(x), D[i - 1][j][1] + (x.pr ? 1 : 0)], [D[i][j - 1][0] + indel(y), D[i][j - 1][1] + (y.pr ? 1 : 0)]);
  }
  return { d: D[n][m][0], st: D[n][m][1] };
}
export const diff = (a, b) => align(a, b).d;
export const exact = (a, b) => P(a).map(x => x.p).join('') === P(b).map(x => x.p).join('');
export const near = (a, b) => diff(P(a), P(b)) === 0;
// trung tính giọng (so Anh ↔ Mỹ): bỏ r sau nguyên âm, gộp ɑ/ɒ/ɔ
export const neutral = s => P(s).map((x, i, a) => (x.p === 'r' && i > 0 && isV(a[i - 1].p) && !(a[i + 1] && isV(a[i + 1].p)) ? null : /^[ɑɒɔ]$/.test(x.p) ? { ...x, p: 'ɑ' } : x)).filter(Boolean);
export const nNear = (a, b) => diff(neutral(a), neutral(b)) === 0;
// khớp âm vị VÀ trọng âm chính rơi đúng nguyên âm (chỉ khi cả hai bên có ˈ hoặc là từ 1 nguyên âm)
const hasPr = x => x.some(y => y.pr);
const matchSt = (A, B) => { const r = align(A, B, true); return r.d === 0 && (!hasPr(A) || !hasPr(B) || r.st === 0); };
export const nearSt = (a, b) => matchSt(P(a), P(b));
// trung tính giọng cho Anh ↔ CMU khi Britfone không có từ: thêm BATH (æ ~ ɑ)
const neutralBath = s => neutral(s).map(x => (x.p === 'æ' ? { ...x, p: 'ɑ' } : x));
export const nNearSt = (a, b) => matchSt(neutralBath(a), neutralBath(b));
const nearL = (a, b) => align(P(a), P(b), true).d === 0;
export const cmuIpa = (arr, si) => (arr || []).map(p => '/' + arpaToIpa(p, si) + '/');
// Britfone → ký hiệu kho (Oxford): ɛ→e, ɐ→ʌ, ɹ→r, g→ɡ, ˈ/ˌ dời về đầu âm tiết (âm đầu dài nhất hợp lệ), từ 1 âm tiết không ˈ
const ONS = new Set(['pl', 'bl', 'kl', 'ɡl', 'fl', 'sl', 'pr', 'br', 'tr', 'dr', 'kr', 'ɡr', 'fr', 'θr', 'ʃr', 'tw', 'dw', 'kw', 'ɡw', 'sw', 'θw', 'pj', 'bj', 'kj', 'ɡj', 'mj', 'fj', 'vj', 'hj', 'nj', 'tj', 'dj', 'lj', 'sj', 'sp', 'st', 'sk', 'sm', 'sn', 'sf', 'spl', 'spr', 'str', 'skr', 'skw', 'spj', 'skj', 'stj']);
export function bfToOx(bf) {
  const tk = bf.trim().split(/\s+/).map(t => t.replace(/ɛ/g, 'e').replace(/ɐ/g, 'ʌ').replace(/ɹ/g, 'r').replace(/g/g, 'ɡ'));
  const nV = tk.filter(t => isV(t.replace(/^[ˈˌ]/, ''))).length, out = tk.map(t => t.replace(/^[ˈˌ]/, ''));
  let prevV = -1;
  tk.forEach((t, i) => {
    const bare = t.replace(/^[ˈˌ]/, ''); if (!isV(bare)) return;
    if (/^[ˈˌ]/.test(t) && nV > 1) { const cl = out.slice(prevV + 1, i); let k = prevV < 0 ? cl.length : 0; if (prevV >= 0) for (let n = Math.min(3, cl.length); n >= 1; n--) { const on = cl.slice(cl.length - n); if (n === 1 ? on[0] !== 'ŋ' : ONS.has(on.join(''))) { k = n; break; } } out[i - k] = t[0] + out[i - k]; }
    prevV = i;
  });
  return '/' + out.join('').replace(/([^aeiouɑɒɔəɜɪʊʌæː])əl$/, '$1l').replace(/([tdszʃʒ])ən$/, '$1n') + '/';
}
export const bathFix = (ours, bf) => { const o = ours.replace(/æ(?=(s|f|θ|n[tsdʃ]|mpl))/g, 'ɑː'); return o !== ours && bf.some(b => exact(o, '/' + b.replace(/\s+/g, '') + '/')) ? o : ''; };

// ---- ranh giới tiền tố: ˈ đặt theo âm đầu dài nhất (arpaToIpa, bfToOx) cắt nhầm phụ âm cuối tiền tố sang gốc từ:
// uninteresting /əˈnɪntrəstɪŋ/ → /ʌnˈɪntrəstɪŋ/ (Oxford), unable /ʌnˈeɪbl/, inaction /ɪnˈækʃn/, dishonest /dɪsˈɒnɪst/.
// Chỉ khi phần sau tiền tố là TỪ CÓ THẬT ≥ 4 chữ bắt đầu bằng nguyên âm (has(stem)) – inert, inept, initial, innate giữ nguyên.
const VC = '(?=[aeiouɑɒɔəɜɪʊʌæ])';
const PFX = [['un', /^(\/?ˌ?)(?:ʌ|ə)([ˈˌ])n/, '$1ʌn$2'], ['dis', /^(\/?ˌ?)dɪ([ˈˌ])s/, '$1dɪs$2'], ['mis', /^(\/?ˌ?)mɪ([ˈˌ])s/, '$1mɪs$2'],
  ['non', /^(\/?ˌ?)n(ɒ|ɑː)([ˈˌ])n/, '$1n$2n$3'], ['in', /^(\/?ˌ?)ɪ([ˈˌ])n/, '$1ɪn$2'], ['im', /^(\/?ˌ?)ɪ([ˈˌ])m/, '$1ɪm$2']];
export function prefixStress(ipa, word, has) {
  const w = String(word || '').toLowerCase(); if (!ipa || /\s/.test(w)) return ipa;
  for (const [p, re, to] of PFX) {
    const stem = w.slice(p.length);
    if (!w.startsWith(p) || stem.length < 4 || !/^([aeiou]|ho)/.test(stem) || !has(stem)) continue;
    const r = new RegExp(re.source + VC);
    if (r.test(ipa)) return ipa.replace(r, to);
  }
  return ipa;
}

// ---- nguồn: Britfone (từ → [âm vị cách nhau khoảng trắng]) + CMUdict (từ → [ARPAbet])
export const parseBritfone = text => { const m = new Map(); for (const l of text.split('\n')) { if (!l || l[0] === '#') continue; const i = l.indexOf(','); if (i < 0) continue; const w = l.slice(0, i).replace(/\(\d+\)$/, '').toLowerCase(); (m.get(w) || m.set(w, []).get(w)).push(l.slice(i + 1).trim()); } return m; };
export const look = (m, w) => { for (const v of usSpellings(w)) if (m.has(v)) return m.get(v); return null; };
export const BRITFONE_URL = 'https://raw.githubusercontent.com/JoseLlarena/Britfone/master/britfone.main.3.0.1.csv';
export const CMU_URL = 'https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict';
// Nạp nguồn: tệp cho sẵn (CI tải trước) → không có thì tải 1 lần về thư mục tạm (promote chạy tay)
export async function loadRefs({ britfone, cmu } = {}) {
  const get = async (f, url, enc) => { if (f) return fs.readFileSync(f, enc);
    const c = `${os.tmpdir()}/lexkite-ipa-refs/${url.split('/').pop()}`;
    if (!fs.existsSync(c)) { const r = await fetch(url); if (!r.ok) throw new Error(`tải ${url}: HTTP ${r.status}`); fs.mkdirSync(c.replace(/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(c, Buffer.from(await r.arrayBuffer())); }
    return fs.readFileSync(c, enc); };
  return { bf: parseBritfone(await get(britfone, BRITFONE_URL, 'utf8')), cmu: parseCmu(await get(cmu, CMU_URL, 'latin1')) };
}

// ---- cổng 1 mục mở rộng: { w, pos, ipa (Anh), ipaUS } → { ipa, ipaUS, fix: [..], bad: [..] }
// Âm vị: Anh ↔ Britfone (như ipa-audit), Mỹ ↔ CMUdict (không có → ukToUs(IPA Anh)). Trọng âm chính: lệch chỉ khi MỌI biến thể của CẢ HAI nguồn cùng nói khác
// (từ ghép: Britfone hay nhấn đầu, CMU nhấn sau – overcome, overall – nguồn trái nhau thì không phán). Lệch → sửa theo nguồn khi còn ĐÚNG MỘT phương án
// (Britfone phải khớp CMU trung tính giọng; phương án lọc theo từ loại – khớp từ loại do job.mjs ipaAgrees/ipaPos lo); không thì bad (gateEntry: "ipa: lệch Britfone/CMU …").
// Britfone không có từ: chỉ chặn lệch THÔ (≥ 2 âm vị sau khi trung tính giọng + bỏ j sau t d n s z l θ) với mọi biến thể CMU – khác Anh/Mỹ thật (parity, -ary) không phán.
const conflict = (a, b) => { const A = neutralBath(a), B = neutralBath(b); return hasPr(A) && hasPr(B) && align(A, B).st > 0; };
const yodDrop = x => x.filter((y, i, arr) => !(y.p === 'j' && i > 0 && /^[tdnszlθ]$/.test(arr[i - 1].p) && arr[i + 1] && /^[uʊə]/.test(arr[i + 1].p)));
const gross = (a, b) => diff(yodDrop(neutralBath(a)), yodDrop(neutralBath(b))) >= 2;
// Trọng âm phụ kiểu Oxford (như arpaToIpa): ˌ sát trước ˈ hoặc sau ˈ → bỏ (Britfone ghi ˌtræn sˈleɪt → trænsˈleɪt)
export function oxStress(ipa) {
  const s = String(ipa || ''), pr = s.indexOf('ˈ'); if (pr < 0) return s;
  const vBetween = (i, j) => (s.slice(i, j).match(/[aeiouɑɒɔəɜɪʊʌæ]+/g) || []).length;
  return [...s].map((c, i) => (c === 'ˌ' && (i > pr || vBetween(i, pr) <= 1) ? '' : c)).join('');
}
export function checkEntry(e, refs) {
  const w = String(e.w || '').toLowerCase(), out = { ipa: e.ipa, ipaUS: e.ipaUS, fix: [], bad: [] };
  if (!w || /[\s-]/.test(w) || /[A-Z].*[A-Z]/.test(e.w) || /\s/.test(String(e.ipa || '').replace(/^\/|\/$/g, ''))) return out; // cụm / gạch nối / viết tắt (FYI): nguồn không có hoặc ghi kiểu khác
  const has = s => refs.cmu.has(s) || refs.bf.has(s), vs = refs.cmu.get(w) || look(refs.cmu, w) || [], het = heteronym(vs), chosen = pickPron(vs, e.pos);
  // khi so: (r) cuối kiểu Oxford (ˈdɑːnsə(r)) = không r; un-: kho ghi ʌn (Oxford), CMU ghi ən – cùng âm vị
  const un = x => { const y = String(x).replace(/\(r\)/g, ''); return w.startsWith('un') ? y.replace(/^(\/?)ˌ?ʌ(?=n)/, '$1ə') : y; };
  const agree = c => !het || ipaAgrees(c, vs, chosen), uniq = a => [...new Set(a)];
  const set = (f, to, why) => { if (to && to !== out[f]) { out.fix.push(`${f === 'ipa' ? 'Anh' : 'Mỹ'} ${out[f] || '∅'} → ${to} (${why})`); out[f] = to; } };
  const bf = look(refs.bf, w), bfI = (bf || []).map(b => '/' + b.replace(/\s+/g, '') + '/');
  // CMU + bản giữ ə trước n/l cuối (arpaToIpa rút ˈmɑːrdʒən → ˈmɑːrdʒn; kho ghi ˈmɑːrdʒɪn = biến thể)
  const cmuAll = (si, only) => uniq([...cmuIpa(only || vs), ...cmuIpa(only || vs, si)].flatMap(c => [c, c.replace(/([tdszʃʒ])n\/$/, '$1ən/').replace(/([^aeiouɑɒɔəɜɪʊʌæː])l\/$/, '$1əl/')]));
  // từ ghép (over+come, week+end, up+load): trọng âm theo nghĩa/loại từ, nguồn ghi kiểu trích dẫn → không phán trọng âm
  const compound = [...Array(Math.max(0, w.length - 3)).keys()].some(i => i >= 1 && w.slice(0, i + 1).length >= 2 && has(w.slice(0, i + 1)) && has(w.slice(i + 1)) && w.slice(i + 1).length >= 3);
  const stressBad = ours => { if (compound) return false; const src = [...bfI, ...cmuAll(stressIndex(ours))]; return !!bf && vs.length > 0 && src.every(c => conflict(ours, c)); };
  // phương án sửa phải không trái trọng âm với ít nhất 1 biến thể của MỖI nguồn có từ, và chỉ cách bản cũ ≤ 1 âm vị (xa hơn = nguồn nghi sai → hàng duyệt)
  const optOk = (o, ours) => (compound || ((!vs.length || cmuAll(stressIndex(o)).some(c => !conflict(o, c))) && (!bf || bfI.some(b => !conflict(o, b))))) && (!ours || diff(P(String(ours).replace(/\(r\)/g, '')), P(o)) <= 1);
  // Anh
  if (out.ipa) {
    set('ipa', prefixStress(out.ipa, w, has), 'ranh giới tiền tố');
    if (bf && (!bfI.some(b => nearL(un(out.ipa), b)) || stressBad(out.ipa))) {
      const opts = uniq(bf.map(b => oxStress(ukStyle(prefixStress(bfToOx(b), w, has))))).filter(agree).filter(o => !vs.length || cmuIpa(vs).some(c => nNear(o, c))).filter(o => optOk(o, out.ipa));
      if (opts.length === 1) set('ipa', opts[0], 'Britfone'); else out.bad.push(`Anh ${out.ipa} ≠ Britfone ${bf.join(' | ')}${vs.length ? ' / CMU ' + cmuIpa(vs).join(' | ') : ''}`);
    } else if (!bf && vs.length && cmuIpa(vs).every(c => gross(out.ipa, c))) out.bad.push(`Anh ${out.ipa} ≠ CMU ${cmuIpa(vs).join(' | ')} (không có Britfone)`);
  }
  // Mỹ
  const si = out.ipa ? stressIndex(out.ipa) : undefined, fix = c => prefixStress(c, w, has);
  if (vs.length) {
    if (out.ipaUS) set('ipaUS', fix(out.ipaUS), 'ranh giới tiền tố');
    if (!out.ipaUS || !cmuAll(si).some(c => nearL(un(out.ipaUS), c) && (compound || !conflict(out.ipaUS, c))) || stressBad(out.ipaUS)) {
      const opts = uniq((het && chosen ? [chosen] : vs).map(p => fix('/' + arpaToIpa(p, si) + '/'))).filter(o => optOk(o, out.ipaUS));
      const close = opts.filter(o => out.ipaUS && nearL(un(out.ipaUS), o)), to = opts.length === 1 ? opts[0] : close.length === 1 ? close[0] : '';
      if (to) set('ipaUS', to, 'CMUdict'); else out.bad.push(`Mỹ ${out.ipaUS || '∅'} ≠ CMU ${cmuIpa(vs).join(' | ')}`);
    }
  } else if (out.ipa) {
    const ref = '/' + fix(ukToUs(out.ipa, w)).replace(/^\/|\/$/g, '') + '/';
    if (out.ipaUS) set('ipaUS', fix(out.ipaUS), 'ranh giới tiền tố');
    if (!out.ipaUS || !(nearL(out.ipaUS, ref) || nNear(out.ipaUS, out.ipa)) || conflict(out.ipaUS, out.ipa)) set('ipaUS', ref, 'ukToUs');
  }
  return out;
}
