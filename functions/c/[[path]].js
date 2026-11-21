/* 🔗 Trang đích link thử thách nói 30 giây: GET /c/<id>[?l=<ngôn ngữ>&utm_…] (docs/specs/score-card.md).
 * HTML nhỏ không cần JS: og:/twitter: meta (Facebook · Zalo · TikTok · X xem trước) + điểm + nút "Làm thử 30 giây" → /app/#/score/<id> (UTM giữ nguyên).
 * 15 ngôn ngữ: ?l= → Accept-Language → ngôn ngữ của người tạo. Không dữ liệu cá nhân (thẻ chỉ có điểm). Id lạ/không có → chuyển thẳng /app/#/score (bài thử mới). noindex. */
import { getCard, ID_RE } from '../api/challenge.js';

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
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pickLang = (q, accept, own) => {
  if (COPY[q]) return q;
  for (const p of String(accept || '').split(',')) { const l = p.trim().slice(0, 2).toLowerCase(); if (COPY[l]) return l; }
  return COPY[own] ? own : 'en';
};
/** Đích trong app, giữ UTM hợp lệ (mặc định nguồn challenge · chiến dịch score30). */
export function appUrl(id, params) {
  const u = new URLSearchParams(), g = k => { const v = params.get(k); return v && ATTR.test(v) ? v : ''; };
  u.set('utm_source', g('utm_source') || 'challenge'); u.set('utm_medium', g('utm_medium') || 'link'); u.set('utm_campaign', g('utm_campaign') || 'score30');
  return `/app/?${u}#/score${id ? '/' + id : ''}`;
}
export function page({ id, card, lang, params }) {
  const C = COPY[lang], fill = s => s.replace('{s}', card.score).replace('{c}', card.cefr), title = fill(C[0]), to = appUrl(id, params), url = `${SITE}/c/${id}`;
  const bar = (label, v) => `<div class="b"><span>${esc(label)}</span><b>${v}</b><i style="--w:${v}%"></i></div>`;
  return `<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(C[1])}"><meta name="robots" content="noindex"><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Lexkite"><meta property="og:url" content="${url}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(C[1])}"><meta property="og:image" content="${SITE}/og-default.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(C[1])}"><meta name="twitter:image" content="${SITE}/og-default.png">
<meta name="theme-color" content="#0F3D3E"><link rel="icon" href="/favicon.ico">
<style>:root{--bg:#FFF7EA;--card:#fff;--ink:#1f1b16;--mut:#5c5349;--line:#eae1d8;--acc:#E5502F;--on:#fff;--tr:#eff4f3}@media(prefers-color-scheme:dark){:root{--bg:#0b1517;--card:#121d20;--ink:#e6f1f3;--mut:#a9bec2;--line:#234e57;--acc:#ff7a59;--on:#10191b;--tr:#234e57}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;background:var(--bg);color:var(--ink);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{width:100%;max-width:420px;background:var(--card);border:2px solid var(--line);border-radius:24px;padding:28px 22px;text-align:center}
.k{font-weight:800;letter-spacing:.02em;color:var(--mut);margin:0 0 6px}h1{margin:0 0 18px;font-size:1.15rem;line-height:1.35}
.s{font-size:4.5rem;line-height:1;font-weight:800}.s small{font-size:1.2rem;color:var(--mut)}.c{display:inline-block;margin:10px 0 18px;padding:4px 16px;border-radius:999px;background:var(--acc);color:var(--on);font-weight:800}
.b{display:grid;grid-template-columns:1fr auto;gap:2px 10px;text-align:start;margin:0 0 10px;font-size:.95rem}.b i{grid-column:1/-1;height:8px;border-radius:99px;background:var(--tr);position:relative;overflow:hidden}.b i:after{content:"";position:absolute;inset:0;inline-size:var(--w);background:var(--acc);border-radius:99px}
a.go{display:block;margin-top:20px;min-height:48px;line-height:48px;border-radius:16px;background:var(--acc);color:var(--on);font-weight:800;text-decoration:none}a.go:focus-visible{outline:3px solid var(--ink);outline-offset:3px}p.d{margin:16px 0 0;color:var(--mut);font-size:.9rem}</style></head>
<body><main><p class="k">LEXKITE · 30s</p><h1>${esc(title)}</h1><div class="s" aria-label="${esc(C[5])}">${card.score}<small>/100</small></div><div class="c">${card.cefr}</div>${bar(C[3], card.fl)}${bar(C[4], card.pr)}
<a class="go" href="${esc(to)}" id="go">${esc(C[2])}</a><p class="d">${esc(C[1])}</p></main>
<script>try{var b=function(e){navigator.sendBeacon('/api/hit',JSON.stringify({t:'q',ev:e}))};b('sc_cview');document.getElementById('go').addEventListener('click',function(){b('sc_cta')})}catch(e){}</script></body></html>`;
}

export async function onRequestGet({ request, env, params }) {
  const url = new URL(request.url), id = String((params.path || [])[0] || '').toLowerCase();
  let card = null; try { card = ID_RE.test(id) ? await getCard(env.DB, id) : null; } catch (e) { /* D1 lỗi → vẫn chuyển hướng, không kẹt người bấm */ }
  if (!card) return new Response(null, { status: 302, headers: { Location: appUrl('', url.searchParams), 'Cache-Control': 'no-store' } });
  const lang = pickLang(url.searchParams.get('l'), request.headers.get('Accept-Language'), card.lang);
  return new Response(page({ id, card, lang, params: url.searchParams }), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Vary': 'Accept-Language', 'X-Robots-Tag': 'noindex' } });
}
