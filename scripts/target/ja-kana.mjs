// Đặc thù CHỮ VIẾT tiếng Nhật (docs/specs/japanese-course.md §2) – hàm thuần, không phụ thuộc, MỘT nguồn cho cổng validate() (lib.mjs TL_RULES.ja),
// build, sinh lô W1 và (bản chép trình duyệt ở W1) chấm IME. Không nhánh theo tl ở nơi khác: lib.mjs chỉ gọi khi bảng có `kana: true`.
//   hira/kata      : đổi qua lại hiragana ↔ katakana (ー giữ nguyên)
//   romaji(kana)   : romaji TRUNG THÀNH với kana = đúng phím gõ IME (おう → ou, ー → lặp nguyên âm, ん trước nguyên âm/y → n'), là TRỢ GIÚP tắt dần (§2)
//   ipa(kana, o)   : IPA Tokyo rộng (quy ước §3): ɯ, ɕ tɕ dʑ ɲ ç ɸ, phụ âm vòm kʲ…, ɾ, ん đồng hoá (m n ɲ ŋ ɴ), っ = nhân đôi phụ âm, trường âm ː (おう/えい → oː/eː;
//                    o.verb: う cuối của động từ là âm riêng – 思う omoɯ, không phải trường âm). Không đánh dấu vô thanh hoá (W3 dạy riêng).
//   morae(kana)    : số mora (ゃゅょぁぃぅぇぉゎ nhập vào mora trước; っ ん ー là 1 mora) – cao độ `pitch` = vị trí hạ (0 = heiban … n = odaka)
//   pitchPattern   : mức L/H từng mora + mức trợ từ theo sau (Tokyo) – W3 vẽ đường cao độ
//   ruby(word,kana): furigana theo khối kanji (okurigana tách đúng: 食べる → 食[た]べる); null = kana không khớp chữ
//   fold(s)        : chuẩn hoá để CHẤM (§2 IME): katakana → hiragana, bỏ khoảng trắng/dấu câu, toàn ↔ bán độ rộng (NFKC)
const SHIFT = 0x60;
export const hira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - SHIFT));
export const kata = s => String(s || '').replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + SHIFT));
export const isKana = s => /^[ぁ-ゖァ-ヶー]+$/u.test(String(s || ''));
export const hasKanji = s => /[\p{Script=Han}々]/u.test(String(s || ''));

// kana gốc → [romaji, IPA]
const B = {};
const row = (ks, rs, is) => [...ks].forEach((k, i) => { B[k] = [rs[i], is[i]]; });
row('あいうえお', ['a', 'i', 'u', 'e', 'o'], ['a', 'i', 'ɯ', 'e', 'o']);
row('かきくけこ', ['ka', 'ki', 'ku', 'ke', 'ko'], ['ka', 'kʲi', 'kɯ', 'ke', 'ko']);
row('がぎぐげご', ['ga', 'gi', 'gu', 'ge', 'go'], ['ga', 'gʲi', 'gɯ', 'ge', 'go']);
row('さしすせそ', ['sa', 'shi', 'su', 'se', 'so'], ['sa', 'ɕi', 'sɯ', 'se', 'so']);
row('ざじずぜぞ', ['za', 'ji', 'zu', 'ze', 'zo'], ['za', 'dʑi', 'zɯ', 'ze', 'zo']);
row('たちつてと', ['ta', 'chi', 'tsu', 'te', 'to'], ['ta', 'tɕi', 'tsɯ', 'te', 'to']);
row('だぢづでど', ['da', 'ji', 'zu', 'de', 'do'], ['da', 'dʑi', 'zɯ', 'de', 'do']);
row('なにぬねの', ['na', 'ni', 'nu', 'ne', 'no'], ['na', 'ɲi', 'nɯ', 'ne', 'no']);
row('はひふへほ', ['ha', 'hi', 'fu', 'he', 'ho'], ['ha', 'çi', 'ɸɯ', 'he', 'ho']);
row('ばびぶべぼ', ['ba', 'bi', 'bu', 'be', 'bo'], ['ba', 'bʲi', 'bɯ', 'be', 'bo']);
row('ぱぴぷぺぽ', ['pa', 'pi', 'pu', 'pe', 'po'], ['pa', 'pʲi', 'pɯ', 'pe', 'po']);
row('まみむめも', ['ma', 'mi', 'mu', 'me', 'mo'], ['ma', 'mʲi', 'mɯ', 'me', 'mo']);
row('やゆよ', ['ya', 'yu', 'yo'], ['ja', 'jɯ', 'jo']);
row('らりるれろ', ['ra', 'ri', 'ru', 're', 'ro'], ['ɾa', 'ɾʲi', 'ɾɯ', 'ɾe', 'ɾo']);
row('わを', ['wa', 'o'], ['wa', 'o']);
B['ゔ'] = ['vu', 'bɯ'];
const SMALL_Y = { 'ゃ': ['a', 'a'], 'ゅ': ['u', 'ɯ'], 'ょ': ['o', 'o'] };
const SMALL_V = { 'ぁ': ['a', 'a'], 'ぃ': ['i', 'i'], 'ぅ': ['u', 'ɯ'], 'ぇ': ['e', 'e'], 'ぉ': ['o', 'o'], 'ゎ': ['a', 'a'] };
const V_R = /[aiueo]$/, V_I = /(ɯ|[aieo])$/;

/** kana → mảng mora {r, i} (romaji, IPA); ném lỗi nếu có ký tự ngoài kana. */
function units(kana) {
  const s = hira(kana), out = [];
  for (let x = 0; x < s.length; x++) {
    const c = s[x], n = s[x + 1];
    if (c === 'っ') { out.push({ q: 1 }); continue; }
    if (c === 'ん') { out.push({ nn: 1 }); continue; }
    if (c === 'ー') { out.push({ long: 1 }); continue; }
    const b = B[c]; if (!b) throw new Error('kana lạ: ' + c);
    let [r, i] = b;
    if (n && SMALL_Y[n] && c !== 'い') { // yōon: きゃ kya/kʲa, しゃ sha/ɕa, ちゃ cha/tɕa, じゃ ja/dʑa; ngoại lai デュ dyu/dʲɯ? → dju, フュ fyu/ɸjɯ
      const [vr, vi] = SMALL_Y[n];
      if (/i$/.test(r)) { r = /(sh|ch|j)i$/.test(r) ? r.slice(0, -1) + vr : r.slice(0, -1) + 'y' + vr; i = i.slice(0, -1) + vi; }
      else { r = r.replace(V_R, '') + 'y' + vr; i = i.replace(V_I, '') + 'j' + vi; }
      x++;
    } else if (n && SMALL_V[n]) { // ファ fa ɸa · ティ ti · ウィ wi · シェ she ɕe · ツァ tsa · ヴァ va ba
      const [vr, vi] = SMALL_V[n], cr = r.replace(V_R, ''), ci = i.replace(V_I, '').replace(/ʲ$/, '');
      r = (cr || (c === 'う' ? 'w' : 'y')) + vr; i = (ci || (c === 'う' ? 'w' : 'j')) + vi; x++;
    }
    out.push({ r, i });
  }
  return out;
}

export function morae(kana) { return [...hira(kana)].filter(c => !SMALL_Y[c] && !SMALL_V[c]).length; }

export function romaji(kana) {
  const u = units(kana); let s = '';
  u.forEach((m, k) => {
    const nx = u[k + 1];
    if (m.q) { const f = nx && nx.r ? nx.r : ''; s += f.startsWith('ch') ? 't' : f[0] || ''; }
    else if (m.nn) s += nx && nx.r && /^[aiueoy]/.test(nx.r) ? "n'" : 'n';
    else if (m.long) { const v = (s.match(/[aiueo](?=[^aiueo]*$)/) || [''])[0]; s += v; }
    else s += m.r;
  });
  return s;
}

export function ipa(kana, o = {}) {
  const u = units(kana); let s = '';
  u.forEach((m, k) => {
    const nx = u[k + 1], f = nx && nx.i ? nx.i : '';
    if (m.q) s += f && !/^[aiɯeo]/.test(f) ? (/^(tɕ|ts)/.test(f) ? 't' : /^dʑ/.test(f) ? 'd' : f[0]) : 'ʔ';
    else if (m.nn) s += /^[pbm]/.test(f) ? 'm' : /^(tɕ|dʑ|ɲ)/.test(f) ? 'ɲ' : /^(ts|[tdnɾ])/.test(f) ? 'n' : /^[kg]/.test(f) ? 'ŋ' : 'ɴ';
    else if (m.long) s += 'ː';
    else s += m.i;
  });
  // trường âm: hai nguyên âm giống nhau / おう / えい trong cùng từ → ː (う cuối của động từ giữ nguyên: 思う omoɯ, 言う iɯ)
  const keep = o.verb && /ɯ$/.test(s) && /[aieoɯ]ɯ$/.test(s) ? 'ɯ' : '';
  if (keep) s = s.slice(0, -1);
  s = s.replace(/aa/g, 'aː').replace(/ii/g, 'iː').replace(/ɯɯ/g, 'ɯː').replace(/ee|ei/g, 'eː').replace(/oo|oɯ/g, 'oː');
  return s + keep;
}

/** Mức cao độ Tokyo: [mức từng mora…, mức trợ từ theo sau]. p = 0 heiban (L H…H | H), 1 atamadaka (H L…L | L), n = mora cuối odaka (L H…H | L). */
export function pitchPattern(kana, p) {
  const n = morae(kana); if (!Number.isInteger(p) || p < 0 || p > n) return null;
  const lv = []; for (let k = 1; k <= n; k++) lv.push(p === 1 ? (k === 1 ? 'H' : 'L') : k === 1 ? 'L' : (p === 0 || k <= p) ? 'H' : 'L');
  return [...lv, p === 0 ? 'H' : 'L'];
}

/** Furigana theo khối: [[chữ, cách đọc | null]…]; khối kana của từ phải trùng kana đọc (hiragana hoá), khối kanji nhận phần còn lại. null = không khớp. */
export function ruby(word, kana) {
  const runs = String(word).match(/[\p{Script=Han}々]+|[^\p{Script=Han}々]+/gu) || [];
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('^' + runs.map(r => (hasKanji(r) ? '(.+?)' : '(' + esc(hira(r)) + ')')).join('') + '$', 'u');
  const m = re.exec(hira(kana)); if (!m) return null;
  return runs.map((r, k) => [r, hasKanji(r) ? m[k + 1] : null]);
}

/** Chuẩn hoá để chấm câu trả lời gõ bằng IME: NFKC (bán độ rộng ｶﾅ → カナ), katakana → hiragana, bỏ khoảng trắng và dấu câu. */
export const fold = s => hira(String(s || '').normalize('NFKC')).replace(/[\s\p{P}\p{S}]/gu, '');
/** So CÁCH ĐỌC bất kể cách viết trường âm (たいよう = たいよー = タイヨー; がっこう = ガッコー) – cùng luật tl_kana.py fold (CI): う sau hàng o/u, い sau hàng e/i, nguyên âm lặp → ー. */
export function longFold(s) {
  let out = '', pv = '';
  for (const c of fold(s)) {
    const r = B[c] ? B[c][0] : SMALL_Y[c] ? SMALL_Y[c][0] : SMALL_V[c] ? SMALL_V[c][0] : '', v = r.slice(-1);
    if ((c === 'う' && (pv === 'o' || pv === 'u')) || (c === 'い' && (pv === 'e' || pv === 'i')) || ('あいうえお'.includes(c) && v === pv)) { out += 'ー'; continue; }
    out += c; if (/[aiueo]/.test(v)) pv = v;
  }
  return out;
}
/** Kana kèm dấu hạ giọng kiểu sách giáo khoa/OJAD: はꜜし (1), はしꜜ (2 = odaka), はし (0 = heiban, không dấu). Dấu đặt SAU mora hạ (ゃゅょ đi cùng mora trước). */
export function accentKana(kana, p) {
  if (!Number.isInteger(p) || p < 0 || p > morae(kana)) throw new Error(`cao độ ${p} ngoài 0…${morae(kana)}: ${kana}`);
  if (p === 0) return kana;
  let m = 0, out = '';
  const cs = [...kana];
  cs.forEach((c, i) => { out += c; const small = n => n && (SMALL_Y[hira(n)] || SMALL_V[hira(n)]); if (!small(c) && !small(cs[i + 1])) { m++; if (m === p) out += 'ꜜ'; } else if (small(c)) { m++; if (m === p) out += 'ꜜ'; } });
  return out;
}
