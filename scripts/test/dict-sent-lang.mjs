// Câu ví dụ song ngữ ở #/dict/<từ> theo đúng ngôn ngữ người học – người dùng ar/ja… không bao giờ thấy bản dịch tiếng Việt (ext-e2e "#/dict/house không lẫn tiếng Việt").
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(new URL('../../web/js/dictionary.js', import.meta.url), 'utf8');
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} dict-sent-lang: ${m}`); if (!c) fail++; };
const TR = { vie: 'Vợ tôi và tôi sắp chuyển đến một ngôi nhà mới.', ara: 'سننتقل أنا وزوجتي إلى منزل جديد.', jpn: '妻と私は新しい家に引っ越します。' };
function load(meanLang, learnLang) {
  const urls = [];
  const fetch = async url => { urls.push(url); const m = /trans:lang=(\w+)/.exec(url); const tl = m && m[1];
    return { ok: true, json: async () => ({ data: [{ text: 'My wife and I are moving into a new house.', translations: [[{ lang: 'vie', text: TR.vie }, ...(tl && tl !== 'vie' && TR[tl] ? [{ lang: tl, text: TR[tl] }] : [])]] }] }) }; };
  const g = { I18N: { meanLang: () => meanLang, learnLang: () => learnLang }, fetch, AbortController, setTimeout, clearTimeout, console };
  g.self = g; vm.createContext(g); vm.runInContext(src, g); return { Dict: g.Dict, urls };
}
for (const [L, code] of [['ar', 'ara'], ['ja', 'jpn']]) {
  const { Dict, urls } = load('en', L);
  const s = await Dict.sentences('house');
  ok(urls.some(u => u.includes(`trans:lang=${code}`)) && !urls.some(u => u.includes('trans:lang=vie')), `${L}: Tatoeba hỏi bản dịch ${code}, không hỏi vie`);
  ok(s.length === 1 && s[0].vi === TR[code] && s[0].l === L, `${L}: câu song ngữ theo ${L}`);
  ok(!s.some(x => VI.test(x.vi)), `${L}: không có bản dịch tiếng Việt`);
  const old = Dict.forLang({ found: true, word: 'house', sentences: [{ en: 'x y z w v', vi: TR.vie }, { en: 'a b c d e', vi: TR[code], l: L }] });
  ok(old.sentences.length === 1 && old.sentences[0].l === L, `${L}: bản lưu cũ (câu tiếng Việt) bị lọc khi hiển thị`);
}
{ const { Dict, urls } = load('vi', 'vi'); const s = await Dict.sentences('house');
  ok(urls.some(u => u.includes('trans:lang=vie')) && s[0] && s[0].vi === TR.vie, 'vi: vẫn câu song ngữ Anh – Việt'); }
{ const { Dict, urls } = load('en', 'en'); const s = await Dict.sentences('house');
  ok(!urls.some(u => /trans:lang=/.test(u)) && s.every(x => !x.vi), 'en: chỉ câu tiếng Anh, không bản dịch'); }
if (fail) { console.error(`✗ dict-sent-lang: ${fail} lỗi`); process.exit(1); }
console.log('✓ dict-sent-lang: câu ví dụ song ngữ đúng ngôn ngữ người học');
