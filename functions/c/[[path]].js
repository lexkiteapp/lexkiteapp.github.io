/* 🔗 Trang đích link thử thách nói 30 giây: GET /c/<id>[?l=<ngôn ngữ>&utm_…] (docs/specs/score-card.md).
 * HTML nhỏ không cần JS: og:/twitter: meta (Facebook · Zalo · TikTok · X xem trước) + điểm + nút "Làm thử 30 giây" → /app/#/score/<id> (UTM giữ nguyên).
 * 15 ngôn ngữ: ?l= → Accept-Language → ngôn ngữ của người tạo. Không dữ liệu cá nhân (thẻ chỉ có điểm). Id lạ/không có → chuyển thẳng /app/#/score (bài thử mới). noindex. */
import { getCard, ID_RE, VD_PID0 } from '../api/challenge.js';

const SITE = 'https://lexkite.com', ATTR = /^[A-Za-z0-9._~-]{1,40}$/;
// [tiêu đề, mô tả, nút, lưu loát, phát âm, "điểm"]; {s} = điểm, {c} = CEFR
export const COPY = {
  vi: ['Mình nói tiếng Anh được {s}/100 ({c}). Bạn hơn được không?', 'Đọc một đoạn ngắn trong 30 giây, nhận điểm lưu loát, phát âm và ước lượng CEFR. Miễn phí.', 'Làm thử 30 giây', 'Lưu loát', 'Phát âm', 'Điểm'],
  en: ['I scored {s}/100 ({c}) speaking English. Can you beat me?', 'Read a short passage for 30 seconds and get fluency, pronunciation and a CEFR estimate. Free.', 'Take the 30-second test', 'Fluency', 'Pronunciation', 'Score'],
  es: ['Saqué {s}/100 ({c}) hablando inglés. ¿Me superas?', 'Lee un texto corto durante 30 segundos y recibe fluidez, pronunciación y una estimación MCER. Gratis.', 'Haz la prueba de 30 segundos', 'Fluidez', 'Pronunciación', 'Puntos'],
  pt: ['Tirei {s}/100 ({c}) falando inglês. Consegue me superar?', 'Leia um texto curto por 30 segundos e receba fluência, pronúncia e uma estimativa CEFR. Grátis.', 'Faça o teste de 30 segundos', 'Fluência', 'Pronúncia', 'Pontos'],
  fr: ["J'ai obtenu {s}/100 ({c}) en parlant anglais. Tu peux faire mieux ?", 'Lis un court texte pendant 30 secondes et obtiens fluidité, prononciation et une estimation CECRL. Gratuit.', 'Fais le test de 30 secondes', 'Fluidité', 'Prononciation', 'Score'],
  de: ['Ich habe {s}/100 ({c}) beim Englischsprechen erreicht. Schaffst du mehr?', 'Lies 30 Sekunden lang einen kurzen Text und erhalte Flüssigkeit, Aussprache und eine GER-Einschätzung. Kostenlos.', '30-Sekunden-Test starten', 'Flüssigkeit', 'Aussprache', 'Punkte'],
  id: ['Skor bicara bahasa Inggrisku {s}/100 ({c}). Bisa mengalahkanku?', 'Baca teks pendek selama 30 detik dan dapatkan kelancaran, pelafalan, dan perkiraan CEFR. Gratis.', 'Coba tes 30 detik', 'Kelancaran', 'Pelafalan', 'Skor'],
  th: ['ฉันพูดภาษาอังกฤษได้ {s}/100 ({c}) คุณเอาชนะได้ไหม?', 'อ่านข้อความสั้น ๆ 30 วินาที รับคะแนนความคล่อง การออกเสียง และระดับ CEFR โดยประมาณ ฟรี', 'ลองทดสอบ 30 วินาที', 'ความคล่อง', 'การออกเสียง', 'คะแนน'],
  zh: ['我的英语口语得了 {s}/100（{c}）。你能超过我吗？', '朗读一小段文字 30 秒，获得流利度、发音和 CEFR 等级估计。免费。', '开始 30 秒测试', '流利度', '发音', '得分'],
  ja: ['英語スピーキングで {s}/100（{c}）でした。超えられる？', '短い文を30秒音読して、流暢さ・発音・CEFR目安がわかります。無料。', '30秒テストに挑戦', '流暢さ', '発音', 'スコア'],
  ko: ['영어 말하기 {s}/100점({c})! 이길 수 있어요?', '짧은 글을 30초 동안 읽고 유창성, 발음, CEFR 추정 등급을 받아보세요. 무료.', '30초 테스트 시작', '유창성', '발음', '점수'],
  hi: ['अंग्रेज़ी बोलने में मेरा स्कोर {s}/100 ({c}) रहा। क्या आप हरा सकते हैं?', '30 सेकंड में एक छोटा अंश पढ़ें और प्रवाह, उच्चारण और CEFR अनुमान पाएँ। मुफ़्त।', '30 सेकंड का टेस्ट दें', 'प्रवाह', 'उच्चारण', 'स्कोर'],
  ar: ['حصلت على {s}/100 ({c}) في التحدث بالإنجليزية. هل تتفوق عليّ؟', 'اقرأ فقرة قصيرة لمدة 30 ثانية واحصل على الطلاقة والنطق وتقدير مستوى CEFR. مجاني.', 'ابدأ اختبار 30 ثانية', 'الطلاقة', 'النطق', 'الدرجة'],
  ru: ['Мой результат в разговорном английском — {s}/100 ({c}). Сможешь лучше?', 'Прочитайте короткий текст за 30 секунд и получите оценку беглости, произношения и уровня CEFR. Бесплатно.', 'Пройти тест за 30 секунд', 'Беглость', 'Произношение', 'Баллы'],
  tr: ['İngilizce konuşmada {s}/100 ({c}) aldım. Beni geçebilir misin?', '30 saniyede kısa bir metin oku; akıcılık, telaffuz ve CEFR tahmini al. Ücretsiz.', '30 saniyelik testi dene', 'Akıcılık', 'Telaffuz', 'Puan'],
};
// 🎙️ Thẻ Nhật ký giọng nói (pid ≥ VD_PID0, docs/specs/voice-diary.md): [tiêu đề có tiến bộ ({f} ngày 1 → {s} ngày {d}), tiêu đề chỉ điểm, mô tả, nút]
export const COPY_VD = {
  vi: ['Mình từ {f} lên {s} điểm sau {d} ngày nói tiếng Anh. Bạn thử câu này?', 'Mình đạt {s}/100 câu này trong nhật ký giọng nói. Bạn thử nhé?', 'Nhật ký giọng nói Lexkite: thu 1 câu, thu lại sau 7–30 ngày và nghe chính mình tiến bộ. Miễn phí.', 'Thử câu này'],
  en: ['I went from {f} to {s} points in {d} days of speaking English. Can you say this sentence?', 'I scored {s}/100 on this sentence in my voice diary. Your turn?', 'Lexkite voice diary: record one sentence, record it again after 7–30 days and hear your own progress. Free.', 'Try this sentence'],
  es: ['Pasé de {f} a {s} puntos en {d} días hablando inglés. ¿Puedes decir esta frase?', 'Saqué {s}/100 con esta frase en mi diario de voz. ¿Te animas?', 'Diario de voz de Lexkite: graba una frase, vuelve a grabarla a los 7–30 días y escucha tu progreso. Gratis.', 'Prueba esta frase'],
  pt: ['Fui de {f} para {s} pontos em {d} dias falando inglês. Consegue dizer esta frase?', 'Fiz {s}/100 nesta frase no meu diário de voz. Sua vez?', 'Diário de voz do Lexkite: grave uma frase, grave de novo depois de 7–30 dias e ouça seu progresso. Grátis.', 'Tente esta frase'],
  fr: ["Je suis passé de {f} à {s} points en {d} jours d'anglais parlé. Saurez-vous dire cette phrase ?", "J'ai obtenu {s}/100 sur cette phrase dans mon journal vocal. À vous ?", 'Journal vocal Lexkite : enregistrez une phrase, refaites-la après 7 à 30 jours et écoutez vos progrès. Gratuit.', 'Essayer cette phrase'],
  de: ['Ich habe mich in {d} Tagen Englischsprechen von {f} auf {s} Punkte verbessert. Schaffen Sie diesen Satz?', 'Ich habe bei diesem Satz in meinem Sprachtagebuch {s}/100 erreicht. Sind Sie dran?', 'Lexkite-Sprachtagebuch: einen Satz aufnehmen, nach 7–30 Tagen erneut aufnehmen und den eigenen Fortschritt hören. Kostenlos.', 'Satz ausprobieren'],
  id: ['Skorku naik dari {f} ke {s} dalam {d} hari berbicara bahasa Inggris. Bisa ucapkan kalimat ini?', 'Aku dapat {s}/100 di kalimat ini dalam buku harian suaraku. Giliranmu?', 'Buku harian suara Lexkite: rekam satu kalimat, rekam lagi setelah 7–30 hari, dan dengarkan kemajuanmu. Gratis.', 'Coba kalimat ini'],
  th: ['ฉันพัฒนาจาก {f} เป็น {s} คะแนนใน {d} วันของการพูดภาษาอังกฤษ คุณพูดประโยคนี้ได้ไหม?', 'ฉันได้ {s}/100 กับประโยคนี้ในไดอารี่เสียง ตาคุณแล้ว?', 'ไดอารี่เสียง Lexkite: อัดหนึ่งประโยค อัดใหม่หลัง 7–30 วัน แล้วฟังพัฒนาการของตัวเอง ฟรี', 'ลองประโยคนี้'],
  zh: ['我说英语 {d} 天，从 {f} 分进步到 {s} 分。你能说好这句话吗？', '我在语音日记里这句话得了 {s}/100。轮到你了？', 'Lexkite 语音日记：录一句话，7–30 天后再录，听见自己的进步。免费。', '试试这句'],
  ja: ['英語を話して{d}日で{f}点から{s}点に上がりました。この文、言えますか？', 'ボイス日記でこの文は{s}/100でした。あなたもどうぞ！', 'Lexkiteのボイス日記：1文を録音し、7〜30日後にもう一度録音して自分の上達を聞こう。無料。', 'この文に挑戦'],
  ko: ['영어 말하기 {d}일 만에 {f}점에서 {s}점이 됐어요. 이 문장 말할 수 있어요?', '음성 일기에서 이 문장으로 {s}/100점을 받았어요. 이제 당신 차례예요!', 'Lexkite 음성 일기: 한 문장을 녹음하고 7–30일 후 다시 녹음해 내 실력이 는 걸 들어 보세요. 무료.', '이 문장 도전'],
  hi: ['अंग्रेज़ी बोलते हुए {d} दिनों में मेरा स्कोर {f} से {s} हो गया। क्या आप यह वाक्य बोल सकते हैं?', 'अपनी वॉइस डायरी में इस वाक्य पर मुझे {s}/100 मिले। अब आपकी बारी?', 'Lexkite वॉइस डायरी: एक वाक्य रिकॉर्ड करें, 7–30 दिन बाद फिर रिकॉर्ड करें और अपनी प्रगति सुनें। मुफ़्त।', 'यह वाक्य आज़माएँ'],
  ar: ['تحسّنت من {f} إلى {s} نقطة خلال {d} يومًا من التحدث بالإنجليزية. هل تستطيع نطق هذه الجملة؟', 'حصلت على {s}/100 في هذه الجملة في مذكراتي الصوتية. دورك؟', 'مذكرات الصوت من Lexkite: سجّل جملة، وأعد تسجيلها بعد 7–30 يومًا، واستمع إلى تقدّمك. مجانًا.', 'جرّب هذه الجملة'],
  ru: ['За {d} дней разговорного английского мой результат вырос с {f} до {s}. Сможете произнести эту фразу?', 'В моём голосовом дневнике у этой фразы {s}/100. Ваша очередь?', 'Голосовой дневник Lexkite: запишите фразу, повторите через 7–30 дней и услышьте свой прогресс. Бесплатно.', 'Попробовать фразу'],
  tr: ['{d} günde İngilizce konuşmada {f} puandan {s} puana çıktım. Bu cümleyi söyleyebilir misin?', 'Ses günlüğümde bu cümlede {s}/100 aldım. Sıra sende?', 'Lexkite ses günlüğü: bir cümle kaydet, 7–30 gün sonra yeniden kaydet ve ilerlemeni dinle. Ücretsiz.', 'Bu cümleyi dene'],
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pickLang = (q, accept, own) => {
  if (COPY[q]) return q;
  for (const p of String(accept || '').split(',')) { const l = p.trim().slice(0, 2).toLowerCase(); if (COPY[l]) return l; }
  return COPY[own] ? own : 'en';
};
/** Đích trong app, giữ UTM hợp lệ (mặc định nguồn challenge · chiến dịch score30). */
export function appUrl(id, params, vd) {
  const u = new URLSearchParams(), g = k => { const v = params.get(k); return v && ATTR.test(v) ? v : ''; };
  u.set('utm_source', g('utm_source') || 'challenge'); u.set('utm_medium', g('utm_medium') || 'link'); u.set('utm_campaign', g('utm_campaign') || (vd ? 'voicediary' : 'score30'));
  return vd ? `/app/?${u}#/diary/c/${id}` : `/app/?${u}#/score${id ? '/' + id : ''}`;
}
const small = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
export function page({ id, card, lang, params }) {
  const vd = card.pid >= VD_PID0, V = COPY_VD[lang], f0 = small(params.get('f'), 0, 100), d0 = small(params.get('d'), 1, 999); // nhật ký: điểm ngày 1 + số ngày trong URL (chỉ số, kẹp khoảng – không dữ liệu cá nhân)
  const C = vd ? [f0 != null && d0 ? V[0] : V[1], V[2], V[3], COPY[lang][3], COPY[lang][4], COPY[lang][5]] : COPY[lang], fill = s => s.replace('{s}', card.score).replace('{c}', card.cefr).replace('{f}', f0).replace('{d}', d0), title = fill(C[0]), to = appUrl(id, params, vd), url = `${SITE}/c/${id}`, img = `${SITE}/og/score-${card.cefr}.png`; // ảnh OG theo bậc CEFR (scripts/og-score.mjs)
  const bar = (label, v) => `<div class="b"><span>${esc(label)}</span><b>${v}</b><i style="--w:${v}%"></i></div>`;
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(C[1])}"><meta name="robots" content="noindex"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:url" content="${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(C[1])}"><meta property="og:image" content="${img}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(C[1])}"><meta name="twitter:image" content="${img}">
<meta name="theme-color" content="#0F3D3E"><link rel="icon" href="/favicon.ico">
<style>:root{--bg:#FFF7EA;--card:#fff;--ink:#1f1b16;--mut:#5c5349;--line:#eae1d8;--acc:#E5502F;--on:#fff;--tr:#eff4f3}@media(prefers-color-scheme:dark){:root{--bg:#0b1517;--card:#121d20;--ink:#e6f1f3;--mut:#a9bec2;--line:#234e57;--acc:#ff7a59;--on:#10191b;--tr:#234e57}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{width:100%;max-width:420px;background:var(--card);border:2px solid var(--line);border-radius:24px;padding:28px 22px;text-align:center}
.k{font-weight:800;letter-spacing:.02em;color:var(--mut);margin:0 0 6px}h1{margin:0 0 18px;font-size:1.15rem;line-height:1.35}
.s{font-size:4.5rem;line-height:1;font-weight:800}.s small{font-size:1.2rem;color:var(--mut)}.c{display:inline-block;margin:10px 0 18px;padding:4px 16px;border-radius:999px;background:var(--acc);color:var(--on);font-weight:800}
.b{display:grid;grid-template-columns:1fr auto;gap:2px 10px;text-align:start;margin:0 0 10px;font-size:.95rem}.b i{grid-column:1/-1;height:8px;border-radius:99px;background:var(--tr);position:relative;overflow:hidden}.b i:after{content:"";position:absolute;inset:0;inline-size:var(--w);background:var(--acc);border-radius:99px}
a.go{display:block;margin-top:20px;min-height:48px;line-height:48px;border-radius:16px;background:var(--acc);color:var(--on);font-weight:800;text-decoration:none}a.go:focus-visible{outline:3px solid var(--ink);outline-offset:3px}p.d{margin:16px 0 0;color:var(--mut);font-size:.9rem}</style></head>
<body><main><p class="k">LEXKITE · ${vd ? '🎙️' : '30s'}</p><h1>${esc(title)}</h1><div class="s" aria-label="${esc(C[5])}">${card.score}<small>/100</small></div><div class="c">${card.cefr}</div>${bar(C[3], card.fl)}${bar(C[4], card.pr)}
<a class="go" href="${esc(to)}" id="go">${esc(C[2])}</a><p class="d">${esc(C[1])}</p></main>
<script>try{var b=function(e){navigator.sendBeacon('/api/hit',JSON.stringify({t:'q',ev:e}))};b('${vd ? 'vd' : 'sc'}_cview');document.getElementById('go').addEventListener('click',function(){b('${vd ? 'vd' : 'sc'}_cta')})}catch(e){}</script></body></html>`;
}

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url), id = String((params.path || [])[0] || '').toLowerCase();
  let card = null; try { card = ID_RE.test(id) ? await getCard(env.DB, id) : null; } catch (e) { /* D1 lỗi → vẫn chuyển hướng, không kẹt người bấm */ }
  if (!card) return new Response(null, { status: 302, headers: { Location: appUrl('', url.searchParams), 'Cache-Control': 'no-store' } });
  const lang = pickLang(url.searchParams.get('l'), request.headers.get('Accept-Language'), card.lang);
  return new Response(page({ id, card, lang, params: url.searchParams }), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Vary': 'Accept-Language', 'X-Robots-Tag': 'noindex' } });
}
