// Bảng SINH nội dung theo ngôn ngữ đích (tl) – MỘT nguồn cho scripts/target/gen.mjs (không nhánh `if (tl)` trong code sinh).
// Thêm ngôn ngữ đích = thêm 1 dòng ở đây + seed soát tay + dòng TL_RULES (lib.mjs) + dòng tl-voices.json. Spec: docs/specs/target-language.md, docs/specs/spanish-course.md §2–§8.
// Mỗi dòng: variant (khớp seed.variant), source (thứ hạng tần suất – CC BY-SA, chỉ dùng thứ hạng), one = từ 1 chữ cái hợp lệ, lang (tên cho lời nhắc),
// ipa (quy ước IPA cho người soạn – IPA ship cuối cùng do espeak-ng sinh ở scripts/target/tl_ipa_fill.py khi bảng tl-voices.json có mã espeak),
// extra (trường thêm người soạn phải trả), audit (tiêu chí loại thêm cho giám khảo), lt (mã LanguageTool; có = cổng §5.1 bắt buộc), kaikki (tên ngôn ngữ trên kaikki.org cho wikt-check.mjs).
const FW = (code, file) => ({ name: `FrequencyWords (hermitdave) – OpenSubtitles 2018 ${file}`, url: `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${code}/${file}.txt`, license: 'CC BY-SA 4.0 (dữ liệu) – chỉ dùng thứ hạng để chọn từ; ghi công trong spec' });

export const TL_GEN = {
  pt: {
    variant: 'pt-BR', lang: 'Brazilian Portuguese', short: 'Portuguese', exLevel: 'A1', level: 'A1–A2', source: FW('pt_br', 'pt_br_50k'), kaikki: 'Portuguese', one: /^[aeéoà]$/,
    ipa: 'Brazilian Portuguese IPA without slashes (São Paulo/Rio neutral: final r = ʁ, ti/di = tʃi/dʒi)',
    extra: '',
    audit: 'IPA not Brazilian or wrong stress',
  },
  es: {
    variant: 'es-419', lang: 'neutral Latin American Spanish (es-419)', short: 'Spanish', exLevel: 'A1–A2 (B1 only if the word itself is B1+)', level: 'A1–B2', source: FW('es', 'es_50k'), kaikki: 'Spanish', one: /^[aoyeu]$/, lt: 'es',
    ipa: 'neutral Latin American IPA without slashes, seseo (c/z = s, never θ), yeísmo (ll = ʝ), stress mark ˈ before the stressed syllable, tap ɾ vs trill r, intervocalic β ð ɣ',
    extra: ', "plural": plural form ONLY for nouns (same as word if invariable, e.g. "lunes")',
    // spanish-course.md §8: chuẩn trung tính Mỹ Latinh – vosotros/leísmo/từ chỉ Tây Ban Nha không có trong câu chính
    audit: 'IPA has θ or is not Latin American; plural wrong; example uses vosotros forms, leísmo, Spain-only vocabulary (ordenador, zumo, coche, móvil as phone) or a word vulgar in Latin America (coger); example is not neutral Latin American Spanish',
    rules: 'Use ONLY neutral Latin American Spanish: ustedes (never vosotros), lo/la as direct objects (no leísmo), pan-regional vocabulary (computadora, carro/auto, celular, jugo, tomar instead of coger). Return {"skip": "vulgar"} for vulgar, offensive or slur words.',
  },  fr: {
    variant: 'fr-FR', lang: 'standard metropolitan French (France, neutral register)', short: 'French', exLevel: 'A1–A2 (B1 only if the word itself is B1+)', level: 'A1–B2', source: FW('fr', 'fr_50k'), kaikki: 'French', one: /^[àyaeoué]$/, lt: 'fr',
    ipa: 'standard French IPA without slashes (espeak-ng fr-fr conventions): uvular ʁ, nasal vowels ɑ̃ ɔ̃ ɛ̃ (œ̃ only if the speaker keeps it), ɥ in cuisine/huit, ø vs œ, no schwa where it is silent (petit = pəti, la/le = schwa kept)',
    extra: ', "plural": plural form ONLY for nouns (same as word if invariable, e.g. "jus"; irregular -al→-aux, -eau→-eaux, ciel→cieux), "h": "muet" or "aspire" ONLY when the word starts with h (muet: l\'homme, aspire: le haricot)',
    // french-course.md §8: chuẩn Pháp trung tính – không Québec/Bỉ/Thụy Sĩ, không thông tục nặng; một câu một xưng (tu hoặc vous)
    audit: 'IPA not standard French or silent e mishandled; plural wrong (or missing for a noun); h flag missing/wrong on an h-word; example mixes tu and vous in one sentence, uses Québec/Belgian/Swiss forms (char, dépanneur, septante) or heavy slang (bagnole, boulot, bouffer) or is not natural spoken French',
    rules: 'Use ONLY standard French of France, neutral register. One address form per example: vous for polite/formal sentences, tu only for clearly friendly ones, never both in one sentence. Return {"skip": "vulgar"} for vulgar, offensive or slur words.',
  },
  // japanese-course.md §2/§8: tiếng Nhật chuẩn Tokyo (共通語); câu ví dụ chính thể lịch sự です/ます; kana = cách đọc, romaji + IPA do ja-kana.mjs SINH từ kana (người soạn
  // trả để đối chiếu, cổng validate() ép đúng quy ước); pitch = vị trí hạ kiểu NHK (0 = heiban); jlpt 5…1. Ứng viên W1 = danh sách JLPT (tự soạn theo cấp, JMdict kiểm chéo) –
  // FrequencyWords ja chỉ là thứ hạng phụ (OpenSubtitles tách từ kém); one = từ 1 chữ kanji (本, 犬…) hợp lệ.
  ja: {
    variant: 'ja-JP', lang: 'standard Tokyo Japanese (hyōjungo)', short: 'Japanese', exLevel: 'JLPT N5–N4 (N3+ only if the word itself is N3+), polite desu/masu form', level: 'JLPT N5–N1 (A1–C2)', source: FW('ja', 'ja_full'), kaikki: 'Japanese', one: /^\p{Script=Han}$/u,
    ipa: 'broad Tokyo IPA derived from the kana reading (ɯ, ɕ tɕ dʑ ɲ ç ɸ, palatal kʲ gʲ mʲ ɾʲ bʲ pʲ, ɾ, moraic n assimilated m/n/ɲ/ŋ/ɴ, geminate doubled consonant, long vowel ː incl. おう/えい), no pitch marks',
    extra: ', "kana": reading in hiragana (katakana for katakana words), "romaji": kana-faithful romaji as typed in an IME (おう = ou, ー doubles the vowel, ん before a vowel/y = n\'), "pitch": Tokyo pitch-accent downstep mora as in the NHK dictionary (0 = heiban), "jlpt": 5|4|3|2|1, "vclass": "ichidan"|"godan"|"irregular" ONLY for verbs, "aclass": "i"|"na" ONLY for adjectives; NO gender, NO plural',
    audit: 'reading (kana) wrong or not the common reading; pitch accent not the standard Tokyo (NHK) one; JLPT level clearly off; verb class or i/na class wrong; example is not natural standard Japanese, not in polite です/ます form, mixes plain and polite endings in the main clause, uses kanji beyond the learner level without need, or contains romaji/spaces',
    rules: 'Use ONLY standard Tokyo Japanese (hyōjungo). The headword is the usual written form (kanji where the word is normally written in kanji, hiragana/katakana where it is normally written in kana). Examples end in polite です/ます form with 。, no spaces, no romaji. Return {"skip": "vulgar"} for vulgar, offensive or slur words, {"skip": "particle"} for bare particles/auxiliaries (taught in W2 grammar).',
  },
};
