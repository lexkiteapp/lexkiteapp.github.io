// Phần riêng ja của cuộc gọi AI (japanese-course.md W4) – nạp CÙNG gói cl.js (ngoài web/js: khỏi tính vào byte người học). Nguồn: scripts/target/calls-pack.mjs ghép vào cl.js.
(function () {
  const E = self.CallEngine, X = self.CallX; if (!E || !X) return;
  // ja: chữ không cách từ (sub → so theo chuỗi, không \b); fold = NFKC + katakana→hiragana
  E.TLX.ja = { sub: true, fill: /(えーと|ええと|えっと|あのー?|うーん|まあ|そのー)/g, link: /(から|ので|けど|が、|でも|しかし|それから|そして|たとえば|ながら|ために|ですから|また|それに|もし)/,
    fold: s => E.TLX.ja.foldRe(s).replace(/[\s\p{P}\p{S}]/gu, ''),
    foldRe: s => String(s || '').normalize('NFKC').replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase(),
    words: s => { const t = String(s || '').normalize('NFKC'); try { return [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(t)].filter(x => x.isWordLike).map(x => x.segment); } catch (e) { return t.match(/[\p{Script=Han}]+|[\p{Script=Hiragana}]{1,3}|[\p{Script=Katakana}ー]+|[A-Za-z0-9]+/gu) || []; } },
    has: (text, w) => E.TLX.ja.fold(text).includes(E.TLX.ja.fold(w)) };
  X.UNSAFE_X.ja = /(死ね|殺す|殺し|ころす|しね|くそ|クソ|バカ野郎|ばか野郎|ちんこ|まんこ|セックス|自殺|じさつ|麻薬|まやく|やりまん)/;
  X.SAFE_SAY.ja = '楽しく、話題に沿ってお話ししましょう。';
})();
