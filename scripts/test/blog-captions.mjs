// Test cổng "caption truth" (scripts/lib/blog-captions.mjs + content/blog/shot-facts.json): dữ liệu đủ 15 ngôn ngữ,
// hồi quy đúng các caption bịa đã gặp (fr/de/th/ar/ru – lô B5 20/10), đối chứng caption đúng không bị bắt, toàn kho 0 lỗi.
// Dùng: node scripts/test/blog-captions.mjs
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { loadFacts, captionIssues, postExams, termRe, hitOf } from '../lib/blog-captions.mjs';
import { loadPostsAt, ROOT } from '../lib/blog-content.mjs';

let n = 0; const t = (name, fn) => { try { fn(); n++; } catch (e) { console.error(`✗ ${name}\n`, e); process.exit(1); } };
const F = loadFacts(), LANGS = F.langs;
const run = (id, lang, alt, caption, post = {}) => captionIssues(F, { id, lang, alt, caption, postExams: postExams(F, post), keyword: post.keyword || '' });
const errs = (...a) => run(...a).filter(x => x.level === 'error');
const expectHit = (id, lang, alt, caption, re, post) => { const e = errs(id, lang, alt, caption, post).map(x => x.msg).join('\n'); assert.match(e, re, `${lang}/${id}: không bắt "${caption || alt}"\n${e}`); };
const expectClean = (id, lang, alt, caption, post) => { const e = errs(id, lang, alt, caption, post); assert.deepEqual(e, [], `${lang}/${id}: bắt nhầm "${caption || alt}"`); };

t('dữ liệu: mọi ảnh trong shots.json có sự thật; khái niệm tham chiếu tồn tại; từ khóa đủ 15 ngôn ngữ; regex hợp lệ', () => {
  const shots = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'shots.json'), 'utf8')).shots);
  assert.equal(LANGS.length, 15);
  for (const id of shots) assert.ok(F.shots[id], `shot-facts.json thiếu "${id}"`);
  for (const [id, s] of Object.entries(F.shots)) {
    assert.ok(shots.includes(id), `shot-facts.json có "${id}" không có trong shots.json`);
    for (const c of [...(s.features || []), ...(s.notFeatures || []), ...(s.altNotFeatures || [])]) assert.ok(F.concepts[c], `${id}: khái niệm lạ "${c}"`);
    const ex = s.exam; assert.ok(ex === undefined || ex === 'any' || (typeof ex === 'string' && F.exams[ex]) || (Array.isArray(ex) && ex.every(e => F.exams[e])), `${id}: exam lạ ${ex}`);
    assert.ok((s.features || []).length && (s.anchors || []).length, `${id}: cần features + anchors`);
  }
  for (const c of F._default.notFeatures) assert.ok(F.concepts[c], c);
  for (const [c, o] of Object.entries(F.concepts)) {
    if (c === 'competitor') { assert.ok(o._.length >= 5); continue; }
    for (const l of LANGS) assert.ok(Array.isArray(o[l]) && o[l].length, `khái niệm ${c}: thiếu từ khóa ${l}`);
    for (const [k, v] of Object.entries(o)) if (Array.isArray(v)) for (const w of v) { assert.equal(w, w.toLowerCase(), `${c}.${k}: "${w}" phải viết thường`); termRe(w); }
  }
  for (const [k, e] of Object.entries(F.exams)) { new RegExp(e.tags); assert.ok(e.terms.length, k); }
});

t('khớp từ: trọn từ Latin/Kirin, gốc từ có *, chuỗi con với chữ không cách', () => {
  assert.equal(hitOf("j'ai révisé", F.concepts.ai.fr), null, '"ai" trong "j\'ai" không phải AI');
  assert.equal(hitOf('Les examens blancs chronométrés', ['chronométr*']), 'chronométrés');
  assert.equal(hitOf('Регулярное прохождение тестов в режиме реального времени', F.concepts.realtime.ru), 'реального времени');
  assert.equal(hitOf('Vokabelbibliothek', ['*bibliothek']), 'bibliothek');
  assert.equal(hitOf('Lexkiteの単語pollutionカード', ['pollution']), 'pollution', 'neo Latin nằm sát chữ Nhật vẫn khớp');
  assert.equal(hitOf('Ôn thẻ', ['thẻ']), 'thẻ'); assert.equal(hitOf('thư viện', ['thư viện']), 'thư viện'); assert.equal(hitOf('Pass the test', ['test']), 'test');
  assert.equal(hitOf('Contest', ['test']), null);
});

// ——— Hồi quy: nguyên văn caption/alt bịa trong lô B5 (Antigravity, 20/10) – phải bị chặn ———
const FR_CAMB = { lang: 'fr', tags: ['cambridge', 'b2-first', 'c1-advanced', 'fce'], title: 'Cambridge English B2 First et C1 Advanced', keyword: 'cambridge english b2 c1' };
t('hồi quy fr (cambridge-english-b2-c1, phrasal-verbs): ngữ pháp Cambridge, bấm giờ, phrasal verbs theo tần suất, mock không ghi IELTS', () => {
  expectHit('practice-test', 'fr', 'Test à choix multiples sur Lexkite', "Les tests à choix multiples permettent d'évaluer rapidement la maîtrise des règles de grammaire Cambridge", /grammar/, FR_CAMB);
  expectHit('dict', 'fr', 'Dictionnaire contextuel dans Lexkite', "Vérifiez les prépositions et les transformations grammaticales récurrentes de l'épreuve de Use of English", /grammar/, FR_CAMB);
  expectHit('mock', 'fr', "Simulateur d'examens blancs sur Lexkite", "Les examens blancs chronométrés permettent d'adopter le bon rythme et de surmonter le stress le jour J", /timer/, FR_CAMB);
  expectHit('mock', 'fr', "Simulateur d'examens blancs sur Lexkite", "S'entraîner sur des examens blancs complets aide à gérer son rythme le jour J", /bài về Cambridge dùng ảnh màn hình IELTS/, FR_CAMB);
  expectHit('write', 'fr', "Atelier d'écriture IELTS dans Lexkite", "L'atelier d'écriture Lexkite offre un environnement de rédaction chronométré avec des modèles d'essais notés Band 8", /timer/);
  expectHit('library', 'fr', 'Bibliothèque de vocabulaire dans Lexkite', "La bibliothèque de vocabulaire Lexkite regroupe les verbes à particule par fréquence et domaine d'usage", /phrasalIdiom/);
});
const DE_TOEFL = { lang: 'de', tags: ['toefl', 'ielts', 'vergleich', 'sprachzertifikat'], title: 'TOEFL oder IELTS: Der große Vergleich', keyword: 'toefl oder ielts' };
t('hồi quy de (englische-zeiten, toefl-oder-ielts, ielts-writing): thói quen viết, so sánh dạng đề, hứa không lặp lỗi, mock không ghi IELTS', () => {
  expectHit('stats', 'de', 'Lernfortschritts-Dashboard auf Lexkite', 'Verfolgen Sie Ihre Schreibroutine und die kontinuierliche Erweiterung Ihres aktiven Wortschatzes über das Dashboard', /writing/);
  expectHit('practice-test', 'de', 'Multiple-Choice-Fragen auf Lexkite', 'Im Probetest-Modus können Sie Multiple-Choice-Formate beider Zertifikate vergleichen und gezielt üben', /mock[\s\S]*examFormat|examFormat[\s\S]*mock/, DE_TOEFL);
  expectHit('mistakes', 'de', 'Fehlerheft für gezielte Wiederholungen auf Lexkite', 'Das automatische Fehlerheft dokumentiert Verwechslungen bei Zeitformen und schützt vor wiederholten Fehlern', /noRepeat/);
  expectHit('practice-test', 'de', 'Interaktive Multiple-Choice-Übungen auf Lexkite', 'Gezielte Multiple-Choice-Fragen helfen dabei, die passende Zeitform im Satzgefüge blitzschnell zu bestimmen', /grammar/);
  expectHit('mock', 'de', 'Probetest-Modul auf Lexkite', 'Probetests unter realistischen Bedingungen decken persönliche Stärken und Zeitmanagement-Probleme frühzeitig auf', /bài về TOEFL dùng ảnh màn hình IELTS/, DE_TOEFL);
});
t('hồi quy th (theknik-toeic-listening): thư viện IPA bị gán "luyện âm nối"', () => {
  expectHit('pron', 'th', 'คลังเสียง IPA ใน Lexkite', 'การฝึกแยกแยะเสียงเชื่อมและสัทอักษรช่วยให้ฟังสำเนียงภาษาอังกฤษที่หลากหลายในข้อสอบ TOEIC ได้อย่างแม่นยำ', /linking/);
});
const AR_TOEFL = { lang: 'ar', tags: ['toefl', 'toefl-ibt', 'ikhtibar'], title: 'دليل اختبار التوفل iBT', keyword: 'اختبار التوفل' };
t('hồi quy ar (al-afal-al-murakkaba, toefl-ibt-dalil-ar): ảnh ôn thẻ gọi là thư viện, "دون نسيان", mock trong bài TOEFL', () => {
  expectHit('review', 'ar', 'مكتبة المفردات المصنفة في تطبيق Lexkite', 'المراجعة المتباعدة للبطاقات التعليمية تساعد على ترسيخ الأفعال المركبة في الذاكرة طويلة الأمد', /library/);
  expectHit('review', 'ar', 'جلسة مراجعة البطاقات: بطاقة كلمة pollution', 'المراجعة المتباعدة للبطاقات التعليمية ترسخ الأفعال المركبة في الذاكرة طويلة الأمد دون نسيان', /neverForget/);
  expectHit('mock', 'ar', 'واجهة الاختبار التجريبي الشامل لمهارات اللغة الإنجليزية', 'الاختبارات التجريبية الكاملة تساعدك على قياس جاهزيتك وإتقان وتيرة الإجابة قبل دخول قاعة الامتحان', /bài về TOEFL dùng ảnh màn hình IELTS/, AR_TOEFL);
  expectHit('practice-test', 'ar', 'اختبار تجريبي تفاعلي من نوع اختيار من متعدد', 'التدرب المنتظم على الأسئلة السريعة يعزز دقة اختيار الإجابة الصحيحة تحت ضغط الوقت في اختبار التوفل', /mock[\s\S]*timer|timer[\s\S]*mock/, AR_TOEFL);
});
t('hồi quy ru (frazeologicheskie-glagoly): alt ảnh ôn thẻ gọi là "cụm động từ"', () => {
  expectHit('review', 'ru', 'Интервальное повторение карточек с фразовыми глаголами', 'Интервальные сессии повторения помогают надежно закрепить значение фразовых глаголов в долговременной памяти', /phrasalIdiom/);
  expectClean('review', 'ru', 'Интервальное повторение карточек: слово с эмодзи, транскрипцией и кнопкой «Перевернуть»', 'Интервальные сессии повторения помогают надежно закрепить значение фразовых глаголов в долговременной памяти');
});
t('hồi quy bản en/vi của các lỗi trên + hứa quá', () => {
  expectHit('stats', 'en', 'Lexkite Stats screen with XP and streak', 'Keep up your writing routine tracking with daily streaks', /writing/);
  expectHit('practice-test', 'en', 'Lexkite multiple-choice question for "run out of"', 'Drill Cambridge grammar rules with quick questions', /grammar/);
  expectHit('practice-test', 'en', 'Lexkite multiple-choice question for "run out of"', "Compare both exams' formats in one place", /examFormat/);
  expectHit('write', 'en', 'Lexkite IELTS Writing Task 2 room', 'Practise in a timed environment with band 8 models', /timer/);
  expectHit('library', 'en', 'Lexkite vocabulary library', 'Phrasal verbs grouped by frequency', /phrasalIdiom/);
  expectHit('pron', 'en', 'Lexkite IPA library', 'Linking sounds practice for natural speech', /linking/);
  expectHit('review', 'en', 'Categorized vocabulary library in Lexkite', 'Review cards every day', /library/);
  expectHit('review', 'en', 'Lexkite flashcard for "pollution"', 'Spaced repetition so you never forget a word', /neverForget/);
  expectHit('practice-speak', 'vi', 'Màn hình luyện phát âm "cut down on"', 'Chấm giọng thời gian thực bằng AI', /realtime[\s\S]*ai|ai[\s\S]*realtime/);
  expectHit('pron', 'vi', 'Thư viện phát âm IPA kiểu ELSA', 'Luyện từng âm', /competitor/);
  expectHit('practice-test', 'hi', 'IELTS टाइमर आधारित प्रैक्टिस टेस्ट', 'टेस्ट', /gán kỳ thi IELTS – màn hình không thuộc kỳ thi nào/);
  expectHit('reading', 'fr', 'Textes de lecture Lexkite classés A2–C1', 'Lectures par niveau – astuces toeic listening reading', /nhắc TOEIC nhưng ảnh là màn hình IELTS/);
});

// ——— Đối chứng: caption đúng (hiện có trong kho) không bị bắt ———
t('đối chứng: tính năng thật và ngữ cảnh hợp lệ không bị bắt nhầm', () => {
  expectClean('practice-match', 'en', 'Lexkite timed matching game linking English words such as privacy, perspective and surveillance to their meanings', 'Timed matching forces a quick choice between look-alike words like affect and effect');
  expectClean('listening', 'de', 'IELTS-Hörtraining auf Lexkite', 'Während der TOEFL primär auf US-Englisch setzt, trainiert Lexkite für IELTS Akzente aus Großbritannien, Australien und den USA', DE_TOEFL);
  expectClean('practice-test', 'de', 'Lexkite Multiple-Choice-Übung: die richtige Bedeutung von „run out of“ aus vier Antworten wählen', 'Kurzes Quiz zur Bedeutung einer Wendung – business english email schreiben', { lang: 'de', tags: ['business-english', 'email'], keyword: 'business english email schreiben' });
  expectClean('dict', 'en', 'Lexkite dictionary entry for "resilient" with UK and US IPA, audio, example sentence and collocations', 'Check the stress mark in the IPA line before you add a new word to your list');
  expectClean('library', 'en', 'Lexkite vocabulary library with core NGSL word sets arranged by level from A1 to B2', 'Core high-frequency word sets help with Read in Daily Life, where everyday words matter as much as academic ones', { lang: 'en', tags: ['toefl'], keyword: 'new toefl ibt format' });
  expectClean('toeic', 'ko', 'Lexkite 토익 LC+RC: 자동 채점(10–990) 모의고사 7회, 파트별 연습, 토익 어휘', '토익 모의고사와 파트별 연습 – 토익 파트7 독해', { lang: 'ko', tags: ['toeic'] });
  expectClean('mistakes', 'fr', 'Carnet d’erreurs Lexkite', 'Les erreurs de grammaire sont classées pour être revues', {});
  assert.equal(run('practice-test', 'zh', 'Lexkite 选择题练习：从四个选项中选出 “run out of” 的正确含义', '短语含义小测验 – 英语四级听力技巧', { tags: ['si-ji', 'cet-4'] }).length, 0, 'màn hình trung lập: caption được nhắc kỳ thi của bài');
});
t('cảnh báo (d): alt chung chung không tả màn hình', () => {
  const w = run('practice-learn', 'pt', 'Exercícios práticos de fixação e escrita', '').filter(x => x.level === 'warn');
  assert.equal(w.length, 1); assert.match(w[0].msg, /không có thuật ngữ nào của màn hình/);
  assert.equal(run('review', 'ja', 'Lexkiteのフラッシュカード復習画面。単語pollutionのカード', '').filter(x => x.level === 'warn').length, 0);
});

// ——— Toàn kho: 0 lỗi ———
t('toàn kho blog: 0 lỗi caption truth', () => {
  const posts = loadPostsAt(ROOT).filter(p => p.status !== 'draft'); let checked = 0; const bad = [];
  for (const p of posts) { const pex = postExams(F, p); for (const m of (p.body || '').matchAll(/!\[([^\]]*)\]\(\s*media:([\w-]+)(?:\s+"([^"]*)")?\s*\)/g)) { checked++; for (const x of captionIssues(F, { id: m[2], lang: p.lang, alt: m[1], caption: m[3] || '', postExams: pex, keyword: typeof p.keyword === 'string' ? p.keyword : '' })) if (x.level === 'error') bad.push(`${p.lang}/${p.slug}: ${x.msg}`); } }
  assert.ok(checked > 500, `chỉ kiểm ${checked} ảnh`); assert.deepEqual(bad, [], bad.slice(0, 10).join('\n'));
});

// ——— Nối vào blog-check (build + Antigravity chạy) ———
const { checkPosts } = await import('../blog-check.mjs');
t('blog-check: lỗi [caption-truth] / [caption-exam] hiện trong checkPosts', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-cap-'));
  try {
    fs.writeFileSync(path.join(tmp, 'briefs.json'), '{"briefs":[]}'); fs.writeFileSync(path.join(tmp, 'config.json'), '{"images":{"enforce":false}}');
    fs.copyFileSync(path.join(ROOT, 'shots.json'), path.join(tmp, 'shots.json')); fs.copyFileSync(path.join(ROOT, 'shot-facts.json'), path.join(tmp, 'shot-facts.json'));
    const p = { lang: 'de', slug: 'x', file: path.join(tmp, 'de/x.md'), status: 'draft', tags: ['toefl'], title: 'TOEFL test', keyword: 'toefl',
      body: '![Lernfortschritts-Dashboard auf Lexkite](media:stats "Verfolgen Sie Ihre Schreibroutine")\n\n![Probetest-Modul auf Lexkite](media:mock "Probetests decken Schwächen auf")\n' };
    const e = checkPosts([p], { all: [p], root: tmp }).errors.join('\n');
    assert.match(e, /\[caption-truth\] caption media:stats nói "schreib/); assert.match(e, /\[caption-exam\] bài về TOEFL dùng ảnh màn hình IELTS \(media:mock\)/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
console.log(`✓ blog-captions: ${n} nhóm test đạt`);
