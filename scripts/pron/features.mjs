// Bảng đặc trưng ngữ âm CHUẨN cho 44 âm IPA của bài phát âm (giọng chuẩn Anh hiện đại – SSBE/RP, theo bảng IPA;
// đối chiếu mô tả nguyên âm/phụ âm trong Roach "English Phonetics and Phonology" và bảng IPA của Cambridge Dictionary).
// Đây là nguồn đối chiếu ĐỘC LẬP: scripts/test/pron-features.mjs so web/js/pron/sounds.js (mouth + lời giải thích) với bảng này.
// Sửa bảng này chỉ khi có nguồn ngữ âm học – không sửa cho khớp dữ liệu.
//
// Nguyên âm: height close | near-close | close-mid | mid | open-mid | near-open | open
//            back   front | near-front | central | near-back | back
//            lips   spread | neutral | round      jaw (độ mở hàm, suy từ height) close | near-close | mid | open-mid | open
// Nguyên âm đôi: điểm đầu (height/back/lips/jaw) + `to` điểm cuối.
// Phụ âm: place lips (môi–môi) | teeth (môi–răng) | tongue-teeth (lưỡi–răng) | ridge (lợi) | post-ridge (sau lợi) | palate (ngạc cứng)
//                | back (ngạc mềm) | throat (thanh hầu) | lips-back (môi + ngạc mềm)
//         manner stop | fricative | affricate | nasal | approximant;  aspirated = bật hơi ở đầu âm tiết nhấn;  lateral = hơi đi hai bên lưỡi.

export const JAW = { close: 'close', 'near-close': 'near-close', 'close-mid': 'mid', mid: 'mid', 'open-mid': 'open-mid', 'near-open': 'open', open: 'open' };
const v = (height, back, lips, long) => ({ kind: 'vowel', height, back, lips, jaw: JAW[height], long, voiced: true });
const d = (a, b) => ({ ...a, kind: 'diphthong', to: { height: b.height, back: b.back, lips: b.lips, jaw: b.jaw }, long: true, voiced: true });
const c = (place, manner, voiced, extra = {}) => ({ kind: 'consonant', place, manner, voiced, ...extra });

const ɪ = v('near-close', 'near-front', 'neutral', false), ʊ = v('near-close', 'near-back', 'round', false), ə = v('mid', 'central', 'neutral', false);
export const REF = {
  // 12 nguyên âm đơn
  'iː': v('close', 'front', 'spread', true),
  'ɪ': ɪ,                                            // thấp & lùi hơn /iː/, môi thả lỏng (không kéo), hàm hé hơn /iː/
  'e': v('mid', 'front', 'spread', false),           // giữa close-mid và open-mid; môi hơi kéo
  'æ': v('near-open', 'front', 'spread', false),     // môi hơi kéo, hàm hạ nhiều
  'ʌ': v('open-mid', 'central', 'neutral', false),   // SSBE ngày nay gần [ɐ]
  'ɑː': v('open', 'back', 'neutral', true),
  'ɒ': v('open', 'back', 'round', false),            // tròn môi nhẹ
  'ɔː': v('mid', 'back', 'round', true),             // giữa close-mid và open-mid, tròn môi rõ
  'ʊ': ʊ,
  'uː': v('close', 'back', 'round', true),
  'ɜː': v('mid', 'central', 'neutral', true),
  'ə': ə,
  // 8 nguyên âm đôi (điểm đầu → điểm cuối)
  'eɪ': d(v('mid', 'front', 'spread'), ɪ),
  'aɪ': d(v('open', 'central', 'neutral'), ɪ),        // [a] mở, giữa trước và sau; môi không kéo
  'ɔɪ': d(v('open-mid', 'back', 'round'), ɪ),
  'əʊ': d(ə, ʊ),                                       // giọng Anh bắt đầu từ /ə/, không phải "ô"
  'aʊ': d(v('open', 'central', 'neutral'), ʊ),         // bắt đầu [a] mở, môi KHÔNG tròn; tròn dần về /ʊ/
  'ɪə': d(ɪ, ə),
  'eə': d(v('open-mid', 'front', 'neutral'), ə),       // SSBE nay thường là [ɛː] dài
  'ʊə': d(ʊ, ə),
  // 24 phụ âm
  'p': c('lips', 'stop', false, { aspirated: true }),
  'b': c('lips', 'stop', true),
  't': c('ridge', 'stop', false, { aspirated: true }),
  'd': c('ridge', 'stop', true),
  'k': c('back', 'stop', false, { aspirated: true }),
  'ɡ': c('back', 'stop', true),
  'f': c('teeth', 'fricative', false),
  'v': c('teeth', 'fricative', true),
  'θ': c('tongue-teeth', 'fricative', false),
  'ð': c('tongue-teeth', 'fricative', true),
  's': c('ridge', 'fricative', false),
  'z': c('ridge', 'fricative', true),
  'ʃ': c('post-ridge', 'fricative', false, { lips: 'round' }),
  'ʒ': c('post-ridge', 'fricative', true, { lips: 'round' }),
  'tʃ': c('post-ridge', 'affricate', false, { lips: 'round', aspirated: true }),
  'dʒ': c('post-ridge', 'affricate', true, { lips: 'round' }),
  'h': c('throat', 'fricative', false),
  'm': c('lips', 'nasal', true),
  'n': c('ridge', 'nasal', true),
  'ŋ': c('back', 'nasal', true),
  'l': c('ridge', 'approximant', true, { lateral: true }),
  'r': c('post-ridge', 'approximant', true, { lips: 'round' }),
  'w': c('lips-back', 'approximant', true, { lips: 'round' }),
  'j': c('palate', 'approximant', true),
};

// Câu chữ SAI đã từng có / dễ tái phạm – tuyệt đối không được xuất hiện trong how/vn/tip của âm đó (đã đối chiếu nguồn).
export const DENY = {
  'ɪ': [/hàm (gần )?khép/i, /môi (kéo|dàn) (sang hai bên|ngang|rộng)/i, /như đang cười/i],
  'aʊ': [/môi tròn ngay từ đầu/i],
  'aɪ': [/môi kéo/i],
  'd': [/"đ" tiếng Việt chạm răng/i, /lùi lên lợi/i],
  'k': [/"kh"/i, /"khi"/i],
  's': [/"s" \(sờ\) miền Bắc/i],
  'ʒ': [/miền Nam đọc "gi"/i],
  'v': [/"have" thành "he"/i],
  't': [/gần "then"/i],
};
