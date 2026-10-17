// Test cổng LAYOUT chữ overlay (scripts/video/motion.mjs layoutGate – bước qa của render.mjs) – hàm thuần, KHÔNG dựng video.
// Phủ: (1) props cũ tái hiện 2 lỗi khung hình 17/10 phải TRƯỢT cổng: hook "SPOT THE MISTAKE / HOW MUCH COST?" bị chữ karaoke "WAIT," đè,
//   và "on Friday?" hiện thành "onFriday?" (từ đang đọc phóng to ăn hết khe chữ) · (2) timeline mới của MỌI kịch bản mẫu × MỌI theme của khuôn
//   (dàn 2 người trong phòng, máy kiểu phim) đạt cổng: không 2 lớp chữ giao nhau, trong vùng an toàn 9:16, chữ phụ đề = kịch bản.
// Chạy: node scripts/test/video-layout.mjs
import fs from 'fs';
import * as M from '../video/motion.mjs';
import * as V from '../video/lib.mjs';

const R = new URL('../../', import.meta.url), J = f => JSON.parse(fs.readFileSync(new URL(f, R), 'utf8'));
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } };
const formats = J('content/video/formats.json'), themeOf = id => formats.themes.find(t => t.id === id);

// ---------- 1) Tái hiện lỗi cũ (props như bản dựng CI 17/10) → cổng phải bắt ----------
{
  const theme = { ...themeOf('mega-mint'), colors: M.COLOR_THEMES['mint-fresh'], layout: M.LAYOUTS['lower-third'] };
  const hook = { pattern: 'challenge', badge: 'SPOT THE MISTAKE', text: '"HOW MUCH COST"?', start: 0, end: 1.9 };
  const hb = M.hookLayout(hook, theme.layout).box;
  // phụ đề cũ: trang "WAIT," đặt ở dải trên đầu nhân vật (captionSlot cũ không biết hook) – y giữa khối tiêu đề
  const old = { w: 1080, h: 1920, fps: 30, duration: 6, theme, hook, cards: [], safe: M.SAFE, endCard: { start: 5 },
    pages: [{ line: 0, start: 0.16, end: 0.9, y: ((hb[1] + hb[3]) / 2) / 1920, breaks: [1], words: [{ w: 'Wait,', start: 0.2, end: 0.6 }] },
      { line: 1, start: 2.2, end: 3.4, y: 0.7, breaks: [2], words: [{ w: 'on', start: 2.2, end: 2.5 }, { w: 'Friday?', start: 2.5, end: 3.2 }] }] };
  const g0 = M.layoutGate(old, [{ text: 'Wait,' }, { text: 'on Friday?' }]);
  ok(!g0.ok && g0.overlaps.some(x => /hook/.test(x) && /caption/.test(x)), 'props cũ: hook bị phụ đề "WAIT," đè → cổng TRƯỢT');
  const old2 = { ...old, theme: { ...theme, caption: 'bounce-outline' } };
  ok(M.layoutGate(old2, [{ text: 'Wait,' }, { text: 'on Friday?' }]).joins.some(x => /onFriday\?/.test(x)), 'props cũ: "on Friday?" hiện "onFriday?" (margin 12 px, phóng 1,24) → cổng TRƯỢT');
  // cùng trang nhưng bố cục mới (gap/maxS tính sẵn) → đúng dấu cách
  const p = { breaks: [2], words: [{ w: 'on' }, { w: 'Friday?' }] }, L = M.captionLayout(p, 'bounce-outline');
  const pNew = { ...p, ...L, words: p.words.map((w, i) => ({ ...w, maxS: L.maxS[i] })) };
  ok(M.renderedCaption([pNew], 'bounce-outline') === 'on Friday?', 'bố cục mới: "on Friday?" giữ dấu cách');
  ok(L.maxS.every((s, i) => (s - 1) * L.widths[i] / 2 * 2 <= 2 * L.gap - L.stroke - L.minGap + 1), 'độ phóng tối đa không ăn quá khe chữ');
  const big = M.captionLayout({ breaks: [1], words: [{ w: 'BANDWIDTH,' }] }, 'mega-word');
  ok(big.width <= 1080 - M.OVERLAY.left - M.OVERLAY.right && big.font < 150, `mega-word dài tự thu cỡ (${big.font}px) cho vừa 880 px`);
  const hk2 = M.hookLayout({ pattern: 'countdown-list', badge: '1 PHRASAL VERB, 30 SECONDS', text: 'IS IT "HOW MUCH IS THESE"?' }, M.LAYOUTS['top-hook']);
  ok(hk2.lines.length <= 2 && hk2.box[0] >= M.SAFE.left && hk2.box[2] <= 1080 - M.SAFE.right && hk2.box[1] >= M.SAFE.top - 30, `hook dài: ≤ 2 dòng (${hk2.lines.join('+')}), badge thu cỡ ${hk2.badgeFs}px, trong vùng an toàn`);
}

// ---------- 2) Mọi kịch bản mẫu × mọi theme: timeline mới đạt cổng ----------
const casting = J('content/video/casting.json');
const room = { ...V.DEFAULT_ROOM, id: 'office-test', srcW: 1536 };
const samples = fs.readdirSync(new URL('content/video/samples/', R)).filter(f => f.endsWith('.json'));
let runs = 0;
for (const f of samples) {
  const job = J(`content/video/samples/${f}`), sc = job.script || job;
  const fmt = formats.formats.find(x => x.id === sc.format_id) || formats.formats[0];
  const sl = sc.lines.map(l => ({ ...l, dur: l.beat === 'hook' ? V.hookEstSec(l.text) : V.estLineSec(l.text) }));
  const lay = V.layoutLines(sl.map(l => l.dur), { lead: V.LEAD, gap: V.LINE_GAP }); sl.forEach((l, i) => Object.assign(l, lay[i]));
  const endStart = +(sl[sl.length - 1].end + 0.4).toFixed(2), duration = +(endStart + V.END_CARD).toFixed(2);
  const cast = [...new Set(sl.map(l => l.who).filter(w => w !== 'kit'))], pos = V.stageDialogue(cast, room);
  const stageLines = sl.map(l => ({ emotion: V.lineEmotion(l), actors: cast.map(who => ({ who, role: who === l.who ? 'speaker' : 'listener', ...pos[who] })) }));
  const shots = V.planFilmShots(sl.map((l, i) => ({ ...l, emotion: stageLines[i].emotion, listener: (stageLines[i].actors.find(a => a.role === 'listener' && l.who !== 'kit') || {}).who || null, transitionIn: i === 1 })), { endStart, duration });
  const words = sl.flatMap((l, i) => V.evenTiming(V.tokens(l.text), l.start, l.end).map(w => ({ ...w, line: i })));
  for (const th of fmt.themes) {
    const s = { job: { ...job, script: sc }, lines: sl, duration, endStart, shots, stage: { time: 'day', segs: [{ from: 0, to: sl.length - 1, scene: sc.scene || 'office', room }], lines: stageLines },
      variant: { format: fmt, theme: themeOf(th), transition: { id: 'zoom-blur' }, sfx: { id: 'full' }, setting: { time: 'day' } } };
    const tl = M.buildTimeline({ s, words, seed: f + th, assets: { roomOf: () => ({ src: 'room.png', srcW: 1536 }), actorOf: a => ({ src: a.who, kind: 'video', figH: 1500, aw: 800, ah: 1500, foot: [400, 1500] }) } });
    const g = M.layoutGate(JSON.parse(JSON.stringify(tl)), sl); runs++;
    ok(g.ok, `${f} × ${th}: ${g.bad.slice(0, 3).join(' | ')}`);
    ok(tl.pages.every(p => p.gap != null && p.words.every(w => w.maxS >= 1)), `${f} × ${th}: trang phụ đề có gap/maxS cho Remotion`);
  }
}
ok(casting && runs >= samples.length * 3, `đủ tổ hợp (${runs})`);
if (fails) { console.log(`✗ video-layout: ${fails} lỗi`); process.exit(1); }
console.log(`✓ video-layout: cổng bắt lỗi hook↔karaoke + "onFriday?" cũ; ${runs} tổ hợp mẫu × theme không chữ chồng chữ, trong vùng an toàn, đúng dấu cách`);
