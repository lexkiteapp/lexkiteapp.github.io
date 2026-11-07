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
  },
};
