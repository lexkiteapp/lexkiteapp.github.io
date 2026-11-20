// 💬 SayText (web/js/say-text.js): chữ hiện theo từng từ khi giáo viên nói. Cổng: không đổi nội dung, không giấu chữ mãi, tôn trọng giảm chuyển động, bám mốc miệng.
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const boot = ({ reduced = false, webdriver = true, flag = '1' } = {}) => {
  const dom = new JSDOM('<!doctype html><html lang="vi"><head></head><body><p id="a"> “Chào buổi sáng! Hôm nay còn 5 việc.” </p><p id="b"><b>Ama</b> Hello there, friend.</p><p id="c" lang="ja">今日は五つの課題があります。</p></body></html>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://lexkite.test/app/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: reduced });
  Object.defineProperty(w.navigator, 'webdriver', { value: webdriver, configurable: true });
  if (flag) w.localStorage.setItem('lk.saytext', flag);
  w.eval(fs.readFileSync('web/js/say-text.js', 'utf8'));
  return w;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const on = el => el.querySelectorAll('.sw.on').length, all = el => el.querySelectorAll('.sw').length;

{ const w = boot(), d = w.document, p = d.getElementById('a'), before = p.textContent, c = w.SayText.prep(p, { wait: 0 });
  ok(p.textContent === before, 'chia từ giữ nguyên từng ký tự (dấu tiếng Việt, ngoặc, khoảng trắng)');
  ok(all(p) === 8 && on(p) === 0, 'chia theo từ, chưa nói thì chữ đang chờ');
  ok(/\.sw\{opacity:0/.test(d.getElementById('saytext-css').textContent) && !/\.sw[^}]*(display|height|width)/.test(d.getElementById('saytext-css').textContent), 'chữ chờ chỉ mờ, không xô bố cục');
  c.clock(150); await sleep(60); const mid = on(p); ok(mid > 0 && mid < 8, 'đồng hồ: đang nói hiện một phần'); await sleep(250); ok(on(p) === 8, 'đồng hồ: hết thời lượng hiện đủ');
  const again = w.SayText.prep(p, { wait: 0 }); ok(all(p) === 8 && on(p) === 0 && p.textContent === before, 'nói lại: dùng lại từ đã chia, không chia chồng'); again.all(); ok(on(p) === 8, 'all() hiện đủ');
}
{ const w = boot(), p = w.document.getElementById('b'); const c = w.SayText.prep(p, { skip: 'b', wait: 0 }); ok(!p.querySelector('b .sw') && all(p) === 3, 'tên người nói hiện sẵn, không chạy chữ'); c.all(); }
{ const w = boot(), p = w.document.getElementById('c'), c = w.SayText.prep(p, { wait: 0 }); ok(all(p) > 2, 'tiếng viết liền (Nhật): tách từ bằng Segmenter'); ok(p.textContent === '今日は五つの課題があります。', 'tiếng Nhật giữ nguyên chữ'); c.all(); }
{ const w = boot(), p = w.document.getElementById('a'); w.SayText.prep(p, { wait: 40 }); await sleep(100); ok(on(p) === 8, 'không ai bắt đầu nói → tự hiện hết, không giấu chữ mãi'); }
{ const w = boot(), p = w.document.getElementById('b'); const c = w.SayText.prep(p, { skip: 'b', wait: 0 });
  const a = { currentTime: 0, duration: 2, ended: false };
  c.audio(a, { dur: 2, cues: [{ value: 'X', start: 0, end: 1 }, { value: 'B', start: 1, end: 2 }] });
  a.currentTime = 0.5; await sleep(60); ok(on(p) === 1, 'bám mốc miệng: đoạn lặng đầu câu thì mới hiện từ đầu'); 
  a.currentTime = 1.9; await sleep(60); ok(on(p) === 3, 'bám mốc miệng: cuối đoạn có tiếng hiện đủ từ');
  a.ended = true; await sleep(60); c.all(); }
{ const w = boot(), p = w.document.getElementById('a'), c = w.SayText.prep(p, { wait: 0 }); const a = { currentTime: 0, duration: 2, ended: true }; c.audio(a, null); await sleep(60); ok(on(p) === 8, 'tiếng kết thúc → hiện đủ'); }
ok(boot({ reduced: true }).SayText.prep(boot({ reduced: true }).document.getElementById('a')) === null, 'giảm chuyển động: không hiệu ứng');
{ const w = boot({ flag: '' }); ok(w.SayText.prep(w.document.getElementById('a')) === null, 'máy kiểm thử mặc định tắt (ảnh chụp ổn định), lk.saytext=1 mới bật'); }
if (fails) { console.error(fails + ' lỗi'); process.exit(1); } console.log('say-text OK'); process.exit(0);
