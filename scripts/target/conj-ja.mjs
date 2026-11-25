// Bộ chia động từ tiếng Nhật (japanese-course.md §2 "Chia động từ", W2) – quy tắc TỰ VIẾT theo nhóm (ichidan / godan / bất quy tắc する・来る) + bảng ngoại lệ nhỏ,
// không chép dữ liệu Wiktionary. Kiểm chéo từng dạng với Wiktionary trên CI: scripts/target/conj-ja-check.mjs (khớp 100 %, ngoại lệ ghi tay có lý do).
// Chia SONG SONG chữ viết (食べる → 食べます) và kana (たべる → たべます): đuôi luôn là kana, chỉ 来る đổi cách đọc gốc (来ない こない / 来ます きます).
// Không phụ thuộc node → dùng được trong web (drill, chấm câu trả lời qua ja-kana fold).
// API: conjugate({ word, kana, vclass }) → { masu: {w, k}, … } cho mọi khóa FORMS;  form(v, 'te') → { w, k }
export const FORMS = ['masu', 'masen', 'mashita', 'masendeshita', 'mashou', 'nai', 'nakatta', 'te', 'ta', 'tara', 'ba', 'vol', 'pot', 'pass', 'caus', 'causPass', 'imp', 'prohib', 'zu', 'stem'];
// hàng u → [a, i, e, o] (う → わ ở thể phủ định)
const ROW = { う: 'わいえお', く: 'かきけこ', ぐ: 'がぎげご', す: 'さしせそ', つ: 'たちてと', ぬ: 'なにねの', ぶ: 'ばびべぼ', む: 'まみめも', る: 'らりれろ' };
const TE = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
// ngoại lệ godan (theo kana từ điển): 行く te/ta = って/った; ある phủ định = ない; kính ngữ -ゃる/-さる: ます-stem い, mệnh lệnh い
const GODAN_X = {
  いく: { te: 'いって', ta: 'いった' }, ある: { nai: 'ない' }, とう: { te: 'とうて', ta: 'とうた' },
  いらっしゃる: { i: 'い', imp: 'い' }, おっしゃる: { i: 'い', imp: 'い' }, くださる: { i: 'い', imp: 'い' }, なさる: { i: 'い', imp: 'い' }, ござる: { i: 'い' },
};

function stems(kana, cls) {
  // trả { a, i, e, o, te, ta, dict } – phần đuôi đổi được (kana) tính từ chữ cuối
  if (cls === 'ichidan') { const s = kana.slice(0, -1); return { ichi: true, s, dict: kana }; }
  const last = kana.slice(-1), r = ROW[last]; if (!r) throw new Error('động từ godan phải tận cùng bằng hàng u: ' + kana);
  const b = kana.slice(0, -1), x = GODAN_X[kana] || {};
  return { b, a: b + r[0], i: b + (x.i || r[1]), e: b + r[2], o: b + r[3], te: x.te || b + TE[last], ta: x.ta || b + TE[last].replace(/て$/, 'た').replace(/で$/, 'だ'), nai: x.nai, imp: x.imp && b + x.imp, dict: kana };
}
function kanaForms(kana, cls) {
  if (cls === 'irregular') {
    const pre = kana.replace(/(する|くる)$/, ''), suru = /する$/.test(kana);
    const t = suru
      ? { masu: 'し', nai: 'しな', te: 'して', ta: 'した', ba: 'すれば', vol: 'しよう', pot: 'できる', pass: 'される', caus: 'させる', causPass: 'させられる', imp: 'しろ', zu: 'せず', stem: 'し' }
      : { masu: 'き', nai: 'こな', te: 'きて', ta: 'きた', ba: 'くれば', vol: 'こよう', pot: 'こられる', pass: 'こられる', caus: 'こさせる', causPass: 'こさせられる', imp: 'こい', zu: 'こず', stem: 'き' };
    const P = s => pre + s;
    return mk(P(t.masu), P(t.nai + 'い'), P(t.te), P(t.ta), P(t.ba), P(t.vol), P(t.pot), P(t.pass), P(t.caus), P(t.causPass), P(t.imp), kana + 'な', P(t.zu), P(t.stem));
  }
  const s = stems(kana, cls);
  if (s.ichi) return mk(s.s, s.s + 'ない', s.s + 'て', s.s + 'た', s.s + 'れば', s.s + 'よう', s.s + 'られる', s.s + 'られる', s.s + 'させる', s.s + 'させられる', kana === 'くれる' ? 'くれ' : s.s + 'ろ', kana + 'な', s.s + 'ず', s.s);
  return mk(s.i, s.nai || s.a + 'ない', s.te, s.ta, s.e + 'ば', s.o + 'う', s.e + 'る', s.a + 'れる', s.a + 'せる', s.a + 'せられる', s.imp || s.e, kana + 'な', s.a + 'ず', s.i);
}
function mk(i, nai, te, ta, ba, vol, pot, pass, caus, causPass, imp, prohib, zu, stem) {
  return { masu: i + 'ます', masen: i + 'ません', mashita: i + 'ました', masendeshita: i + 'ませんでした', mashou: i + 'ましょう', nai, nakatta: nai.replace(/い$/, 'かった'), te, ta, tara: ta + 'ら', ba, vol, pot, pass, caus, causPass, imp, prohib, zu, stem };
}
/** Chữ viết: phần kanji đầu (gốc) + đuôi kana. Gốc = word bỏ phần kana chung với dạng từ điển ở cuối (食べる/たべる → 食 + べる). 来る: gốc 来 nhận mọi cách đọc. */
function written(word, kana, k) {
  let n = 0; while (n < word.length && n < kana.length && word[word.length - 1 - n] === kana[kana.length - 1 - n]) n++;
  const head = word.slice(0, word.length - n), khead = kana.slice(0, kana.length - n); // 食 / た
  if (!head) return k; // cả từ viết kana
  if (/来る$/.test(word)) { const pre = word.slice(0, -2); return pre + '来' + k.slice((kana.length - 2) + 1); } // (…)来る: bỏ cách đọc こ/き/く của 来
  if (!k.startsWith(khead)) return null; // không đổi được (gốc bị đổi cách đọc) – không đoán
  return head + k.slice(khead.length);
}
export function conjugate({ word, kana, vclass }) {
  kana = kana || word;
  if (!['ichidan', 'godan', 'irregular'].includes(vclass)) throw new Error('vclass phải là ichidan|godan|irregular');
  const K = kanaForms(kana, vclass), out = {};
  for (const f of FORMS) out[f] = { w: written(word, kana, K[f]), k: K[f] };
  return out;
}
export const form = (v, f) => conjugate(v)[f];
// Động từ kiểm chéo thêm ngoài bộ từ (đủ nhóm + mọi ngoại lệ ở trên): N5/N4 phổ biến
export const KNOWN = [
  ['食べる', 'たべる', 'ichidan'], ['見る', 'みる', 'ichidan'], ['起きる', 'おきる', 'ichidan'], ['寝る', 'ねる', 'ichidan'], ['教える', 'おしえる', 'ichidan'], ['借りる', 'かりる', 'ichidan'], ['くれる', 'くれる', 'ichidan'],
  ['書く', 'かく', 'godan'], ['行く', 'いく', 'godan'], ['泳ぐ', 'およぐ', 'godan'], ['話す', 'はなす', 'godan'], ['待つ', 'まつ', 'godan'], ['死ぬ', 'しぬ', 'godan'], ['遊ぶ', 'あそぶ', 'godan'], ['飲む', 'のむ', 'godan'],
  ['帰る', 'かえる', 'godan'], ['買う', 'かう', 'godan'], ['会う', 'あう', 'godan'], ['ある', 'ある', 'godan'], ['分かる', 'わかる', 'godan'], ['入る', 'はいる', 'godan'], ['走る', 'はしる', 'godan'],
  ['いらっしゃる', 'いらっしゃる', 'godan'], ['おっしゃる', 'おっしゃる', 'godan'], ['くださる', 'くださる', 'godan'], ['なさる', 'なさる', 'godan'],
  ['する', 'する', 'irregular'], ['来る', 'くる', 'irregular'], ['勉強する', 'べんきょうする', 'irregular'], ['持って来る', 'もってくる', 'irregular'],
].map(([word, kana, vclass]) => ({ word, kana, vclass }));
