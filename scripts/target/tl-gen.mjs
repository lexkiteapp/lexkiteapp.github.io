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
  // korean-course.md §2/§8: tiếng Hàn chuẩn Seoul (표준어); câu ví dụ chính thể lịch sự 해요체 (…요.); pron (표준 발음), romaja (RR 2000) và IPA do ko-hangul.mjs SINH từ chữ
  // (người soạn trả để đối chiếu, cổng validate() ép đúng quy tắc; ngoại lệ theo từ – 사이시옷/Hán-Hàn căng hoá, ㄴ 첨가 – khai ở pronX); topik 1…6; vị từ dạng từ điển …다 + conj.
  // Ứng viên W1 = danh sách từ học tiếng Hàn của Viện Quốc ngữ (국립국어원 한국어 학습용 어휘 목록, cấp A/B/C – chỉ đối chiếu cấp) + FrequencyWords ko làm thứ hạng phụ
  // (OpenSubtitles tách theo 어절 → 책을/먹었어요 quy về lemma bằng kaikki trước khi tốn ai-pool); one = từ 1 âm tiết (집, 물, 책…) hợp lệ.
  ko: {
    variant: 'ko-KR', lang: 'standard Seoul Korean (pyojuneo)', short: 'Korean', exLevel: 'TOPIK I (levels 1–2; higher only if the word itself is higher), polite 해요체 ending in 요', level: 'TOPIK 1–6 (A1–C2)', source: FW('ko', 'ko_full'), kaikki: 'Korean', one: /^[\uac00-\ud7a3]$/u,
    // strip: tiểu từ dính sau danh từ (우리가 → 우리, 학교에서 → 학교) – gen.mjs chỉ bóc khi GỐC cũng là dạng đứng riêng trong 50k dạng đầu (không cắt nhầm 고양이 → 고양, 아이 → 아)
    strip: /(이|가|은|는|을|를|에|에서|에게|한테|께|의|도|만|와|과|랑|이랑|하고|로|으로|부터|까지|처럼|보다)$/u,
    ipa: 'broad Seoul IPA of the STANDARD pronunciation (pyojun bareum, after liaison/nasalisation/tensing): plain stops k t p tɕ (voiced ɡ d b dʑ between voiced sounds), tense k͈ t͈ p͈ s͈ t͈ɕ, aspirated kʰ tʰ pʰ tɕʰ, ㅅ before i/y = ɕ, ㄹ = ɾ (l in coda or doubled), unreleased codas k̚ t̚ p̚, vowels a ɛ ʌ e o u ɯ i, ㅚ = we, ㅟ = ɥi, ㅢ = ɰi, no syllable dots',
    extra: ', "pron": standard pronunciation written in Hangul (e.g. 국물 → 궁물, 학교 → 학꾜), "romaja": Revised Romanization 2000 (no tensing, vowels as spelled: 희망 = huimang), "topik": 1|2|3|4|5|6, "conj": verb/adjective class ONLY for v/adj ("reg"|"하"|"ㅂ"|"ㄷ"|"ㅅ"|"ㅎ"|"르"|"러"|"으"|"ㄹ"|"우"|"이"), "hanja": Chinese characters ONLY for Sino-Korean words (same number of syllables); verbs and adjectives in dictionary form ending in 다; NO gender, NO plural',
    audit: 'pron is not the standard pronunciation (표준 발음법) or misses a lexical tensing/ㄴ-insertion; romanization not RR 2000; TOPIK level clearly off; conj class wrong (e.g. 돕다 is ㅂ-irregular, 입다 regular; 듣다 ㄷ-irregular, 받다 regular); hanja wrong; example is not natural standard Korean, not in polite 해요체, mixes 반말 and 존댓말, uses Hanja or Latin letters, or the headword particle (은/는, 이/가, 을/를) is wrong for its final consonant',
    rules: 'Use ONLY standard Seoul Korean (pyojuneo). The headword is written in Hangul (never Hanja); verbs and adjectives in dictionary form (…다); nouns without particles. Examples are one sentence in polite 해요체 ending in 요. or 요?, Hangul only (Arabic numerals allowed for times/prices). Return {"skip": "vulgar"} for vulgar, offensive or slur words, {"skip": "particle"} for bare particles/endings (taught in W2 grammar).',
  },
};
