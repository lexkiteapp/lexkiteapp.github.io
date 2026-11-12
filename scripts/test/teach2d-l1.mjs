// Clip L1 (docs/VIDEO-TEACH2D.md): lang của clip == cfg.lang của page; ≤ 2 bài/ngày trong 09–21 giờ địa phương; mọi tập L1 đủ chữ bản địa + cổng native-qa xanh.
// Chạy: node scripts/test/teach2d-l1.mjs (không mạng; dịch ngược gtx chạy ở teach-video preqc)
import fs from 'node:fs';
import * as D from '../../functions/api/_distribution.js';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const rows = JSON.parse(fs.readFileSync('content/video/teach2d/l1.json', 'utf8')).rows, qa = JSON.parse(fs.readFileSync('content/video/teach2d/l1-qa.json', 'utf8'));
const TZ = { vi: 'Asia/Ho_Chi_Minh', pt: 'America/Sao_Paulo', es: 'Europe/Madrid', de: 'Europe/Berlin', fr: 'Europe/Paris', ja: 'Asia/Tokyo', ko: 'Asia/Seoul', zh: 'Asia/Shanghai', hi: 'Asia/Kolkata', ar: 'Asia/Riyadh', tr: 'Europe/Istanbul', ru: 'Europe/Moscow' };
// page như D1 yt_chan_cfg (11 vi, 13 pt, 14 es, 15 de, 16 fr, 17 hi, 18 ar, 19 tr, 20 ru; ja/ko/zh theo page-kit) + page EN chung
const cfgs = { 'gc-fb-en': D.normCfg({ lang: 'en' }), ...Object.fromEntries(Object.entries(TZ).map(([l, tz]) => [`gc-fb-${l}`, D.normCfg({ lang: l, tz })])) };
const rules = D.implicitSocialRules([], cfgs);
for (const r of rows) {
  const clip = { id: r.id, type: 'short', lang: r.lang }, routes = D.routeAll(rules, cfgs, clip, null);
  ok(routes.facebook_page ? routes.facebook_page.channel_id === `gc-fb-${r.lang}` : Object.values(routes).every(x => x.channel_id === `gc-fb-${r.lang}`), `${r.id}: clip lang=${r.lang} phải chỉ đi page ${r.lang}: ${JSON.stringify(routes)}`);
  for (const [l, id] of Object.entries(Object.fromEntries(Object.keys(TZ).map(x => [x, `gc-fb-${x}`])))) if (l !== r.lang) ok(!D.allowed(cfgs[id], clip), `${r.id}: page ${l} không được nhận clip ${r.lang}`);
  const N = r.in.native; ok(N.hook && N.tip && N.caption && N.comment && N.hashtags.length >= 3, `${r.id}: thiếu chữ bản địa`);
  ok(qa[r.id] && qa[r.id].ok && qa[r.id].lang === r.lang, `${r.id}: l1-qa.json chưa xanh (node scripts/video/teach2d/native-qa.mjs --write)`);
}
// lịch: ≤ 2 bài/ngày/page, trong 09–21 giờ địa phương
for (const [l, tz] of Object.entries(TZ)) {
  const cfg = cfgs[`gc-fb-${l}`], now = Date.parse('2026-11-12T00:00:00Z'), clips = rows.filter(r => r.lang === l).concat(rows.filter(r => r.lang === l)).map((r, i) => ({ id: r.id + i, title: 't' + i, cover: 'c' + i }));
  const { slots } = D.schedule({ clips, cfg, now }), per = {};
  for (const s of slots) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(s.ms), g = k => p.find(x => x.type === k).value;
    const day = `${g('year')}-${g('month')}-${g('day')}`, h = +g('hour') % 24 + +g('minute') / 60; per[day] = (per[day] || 0) + 1;
    ok(h >= 9 && h <= 21, `${l}: bài ${new Date(s.ms).toISOString()} ngoài 09–21h ${tz} (${h})`);
  }
  ok(slots.length > 0 && Object.values(per).every(n => n <= 2), `${l}: quá 2 bài/ngày ${JSON.stringify(per)}`);
}
if (fails) { console.log(`teach2d-l1: ${fails} lỗi`); process.exit(1); } console.log('teach2d-l1: ok');
