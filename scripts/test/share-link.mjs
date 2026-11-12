// 🔗 Liên kết thẻ khoe thành tích (web/js/share-card.js): trỏ /go/<ngôn ngữ>/ với UTM sạch; QR ≤ 62 byte (giới hạn js/lib/qr.js); mã giới thiệu chỉ khi hợp lệ.
// Chạy trong npm test: node scripts/test/share-link.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
const LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const sandbox = l => { const g = { document: { getElementById() {}, head: {}, body: {}, documentElement: {} }, I18N: { lang: () => l }, t: k => k }; g.self = g; vm.createContext(g); vm.runInContext(fs.readFileSync('web/js/share-card.js', 'utf8'), g); return g.ShareCard; };
const SC = sandbox('en');
ok(SC && typeof SC.link === 'function' && typeof SC.kindOf === 'function', 'ShareCard.link/kindOf phải có');
for (const l of LANGS) {
  const S = sandbox(l);
  for (const kind of ['streak', 'result', 'goal', 'day']) {
    const qr = S.link(kind, 'qr', 'abc'), tx = S.link(kind, 'link', 'abc'), u = new URL(tx), q = new URL(qr);
    ok(new TextEncoder().encode(qr).length <= 62, `${l}/${kind}: QR dài ${qr.length} > 62 byte`);
    ok(q.pathname === `/go/${l}/` && q.searchParams.get('utm_source') === 'qr' && q.searchParams.get('utm_campaign') === kind && !q.searchParams.get('c'), `${l}/${kind}: QR sai ${qr}`);
    ok(u.origin === 'https://lexkite.com' && u.pathname === `/go/${l}/` && u.searchParams.get('utm_source') === 'share' && u.searchParams.get('utm_medium') === 'link' && u.searchParams.get('utm_campaign') === kind && u.searchParams.get('c') === 'abc', `${l}/${kind}: link sai ${tx}`);
  }
}
ok(!/[&?]c=/.test(SC.link('day', 'link', 'bad code!')) && !/[&?]c=/.test(SC.link('day', 'link', 'x'.repeat(41))), 'mã không hợp lệ phải bị bỏ');
ok(SC.kindOf({ streak: 5 }) === 'streak' && SC.kindOf({ streak: 1, acc: 90 }) === 'result' && SC.kindOf({ streak: 0, today: 20, goal: 20 }) === 'goal' && SC.kindOf({ streak: 0, today: 3, goal: 20 }) === 'day', 'kindOf sai');
if (errs.length) { console.error('✗ share-link:\n' + errs.map(e => ' - ' + e).join('\n')); process.exit(1); }
console.log(`✓ share-link: ${n} kiểm, 0 lỗi`);
