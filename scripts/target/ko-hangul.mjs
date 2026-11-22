// Đặc thù CHỮ VIẾT + NGỮ PHÁP NỀN tiếng Hàn (docs/specs/korean-course.md §2) – hàm thuần, không phụ thuộc, MỘT nguồn cho cổng validate()
// (lib.mjs TL_RULES.ko, chỉ gọi khi bảng có `hangul: true`), build, sinh lô W1, bộ chia W2, phát âm W3 và (bản chép trình duyệt W1) chấm IME.
//   split/join     : âm tiết Hangul ↔ [đầu, vần, cuối] (jamo tương thích ㄱ ㅏ …); compose(jamo rời) ghép lại như bộ gõ 2 hàng (두벌식)
//   pron(w, o)     : phát âm CHUẨN (표준 발음법) dạng Hangul: nối âm (연음), 7 âm cuối đại diện + rút phụ âm kép, bật hơi (격음화), ㅎ câm,
//                    vòm hoá (구개음화), mũi hoá (비음화, cả ㄹ → ㄴ), lỏng hoá (유음화), căng hoá (경음화: sau âm tắc; o.verb: sau gốc ㄴ/ㅁ/ㄼ/ㄾ trước đuôi),
//                    ㅈㅉㅊ+ㅕ → ㅓ, phụ âm+ㅢ → ㅣ. o.x = ngoại lệ THEO TỪ (không đoán được từ chữ): { tense: [i…] } căng hoá âm đầu âm tiết i
//                    (사이시옷/Hán-Hàn 김밥 → 김빱, 발전 → 발쩐), { nIns: [i…] } chèn ㄴ (담요 → 담뇨), { nn: [i…] } ㄴ+ㄹ → ㄴㄴ (의견란), { noLiaison: [i…] }
//                    trung hoà âm cuối trước nguyên âm của hình vị THỰC (겉옷 → 거돋)
//   romaja(w, o)   : Romaja quốc ngữ 2000 (RR): theo phát âm cho đồng hoá phụ âm (nối âm, mũi/lỏng hoá, vòm hoá, bật hơi ở vị từ), KHÔNG ghi căng hoá,
//                    nguyên âm theo chữ (ㅢ = ui); danh từ: ㄱㄷㅂ + ㅎ giữ h (묵호 Mukho)
//   ipa(w, o)      : IPA Seoul rộng (quy ước §3): tắc thường k t p tɕ (giữa âm hữu thanh: ɡ d b dʑ), căng k͈ t͈ p͈ s͈ t͈ɕ, bật hơi kʰ tʰ pʰ tɕʰ, ㅅ/ㅆ trước i/j = ɕ/ɕ͈,
//                    ㄹ đầu = ɾ, cuối/kép = l, âm cuối không bật k̚ t̚ p̚; nguyên âm a ɛ ʌ e o u ɯ i, ㅚ = we, ㅟ = ɥi, ㅢ = ɰi
//   josa(n, k)     : tiểu từ theo âm cuối – topic 은/는, subj 이/가, obj 을/를, and 과/와, dir 으로/로 (ㄹ cuối → 로), voc 아/야, cop 이에요/예요
//   sino/native    : số Hán-Hàn (일 이 삼 … 만 억) và thuần Hàn 1–99 (하나 … 아흔아홉); count(n, từ đếm) chọn hệ số + dạng rút (한 두 세 네 스무), tháng 유월/시월
//   conj(w, cls)   : chia gốc – inf (아/어), haeyo (해요체), past (했어요), hamnida (합쇼체 hiện tại) cho lớp CONJ (quy tắc + bất quy tắc ㅂ ㄷ ㅅ ㅎ 르 러 으 ㄹ 우 하)
//   fold/same      : chuẩn hoá để CHẤM (§2 IME): NFC (bàn phím macOS/iOS có thể ra jamo rời NFD), jamo tương thích ghép lại, bỏ dấu câu;
//                    same(gõ, đáp) → 'ok' | 'spacing' (chỉ sai cách chữ 띄어쓰기 – nhận, kèm nhắc) | '' (sai)
const L = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const V = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'];
const T = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
const BASE = 0xac00, isSyl = c => { const n = c.codePointAt(0); return n >= BASE && n <= 0xd7a3; };
export const isHangul = s => /^[가-힣]+$/u.test(String(s || ''));
/** âm tiết → {l, v, t} (jamo tương thích); không phải âm tiết → null */
export function split(c) {
  if (!c || !isSyl(c)) return null;
  const n = c.codePointAt(0) - BASE;
  return { l: L[Math.floor(n / 588)], v: V[Math.floor((n % 588) / 28)], t: T[n % 28] };
}
export function join({ l, v, t = '' }) {
  const a = L.indexOf(l), b = V.indexOf(v), c = T.indexOf(t);
  if (a < 0 || b < 0 || c < 0) throw new Error(`jamo không ghép được: ${l}${v}${t}`);
  return String.fromCodePoint(BASE + (a * 21 + b) * 28 + c);
}
const syls = w => { const s = [...String(w || '').normalize('NFC')]; if (!s.length || !s.every(isSyl)) throw new Error('không phải chữ Hangul trọn âm tiết: ' + w); return s.map(split); };
const toStr = a => a.map(join).join('');

// ---- bộ gõ 2 hàng: jamo tương thích rời → âm tiết (ㅅㅏㄱㅗㅏ → 사과); nguyên âm/phụ âm kép ghép như IME ----
const VV = { 'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ' };
const TT = { 'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ', 'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ' };
const TT_SPLIT = Object.fromEntries(Object.entries(TT).map(([k, v]) => [v, [...k]]));
const isC = j => L.includes(j) || T.includes(j) && j !== '', isV = j => V.includes(j);
export function compose(s) {
  const out = []; let cur = null; // cur = {l, v, t} âm tiết đang gõ
  const flush = () => { if (cur) out.push(cur.v ? join(cur) : cur.l); cur = null; };
  for (const j of [...String(s || '')]) {
    if (isV(j)) {
      if (cur && cur.v && !cur.t && VV[cur.v + j]) cur.v = VV[cur.v + j];
      else if (cur && !cur.v) cur.v = j;
      else if (cur && cur.t) { // âm cuối nhảy sang âm tiết mới như IME (각 + ㅏ → 가가, 닭 + ㅣ → 달기)
        const tt = TT_SPLIT[cur.t], mv = tt ? tt[1] : cur.t; cur.t = tt ? tt[0] : '';
        if (L.includes(mv)) { flush(); cur = { l: mv, v: j, t: '' }; } else { cur.t = cur.t || mv; flush(); out.push(j); }
      } else { flush(); out.push(j); }
    } else if (isC(j)) {
      if (cur && cur.v && !cur.t && T.includes(j)) cur.t = j;
      else if (cur && cur.t && TT[cur.t + j]) cur.t = TT[cur.t + j];
      else { flush(); if (L.includes(j)) cur = { l: j, v: '', t: '' }; else out.push(j); }
    } else { flush(); out.push(j); }
  }
  flush(); return out.join('');
}

// ---- phát âm chuẩn ----
const NEUT = { 'ㄱ': 'ㄱ', 'ㄲ': 'ㄱ', 'ㅋ': 'ㄱ', 'ㄳ': 'ㄱ', 'ㄺ': 'ㄱ', 'ㄴ': 'ㄴ', 'ㄵ': 'ㄴ', 'ㄶ': 'ㄴ', 'ㄷ': 'ㄷ', 'ㅅ': 'ㄷ', 'ㅆ': 'ㄷ', 'ㅈ': 'ㄷ', 'ㅊ': 'ㄷ', 'ㅌ': 'ㄷ', 'ㅎ': 'ㄷ',
  'ㄹ': 'ㄹ', 'ㄼ': 'ㄹ', 'ㄽ': 'ㄹ', 'ㄾ': 'ㄹ', 'ㅀ': 'ㄹ', 'ㅁ': 'ㅁ', 'ㄻ': 'ㅁ', 'ㅂ': 'ㅂ', 'ㅍ': 'ㅂ', 'ㅄ': 'ㅂ', 'ㄿ': 'ㅂ', 'ㅇ': 'ㅇ', '': '' };
const TENSE = { 'ㄱ': 'ㄲ', 'ㄷ': 'ㄸ', 'ㅂ': 'ㅃ', 'ㅅ': 'ㅆ', 'ㅈ': 'ㅉ' };
const ASP = { 'ㄱ': 'ㅋ', 'ㄷ': 'ㅌ', 'ㅂ': 'ㅍ', 'ㅈ': 'ㅊ' };
const NASAL = { 'ㄱ': 'ㅇ', 'ㄷ': 'ㄴ', 'ㅂ': 'ㅁ' };
const Y_V = new Set(['ㅣ', 'ㅑ', 'ㅕ', 'ㅛ', 'ㅠ', 'ㅒ', 'ㅖ']);
const has = (o, k, i) => !!(o && o.x && Array.isArray(o.x[k]) && o.x[k].includes(i));
/** → mảng âm tiết đã áp luật. o.verb: vị từ dạng từ điển (…다); o.rr: chế độ Romaja (không căng hoá, nguyên âm theo chữ, danh từ giữ ㄱㄷㅂ+ㅎ). */
function run(w, o = {}) {
  const s = syls(w).map(x => ({ ...x })), orig = s.map(x => x.t), n = s.length;
  const stemEnd = o.verb && n >= 2 && s[n - 1].l === 'ㄷ' && s[n - 1].v === 'ㅏ' && !s[n - 1].t ? n - 2 : -1; // ranh giới gốc | đuôi 다
  for (let i = 0; i < n - 1; i++) {
    const a = s[i], b = s[i + 1]; let c = a.t;
    if (has(o, 'nIns', i + 1) && b.l === 'ㅇ' && Y_V.has(b.v)) b.l = 'ㄴ'; // ㄴ 첨가 (담요 → 담뇨) – trước nối âm
    if (b.l === 'ㅇ' && c) {
      if (c === 'ㅇ') continue;
      if (has(o, 'noLiaison', i + 1)) { const m = NEUT[c]; a.t = ''; b.l = m; continue; } // hình vị thực: trung hoà rồi mới nối (겉옷 → 거돋)
      if (c === 'ㅎ') { a.t = ''; continue; } // ㅎ câm (좋아 → 조아)
      if (c === 'ㄶ' || c === 'ㅀ') { a.t = ''; b.l = c === 'ㄶ' ? 'ㄴ' : 'ㄹ'; continue; } // 많아 → 마나, 싫어 → 시러
      const tt = TT_SPLIT[c]; let mv;
      if (tt) { a.t = tt[0]; mv = tt[1]; } else { a.t = ''; mv = c; } // phụ âm kép: âm thứ nhất ở lại, âm thứ hai chuyển (닭이 → 달기)
      if ((mv === 'ㄷ' || mv === 'ㅌ') && b.v === 'ㅣ') mv = mv === 'ㄷ' ? 'ㅈ' : 'ㅊ'; // vòm hoá (굳이 → 구지, 같이 → 가치)
      b.l = mv;
      if (!o.rr && 'ㄱㅂ'.includes(a.t || '-') && TENSE[mv]) b.l = TENSE[mv]; // 값이 → 갑씨, 넋이 → 넉씨
      continue;
    }
    if (b.l === 'ㅎ' && c && c !== 'ㄶ' && c !== 'ㅀ') { // bật hơi: ㄱㄷㅂㅈ (sau trung hoà) + ㅎ
      const tt = TT_SPLIT[c], keep = tt ? tt[0] : '', nt = NEUT[tt ? tt[1] : c];
      if (ASP[nt]) { if (o.rr && !o.verb) a.t = NEUT[c]; else { a.t = keep; b.l = ASP[nt]; } continue; } // RR danh từ giữ k + h (묵호 Mukho)
    }
    if (c === 'ㅎ' || c === 'ㄶ' || c === 'ㅀ') { // ㅎ cuối + ㄱㄷㅈ → bật hơi; + ㅅ → ㅆ; + ㄴ → ㄴ
      const keep = c === 'ㅎ' ? '' : c === 'ㄶ' ? 'ㄴ' : 'ㄹ';
      if (ASP[b.l]) { a.t = keep; b.l = ASP[b.l]; continue; } // 좋다 → 조타, 많고 → 만코, 싫다 → 실타
      if (b.l === 'ㅅ') { a.t = keep; if (!o.rr) b.l = 'ㅆ'; continue; } // 좋소 → 조쏘
      if (b.l === 'ㄴ') { a.t = keep || 'ㄴ'; c = a.t; } // 놓는 → 논는, 않네 → 안네, 싫네 → 실레 (tiếp lỏng hoá)
    }
    // rút phụ âm kép + 7 âm cuối đại diện
    if (c === 'ㄺ' && i === stemEnd && b.l === 'ㄱ') a.t = 'ㄹ'; // gốc vị từ ㄺ + ㄱ → ㄹ (맑게 → 말께)
    else if (c === 'ㄼ' && has(o, 'lbP', i)) a.t = 'ㅂ'; // 밟다 → 밥따 (ngoại lệ theo từ)
    else a.t = NEUT[c];
    // mũi hoá: ㄹ sau ㅁ ㅇ ㄱ ㅂ → ㄴ; âm tắc trước ㄴ ㅁ → âm mũi (국물 → 궁물, 종로 → 종노, 협력 → 혐녁)
    if (b.l === 'ㄹ' && a.t && 'ㅁㅇㄱㅂ'.includes(a.t)) b.l = 'ㄴ';
    if (b.l === 'ㄹ' && a.t === 'ㄴ') { if (has(o, 'nn', i + 1)) b.l = 'ㄴ'; else a.t = 'ㄹ'; } // lỏng hoá 신라 → 실라 · ngoại lệ 의견란 → 의견난
    else if (b.l === 'ㄴ' && a.t === 'ㄹ') b.l = 'ㄹ'; // 설날 → 설랄
    if ((b.l === 'ㄴ' || b.l === 'ㅁ') && NASAL[a.t]) a.t = NASAL[a.t];
    // căng hoá: sau âm tắc ㄱㄷㅂ; gốc vị từ ㄴ ㅁ ㄵ ㄻ ㄼ ㄾ trước đuôi 다 (신다 → 신따, 앉다 → 안따, 넓다 → 널따); ngoại lệ theo từ (o.x.tense)
    if (!o.rr && TENSE[b.l]) {
      const stem = i === stemEnd && /[ㄴㅁㄵㄻㄼㄾ]/.test(orig[i] || '-');
      if ((a.t && 'ㄱㄷㅂ'.includes(a.t)) || stem || has(o, 'tense', i + 1)) b.l = TENSE[b.l];
    }
  }
  s[n - 1].t = NEUT[s[n - 1].t];
  // nguyên âm (chỉ phát âm; RR theo chữ): ㅈㅉㅊ + ㅕ → ㅓ (가져 → 가저); phụ âm + ㅢ → ㅣ (희망 → 히망)
  if (!o.rr) for (const x of s) { if ('ㅈㅉㅊ'.includes(x.l) && x.v === 'ㅕ') x.v = 'ㅓ'; if (x.l !== 'ㅇ' && x.v === 'ㅢ') x.v = 'ㅣ'; }
  return s;
}
export const pron = (w, o = {}) => toStr(run(w, o));

// ---- Romaja quốc ngữ (RR 2000) ----
const RR_L = { 'ㄱ': 'g', 'ㄲ': 'kk', 'ㄴ': 'n', 'ㄷ': 'd', 'ㄸ': 'tt', 'ㄹ': 'r', 'ㅁ': 'm', 'ㅂ': 'b', 'ㅃ': 'pp', 'ㅅ': 's', 'ㅆ': 'ss', 'ㅇ': '', 'ㅈ': 'j', 'ㅉ': 'jj', 'ㅊ': 'ch', 'ㅋ': 'k', 'ㅌ': 't', 'ㅍ': 'p', 'ㅎ': 'h' };
const RR_V = { 'ㅏ': 'a', 'ㅐ': 'ae', 'ㅑ': 'ya', 'ㅒ': 'yae', 'ㅓ': 'eo', 'ㅔ': 'e', 'ㅕ': 'yeo', 'ㅖ': 'ye', 'ㅗ': 'o', 'ㅘ': 'wa', 'ㅙ': 'wae', 'ㅚ': 'oe', 'ㅛ': 'yo', 'ㅜ': 'u', 'ㅝ': 'wo', 'ㅞ': 'we', 'ㅟ': 'wi', 'ㅠ': 'yu', 'ㅡ': 'eu', 'ㅢ': 'ui', 'ㅣ': 'i' };
const RR_T = { '': '', 'ㄱ': 'k', 'ㄴ': 'n', 'ㄷ': 't', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅂ': 'p', 'ㅇ': 'ng' };
export function romaja(w, o = {}) {
  const s = run(w, { ...o, rr: true });
  let r = '';
  s.forEach((x, i) => {
    const prevL = i > 0 && s[i - 1].t === 'ㄹ';
    r += (x.l === 'ㄹ' && prevL ? 'l' : RR_L[x.l]) + RR_V[x.v] + RR_T[x.t];
  });
  return r;
}

// ---- IPA Seoul rộng ----
const IPA_V = { 'ㅏ': 'a', 'ㅐ': 'ɛ', 'ㅑ': 'ja', 'ㅒ': 'jɛ', 'ㅓ': 'ʌ', 'ㅔ': 'e', 'ㅕ': 'jʌ', 'ㅖ': 'je', 'ㅗ': 'o', 'ㅘ': 'wa', 'ㅙ': 'wɛ', 'ㅚ': 'we', 'ㅛ': 'jo', 'ㅜ': 'u', 'ㅝ': 'wʌ', 'ㅞ': 'we', 'ㅟ': 'ɥi', 'ㅠ': 'ju', 'ㅡ': 'ɯ', 'ㅢ': 'ɰi', 'ㅣ': 'i' };
const IPA_L = { 'ㄱ': ['k', 'ɡ'], 'ㄷ': ['t', 'd'], 'ㅂ': ['p', 'b'], 'ㅈ': ['tɕ', 'dʑ'], 'ㄲ': 'k͈', 'ㄸ': 't͈', 'ㅃ': 'p͈', 'ㅉ': 't͈ɕ', 'ㅋ': 'kʰ', 'ㅌ': 'tʰ', 'ㅍ': 'pʰ', 'ㅊ': 'tɕʰ', 'ㅎ': 'h', 'ㄴ': 'n', 'ㅁ': 'm', 'ㅇ': '' };
const IPA_T = { '': '', 'ㄱ': 'k̚', 'ㄷ': 't̚', 'ㅂ': 'p̚', 'ㄴ': 'n', 'ㄹ': 'l', 'ㅁ': 'm', 'ㅇ': 'ŋ' };
export function ipa(w, o = {}) {
  const s = run(w, o);
  let r = '';
  s.forEach((x, i) => {
    const pal = Y_V.has(x.v) || x.v === 'ㅟ';
    let c;
    if (x.l === 'ㅅ') c = pal ? 'ɕ' : 's';
    else if (x.l === 'ㅆ') c = pal ? 'ɕ͈' : 's͈';
    else if (x.l === 'ㄹ') c = i > 0 && s[i - 1].t === 'ㄹ' ? 'l' : 'ɾ';
    else { const m = IPA_L[x.l]; c = Array.isArray(m) ? m[i > 0 ? 1 : 0] : m; }
    r += c + IPA_V[x.v] + IPA_T[x.t];
  });
  return r.normalize('NFC');
}

// ---- tiểu từ theo âm cuối ----
const lastT = n => { const c = [...String(n || '').normalize('NFC')].pop(); const x = c && split(c); if (!x) throw new Error('josa cần danh từ Hangul: ' + n); return x.t; };
const JOSA = { topic: ['은', '는'], subj: ['이', '가'], obj: ['을', '를'], and: ['과', '와'], dir: ['으로', '로'], voc: ['아', '야'], cop: ['이에요', '예요'] };
/** danh từ + tiểu từ đúng dạng (사과 → 사과는, 책 → 책은; dir: 서울 → 서울로, 집 → 집으로). */
export function josa(n, k) {
  const p = JOSA[k]; if (!p) throw new Error('loại tiểu từ lạ: ' + k);
  const t = lastT(n); return n + (k === 'dir' ? (t && t !== 'ㄹ' ? p[0] : p[1]) : t ? p[0] : p[1]);
}

// ---- số ----
const SINO = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'];
/** số Hán-Hàn: 0 → 영 (đọc số điện thoại: 공 ở W3), 10 → 십 (không 일십), 10000 → 만 (không 일만), 16 → 십육 (phát âm [심뉵] – ㄴ 첨가). */
export function sino(n) {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new Error('sino: số nguyên 0 … < 1 nghìn tỉ');
  if (n === 0) return '영';
  const four = x => { let r = ''; [[1000, '천'], [100, '백'], [10, '십'], [1, '']].forEach(([u, w]) => { const d = Math.floor(x / u) % 10; if (d) r += (d === 1 && u > 1 ? '' : SINO[d]) + w; }); return r; };
  let r = ''; const eok = Math.floor(n / 1e8), man = Math.floor(n / 1e4) % 1e4, rest = n % 1e4;
  if (eok) r += four(eok) + '억';
  if (man) r += (man === 1 && !eok ? '' : four(man)) + '만';
  return r + four(rest);
}
const NAT1 = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'], NAT10 = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
const ATTR = { '하나': '한', '둘': '두', '셋': '세', '넷': '네', '스물': '스무' };
/** số thuần Hàn 1–99; o.attr = dạng đứng trước từ đếm (한 개, 두 명, 스무 살 – 스물한 살 giữ 스물). */
export function native(n, o = {}) {
  if (!Number.isInteger(n) || n < 1 || n > 99) throw new Error('native: 1 … 99 (lớn hơn dùng số Hán-Hàn)');
  const t = NAT10[Math.floor(n / 10)], u = NAT1[n % 10];
  if (!o.attr) return t + u;
  return u ? t + (ATTR[u] || u) : (ATTR[t] || t);
}
// từ đếm: hệ số (n = thuần Hàn, s = Hán-Hàn). Giờ = thuần Hàn (세 시), phút = Hán-Hàn (삼십 분); tháng: 6월 유월, 10월 시월
export const COUNTERS = { '개': 'n', '명': 'n', '분(người, kính)': 'n', '살': 'n', '마리': 'n', '시': 'n', '시간': 'n', '병': 'n', '잔': 'n', '권': 'n', '장': 'n', '대': 'n', '번(lần)': 'n', '달': 'n',
  '분': 's', '초': 's', '원': 's', '년': 's', '월': 's', '일': 's', '층': 's', '번(số)': 's', '인분': 's', '주': 's', '세': 's', '학년': 's', '호': 's', '개월': 's' };
export function count(n, c) {
  const sys = COUNTERS[c]; if (!sys) throw new Error('từ đếm chưa có trong bảng: ' + c);
  const w = c.replace(/\(.*\)$/, '');
  if (w === '월') return (n === 6 ? '유' : n === 10 ? '시' : sino(n)) + '월';
  return (sys === 'n' && n <= 99 ? native(n, { attr: true }) + ' ' : sino(n) + ' ') + w;
}

// ---- chia vị từ (W0: nền cho cổng + W2) ----
export const CONJ = ['reg', '하', 'ㅂ', 'ㄷ', 'ㅅ', 'ㅎ', '르', '러', '으', 'ㄹ', '우', '이'];
const stemOf = w => { const s = String(w || '').normalize('NFC'); if (!/다$/.test(s) || s.length < 2) throw new Error('vị từ phải ở dạng từ điển …다: ' + w); return s.slice(0, -1); };
/** lớp chia khớp HÌNH THỨC gốc (điều kiện cần; bất quy tắc là theo từ – 입다 reg, 돕다 ㅂ – kiểm chéo Wiktionary ở W2) */
export function conjShape(w, cls) {
  let st; try { st = stemOf(w); } catch { return false; }
  const x = split([...st].pop()); if (!x) return false;
  return ({ reg: true, '하': /하$/.test(st), 'ㅂ': x.t === 'ㅂ', 'ㄷ': x.t === 'ㄷ', 'ㅅ': x.t === 'ㅅ', 'ㅎ': x.t === 'ㅎ' && st !== '좋', '르': /.르$/.test(st), '러': /르$/.test(st), '으': x.v === 'ㅡ' && !x.t && !/르$/.test(st), 'ㄹ': x.t === 'ㄹ', '우': st === '푸', '이': st === '이' || st === '아니' })[cls] === true;
}
const BRIGHT = new Set(['ㅏ', 'ㅗ', 'ㅑ']); // ㅏ ㅗ (và ㅑ: 얇아) → 아; còn lại → 어
const CONTR = { 'ㅏ': 'ㅏ', 'ㅓ': 'ㅓ', 'ㅕ': 'ㅕ', 'ㅐ': 'ㅐ', 'ㅔ': 'ㅔ', 'ㅗ': 'ㅘ', 'ㅜ': 'ㅝ', 'ㅣ': 'ㅕ', 'ㅚ': 'ㅙ' };
const add = (st, v) => st + join({ l: 'ㅇ', v });
/** dạng 아/어 (연결형) – gốc của 해요/과khứ */
function inf(w, cls) {
  const st = stemOf(w), a = [...st], last = split(a[a.length - 1]), head = a.slice(0, -1).join('');
  const prevV = a.length > 1 ? split(a[a.length - 2]).v : null;
  switch (cls) {
    case '하': return head + '해';
    case '이': return st === '아니' ? '아니어' : '이어';
    case 'ㅂ': { const b = head + join({ ...last, t: '' }); return /^(돕|곱)$/.test(st) ? b + '와' : b + '워'; }
    case 'ㄷ': return reg(head + join({ ...last, t: 'ㄹ' }));
    case 'ㅅ': { const b = head + join({ ...last, t: '' }); return add(b, BRIGHT.has(last.v) ? 'ㅏ' : 'ㅓ'); }
    case 'ㅎ': { const nv = last.v === 'ㅑ' ? 'ㅒ' : last.v === 'ㅕ' ? 'ㅖ' : 'ㅐ'; return head + join({ l: last.l, v: nv, t: '' }); }
    case '르': { const p = split(a[a.length - 2]); const b = a.slice(0, -2).join('') + join({ ...p, t: 'ㄹ' }); return b + (BRIGHT.has(p.v) ? '라' : '러'); }
    case '러': return st + '러';
    case '으': { const v = a.length > 1 && BRIGHT.has(prevV) ? 'ㅏ' : 'ㅓ'; return head + join({ l: last.l, v, t: '' }); }
    case '우': return '퍼';
    default: return reg(st);
  }
}
function reg(st) {
  const a = [...st], x = split(a[a.length - 1]), head = a.slice(0, -1).join('');
  const v = BRIGHT.has(x.v) ? 'ㅏ' : 'ㅓ';
  if (x.t) return add(st, v);
  if (CONTR[x.v]) return head + join({ l: x.l, v: CONTR[x.v], t: '' }) + (x.v === 'ㅣ' && x.l === 'ㅇ' ? '' : '');
  return add(st, v); // ㅟ ㅢ … không rút (쉬어)
}
export function conj(w, cls, form) {
  if (!CONJ.includes(cls)) throw new Error('lớp chia lạ: ' + cls);
  const st = stemOf(w);
  if (form === 'hamnida') {
    if (cls === '이') return st === '아니' ? '아닙니다' : '입니다';
    const a = [...st], x = split(a.pop()), head = a.join('');
    if (cls === 'ㄹ') return head + join({ ...x, t: 'ㅂ' }) + '니다'; // 알다 → 압니다
    return x.t ? st + '습니다' : head + join({ ...x, t: 'ㅂ' }) + '니다';
  }
  if (cls === '이' && form === 'haeyo') return st === '아니' ? '아니에요' : '이에요';
  const i = inf(w, cls);
  if (form === 'inf') return i;
  if (form === 'haeyo') return i + '요';
  if (form === 'past') { const a = [...i], x = split(a.pop()); return a.join('') + join({ ...x, t: 'ㅆ' }) + '어요'; }
  throw new Error('dạng lạ: ' + form);
}

// ---- chấm IME ----
/** chuẩn hoá để chấm: NFC + ghép jamo rời + bỏ dấu câu/khoảng trắng thừa (giữ khoảng trắng đơn để biết sai cách chữ) */
export function fold(s) {
  const c = compose(String(s || '').normalize('NFC')).normalize('NFC');
  return c.replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}
export function same(typed, answer) {
  const a = fold(typed), b = fold(answer);
  if (!a || !b) return '';
  if (a === b) return 'ok';
  return a.replace(/\s/g, '') === b.replace(/\s/g, '') ? 'spacing' : '';
}
