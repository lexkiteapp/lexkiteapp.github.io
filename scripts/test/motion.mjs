// Test lớp motion video (hàm thuần – không cần Remotion/ffmpeg): scripts/video/motion.mjs + keyclip.mjs (thuần) + synth.mjs + content/video/formats.json
// Phủ: nhịp phụ đề động (từng từ bật đúng mốc) · chuyển cảnh (≥ 12 kiểu, không lặp liền, khung thời gian đúng) · ngắt nhịp ≤ 2,6 s · tự đặt SFX
//   · thước đo visual hook (cổng ≥ 90) · QA màu (cháy/bết, bão hòa, ΔE) · cắt nền flood-fill · kiểm clip stacked · thư viện khuôn ≥ 40 × ≥ 3 theme.
// Chạy: node scripts/test/motion.mjs
import fs from 'fs';
import * as M from '../video/motion.mjs';
import * as K from '../video/keyclip.mjs';
import * as S from '../video/synth.mjs';
import * as V from '../video/lib.mjs';
import * as X from '../video/variants.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const R = new URL('../../', import.meta.url), J = f => JSON.parse(fs.readFileSync(new URL(f, R), 'utf8'));
const formats = J('content/video/formats.json'), sfxMan = J('brand/library/sfx/manifest.json'), manifest0 = () => J('brand/library/manifest.json');

// 1) Phụ đề động: trang 1–3 từ, từ khóa, mốc bật
const words = [...V.evenTiming(V.tokens('Wait, is I\'m agree wrong?'), 0.2, 1.8).map(w => ({ ...w, line: 0 })), ...V.evenTiming(V.tokens('Agree is a verb so we just say I agree.'), 2.1, 4.6).map(w => ({ ...w, line: 1 }))];
const mk = M.markKeywords(words, ['I agree', 'verb']);
ok(mk.filter(w => w.key).map(w => V.norm(w.w)).join(' ') === 'verb i agree', 'đánh dấu từ khóa theo cụm liên tiếp');
const pages = M.captionPages(mk, { style: 'pop-box' });
ok(pages.every(p => p.words.length >= 2 && p.words.length <= 3), 'pop-box: mỗi trang 2–3 từ (không trang 1 từ)');
ok(pages[0].words[0].w === 'Wait,' && pages[0].words.length >= 2, 'trang 1 từ ở dấu phẩy ("Wait,") gộp với cụm sau');
{ const oh = M.captionPages(V.evenTiming(V.tokens('Oh, so heads-up means a short warning about something coming soon.'), 0, 4).map(w => ({ ...w, line: 0 })), { style: 'karaoke-bar' });
  ok(oh.every(p => p.words.length >= 2) && oh[0].words[0].w === 'Oh,', 'karaoke: "Oh," không đứng một mình (lỗi heads-up 18/10)');
  ok(M.captionPages([{ w: 'Wow!', start: 0, end: 0.4, line: 0 }], { style: 'pop-box' }).length === 1, 'câu chỉ 1 từ → được 1 trang 1 từ'); }
ok(pages.every(p => p.words.every(w => Math.abs(w.pop - (w.start - 0.04)) < 1e-6 && w.pop >= p.start - 1e-6)), 'mỗi từ bật trước mốc đọc 40 ms và không sớm hơn trang');
ok(pages.every((p, i) => !pages[i + 1] || pages[i + 1].line !== p.line || p.end <= pages[i + 1].start + 1e-6), 'trang không chồng nhau trong cùng câu');
ok(pages.every((p, i) => !pages[i + 1] || pages[i + 1].line !== p.line || pages[i + 1].start - p.end < 0.05), 'không nháy trống giữa các trang của 1 câu');
ok(M.captionPages(mk, { style: 'mega-word' }).every(p => p.words.length >= 2 && p.words.length <= 3), 'mega-word: 2–3 từ / trang');
ok(M.captionPages(mk, { style: 'karaoke-bar' }).length < pages.length, 'karaoke-bar: trang dài hơn');

// 2) Chuyển cảnh
ok(M.TRANSITIONS.length >= 12 && new Set(M.TRANSITIONS).size === M.TRANSITIONS.length, '≥ 12 chuyển cảnh khác nhau');
ok(formats.transitions.length >= 12 && formats.transitions.every(t => M.TRANSITIONS.includes(t.id) && t.d === M.TRANSITION_DUR[t.id]), 'formats.json transitions khớp thư viện Remotion (id + thời lượng)');
const shots = Array.from({ length: 10 }, (_, i) => ({ line: i, start: +(i * 2.2).toFixed(2), end: +((i + 1) * 2.2).toFixed(2), framing: i === 9 ? 'card' : 'wide' }));
const lines = shots.map((s, i) => ({ start: s.start, end: s.end, beat: ['hook', 'situation', 'explain', 'example', 'tip'][i % 5], emotion: i === 2 ? 'wrong' : null }));
const cuts = M.pickTransitions(shots, { lines, seed: 's1', lead: 'whip-pan' });
ok(cuts.length === 9 && cuts.slice(0, 8).every((c, i) => c.t === shots[i + 1].start && Math.abs(c.to - c.from - c.d) < 1e-6 && Math.abs((c.from + c.to) / 2 - c.t) < 1e-6), 'mỗi cut căn giữa ranh giới cảnh, dài đúng d');
ok(cuts[8].type === 'light-leak' && cuts[8].from >= shots[9].start - 0.1 - 1e-6, 'vào end card: hoà sáng êm, chỉ bắt đầu khi câu CTA đã đọc xong');
ok(cuts[0].type === 'whip-pan', 'cut đầu dùng chuyển cảnh chủ đạo của biến thể');
ok(cuts.every((c, i) => !i || c.type !== cuts[i - 1].type), 'không lặp kiểu ở 2 cut liền nhau');
ok(new Set(cuts.map(c => c.type)).size >= 4, '≥ 4 kiểu chuyển cảnh trong 1 video');
ok(['confetti-burst', 'light-leak', 'circle-reveal'].includes(cuts[8].type), 'vào end card = chuyển cảnh ăn mừng');
ok(cuts.every((c, i) => c.from >= shots[i].start && c.to <= shots[i + 1].end), 'chuyển cảnh nằm gọn trong 2 cảnh kề');
let all = new Set(); for (let k = 0; k < 60; k++) M.pickTransitions(shots, { lines, seed: 'k' + k }).forEach(c => all.add(c.type));
ok(all.size === 12, `60 seed dùng đủ 12 chuyển cảnh (được ${all.size})`);
ok(JSON.stringify(M.pickTransitions(shots, { lines, seed: 'z' })) === JSON.stringify(M.pickTransitions(shots, { lines, seed: 'z' })), 'tất định theo seed');

// 3) Ngắt nhịp: khoảng trống giữa 2 sự kiện hình ≤ 2,6 s
const ev = [1.6, 6.5, 12.9];
const pi = M.patternInterrupts(ev, 16, { endStart: 14, seed: 'p' });
ok(M.maxVisualGap([...ev, ...pi.map(p => p.t)], 14) <= 2.6 + 1e-6, `ngắt nhịp ≤ 2,6 s (lớn nhất ${M.maxVisualGap([...ev, ...pi.map(p => p.t)], 14)})`);
ok(M.maxVisualGap(ev, 14) > 2.6 && pi.length >= 3, 'có chèn khi khoảng trống dài');
ok(pi.every(p => ['punch', 'sticker', 'flash', 'tilt'].includes(p.kind) && (p.kind !== 'sticker' || M.STICKERS.includes(p.sticker))), 'kiểu ngắt nhịp + sticker hợp lệ (bộ SVG Lexkite)');
ok(M.patternInterrupts([1, 3, 5, 7], 9, { endStart: 9 }).length === 0, 'không chèn khi nhịp đã đủ dày');

// 4) Timeline đầy đủ từ state mẫu (không cần file)
const sample = J('content/video/samples/sample.json');
const sl = sample.script.lines.map((l, i) => ({ ...l, dur: 1.8 }));
const lay = V.layoutLines(sl.map(l => l.dur), { gap: 0.3 }); sl.forEach((l, i) => Object.assign(l, lay[i]));
const endStart = +(sl[sl.length - 1].end + 0.4).toFixed(2), duration = +(endStart + 2.2).toFixed(2);
const st = { job: sample, lines: sl, duration, endStart, stage: { time: 'day', segs: [], lines: sl.map(l => ({ emotion: V.lineEmotion(l), actors: [] })) } };
st.shots = V.planShots(sl, { endStart, duration });
st.variant = { format: formats.formats[0], theme: formats.themes.find(t => t.id === formats.formats[0].themes[0]), transition: { id: 'zoom-blur' }, sfx: { id: 'full' }, setting: { time: 'day' } };
const sw = sl.flatMap((l, i) => V.evenTiming(V.tokens(l.text), l.start, l.end).map(w => ({ ...w, line: i })));
const tl = M.buildTimeline({ s: st, words: sw, seed: 'demo', sfxMap: sfxMan.placement });
ok(tl.durationInFrames === Math.round(duration * 30) && tl.format === 'dont-say', 'timeline: thời lượng khung + khuôn');
ok(tl.hook.start === 0 && tl.hook.end >= 1.5 && tl.hook.pattern === 'stop-saying', 'hook phủ ≥ 1,5 s đầu, đúng kiểu khuôn');
ok(tl.cards.some(c => c.kind === 'dont' && /agree/i.test(c.text)) && tl.cards.some(c => c.kind === 'do' && c.text === 'I agree'), 'thẻ ❌ "I\'m agree" / ✅ "I agree"');
ok(tl.cards.every(c => c.end > c.start), 'thẻ có thời lượng dương');
ok(tl.watermark.from === 1.5 && tl.watermark.h >= 36 && tl.watermark.h <= 44 && tl.watermark.x >= tl.safe.left && tl.watermark.y >= tl.safe.top && tl.watermark.until === endStart, 'watermark chữ: hiện từ 1,5 s, cao 36–44 px, trong vùng an toàn, ẩn ở end card');
ok(tl.watermark.opacity >= 0.55 && tl.watermark.opacity <= 0.7, 'watermark mờ 55–70%');
ok(tl.watermark.y + tl.watermark.h < tl.theme.layout.hookY * 1920, 'watermark không đè hook');
ok(M.maxVisualGap([...tl.cuts.map(c => c.t), tl.hook.end, ...tl.cards.map(c => c.start), ...tl.interrupts.map(p => p.t)], endStart) <= 2.6 + 1e-6, 'video mẫu: sự kiện hình mỗi ≤ 2,6 s');
ok(tl.theme.colors.accents.length <= 3, 'tối đa 3 màu nhấn mỗi khung');
const shotA = { actors: [{ x: 540, y: 1760, h: 1000 }] };
ok(M.captionY(shotA, 0.6) !== 0.6 && M.captionY(shotA, 0.6) * 1920 + 95 <= 1920 - M.SAFE.bottom, 'phụ đề tránh dải mặt nhân vật, vẫn trong vùng an toàn dưới');
ok(M.captionY({ actors: [] }, 0.6) === 0.6 && M.captionY({ actors: [{ x: 540, y: 1760, h: 300 }] }, 0.6) === 0.6, 'không vướng mặt → giữ vị trí bố cục');
ok(tl.pages.every(p => p.y > 0.3 && p.y * 1920 <= 1920 - M.SAFE.bottom), 'mọi trang phụ đề có y trong vùng an toàn');
const ss = M.studioStage([{ x: 800, y: 1760, h: 1240 }, { x: 300, y: 1760, h: 1240 }]);
ok(ss.every(a => a.h <= 0.5 * 1920 && a.y - a.h >= 600 && a.x - a.h * 0.25 >= 0 && a.x + a.h * 0.25 <= 1080) && ss[1].x < ss[0].x, 'nền studio: nhân vật vừa khung, không cắt mép, giữ thứ tự trái/phải');
// Round 2: dàn cảnh, máy kiểu phim, phụ đề tránh mặt/thân, xuống dòng, hướng nhìn
{
  const room = { ...V.DEFAULT_ROOM, stand: [{ x: 184, y: 1692 }, { x: 432, y: 1692 }, { x: 895, y: 1692 }], scaleAt: { yFar: 1364, hFar: 281, yNear: 1912, hNear: 902 } };
  const pos = V.stageDialogue(['mia', 'leo'], room);
  ok(pos.mia.x < pos.leo.x && Math.abs(pos.mia.x - 0.36 * 1080) < 2 && pos.leo.x + 0.24 * pos.leo.h <= 1080 - 40 && pos.mia.y === 1692 && pos.mia.h === V.scaleAt(room, 1692), 'dàn cảnh: trục hội thoại 36/64 %, trên hàng điểm đứng, đúng scaleAt, không sát mép');
  const far = { ...room, counter: { x0: 184, x1: 840, top: 1036, base: 1224, standY: 1190 } }, near = { ...room, scaleAt: { yFar: 900, hFar: 500, yNear: 1912, hNear: 1300 }, counter: { x0: 300, x1: 1000, top: 1200, base: 1500, standY: 1460 } };
  const pf = V.stageDialogue(['ama', 'carlos'], far, { roles: { carlos: 'barista' } }), pn = V.stageDialogue(['ama', 'carlos'], near, { roles: { carlos: 'barista' } });
  ok(!pf.carlos.behind && pn.carlos.behind === 'counter' && pn.carlos.y === 1460 && pn.ama.y > 1500 && pn.carlos.x - 0.24 * pn.carlos.h >= 300, 'barista đứng sau quầy khi phòng cho phép (cỡ người đủ lớn), quầy xa → đứng đôi');
  const L = [{ start: 0.2, end: 1.9, beat: 'hook', who: 'ama', emotion: 'wrong', listener: 'carlos' }, { start: 2.2, end: 6.3, beat: 'explain', who: 'carlos', emotion: 'explain', listener: 'ama', punch: true }, { start: 6.6, end: 8.4, beat: 'example', who: 'ama', emotion: 'ask', listener: 'carlos' }, { start: 8.7, end: 11, beat: 'tip', who: 'kit' }, { start: 11.3, end: 13.6, beat: 'react', who: 'carlos', emotion: 'right', listener: 'ama' }];
  const fs2 = V.planFilmShots(L, { endStart: 14, duration: 16 });
  ok(fs2[0].framing === 'two' && !fs2.some(x => x.framing === 'wide') && fs2.some(x => x.framing === 'single') && fs2.some(x => x.framing === 'close'), 'máy: hook trung cảnh đôi → đơn → cận phản ứng, không toàn cảnh khi không đổi bối cảnh');
  ok(fs2.every((x, i) => !i || x.framing === 'card' || x.framing !== fs2[i - 1].framing || (x.focus || null) !== (fs2[i - 1].focus || null)), 'không jump cut (2 cảnh liền cùng khung + cùng người)');
  const fs3 = V.planFilmShots(L.map((l, i) => ({ ...l, sceneChange: i === 2 })), { endStart: 14, duration: 16 }), est = fs3.find(x => x.line === 2);
  ok(est.framing === 'wide' && est.end - est.start <= V.ESTABLISH + 1e-6 && fs3.filter(x => x.framing === 'wide').length === 1, 'toàn cảnh chỉ là cảnh thiết lập ngắn (≤ 1,2 s) khi đổi bối cảnh');
  const fs4 = V.planFilmShots([{ start: 0.2, end: 1.9, beat: 'hook', who: 'ama', listener: 'carlos' }, { start: 2.2, end: 3.4, beat: 'explain', who: 'carlos', listener: 'ama', transitionIn: true }, { start: 3.6, end: 4.6, beat: 'example', who: 'ama', listener: 'carlos' }, { start: 4.8, end: 6, beat: 'example', who: 'carlos', listener: 'ama' }], { endStart: 6.4, duration: 8 });
  ok(fs4.every((x, i) => !i || x.framing === 'card' || x.framing !== fs4[i - 1].framing || (x.focus || null) !== (fs4[i - 1].focus || null)), 'chống jump cut: cảnh trùng khung được gộp hoặc đổi khung');
  ok(fs2.every(x => x.framing !== 'close' || x.focus !== L[x.line].who), 'không bao giờ cận người đang nói');
  ok(fs2.filter(x => x.framing !== 'card').every(x => x.end - x.start >= 0.7 - 1e-6 && x.end - x.start <= 4.05), 'cảnh 0,7–4 s');
  const act = [{ who: 'ama', x: 410, y: 1656, h: 715, figH: 1500 }, { who: 'carlos', x: 670, y: 1656, h: 715, figH: 1570 }], rm = { srcW: 1536 };
  for (const fr of ['two', 'single', 'close']) {
    const c = M.shotCamera({ framing: fr, focus: 'carlos', line: 1 }, act, { room: rm }), cap = M.zoomCap(act, rm);
    const hw = fr === 'two' ? M.CAM.twoHalfW : 0.22, inside = (cm, a) => { const [l] = M.toScreen(cm, a.x - hw * a.h, 0), [r] = M.toScreen(cm, a.x + hw * a.h, 0); return l >= -1 && r <= 1081 ? 'in' : r <= 0 || l >= 1080 ? 'out' : 'cut'; };
    ok(c.to.z <= cap + 1e-6 && c.to.z >= c.from.z && (fr !== 'two' || act.every(a => inside(c.to, a) === 'in')), `máy ${fr}: phóng ≤ giới hạn độ phân giải, đẩy máy vào, cảnh đôi trọn cả hai`);
    if (fr !== 'two') ok(inside(c.to, act[1]) === 'in', `máy ${fr}: người chính trọn khung`);
  }
  { const tl2 = M.buildTimeline({ s: { job: { script: { lines: [] } }, lines: [{ who: 'ama', beat: 'hook', text: 'x', start: 0, end: 1 }, { who: 'carlos', beat: 'explain', text: 'y', start: 1.2, end: 3 }], duration: 5, endStart: 3.4,
      shots: [{ line: 0, start: 0, end: 1.2, framing: 'wide' }, { line: 1, start: 1.2, end: 3.4, framing: 'single', focus: 'carlos' }, { line: -1, start: 3.4, end: 5, framing: 'card' }],
      stage: { time: 'day', segs: [{ from: 0, to: 1, scene: 'cafe', room: { id: 'r' } }], lines: [0, 1].map(i => ({ actors: act.map(a => ({ ...a, role: a.who === ['ama', 'carlos'][i] ? 'speaker' : 'listener' })) })) } },
      words: [], assets: { roomOf: () => ({ src: 'r', srcW: 1536 }), actorOf: a => ({ src: a.who, kind: 'video', figH: 1500, aw: 800, ah: 1500, foot: [400, 1500] }) } });
    const sh1 = tl2.shots[1]; ok(sh1.actors.length >= 1 && sh1.actors.every(a => a.who === 'carlos' || M.toScreen(sh1.cam.to, a.x - 0.22 * a.h, 0)[0] >= 0), 'cảnh đơn: người kia không trọn khung thì không vẽ (không nửa người ở mép)'); }
  const c2 = M.shotCamera({ framing: 'two', line: 1 }, act, { room: rm }).to, y = M.captionSlot(c2, act, 2) * 1920;
  ok(act.every(a => { const t = M.toScreen(c2, a.x, a.y - a.h)[1], hip = M.toScreen(c2, a.x, a.y - 0.48 * a.h)[1]; return y + 120 < t || y - 120 > hip; }) && y <= 1920 - M.SAFE.bottom, 'phụ đề cảnh đôi: không đè mặt/thân, trong vùng an toàn');
  const br = (txt, mc) => { const ws = txt.split(' '), b = M.breakLines(ws, { maxChars: mc }); let k = 0; return b.map(n => { const r = ws.slice(k, k + n); k += n; return r.join(' '); }); };
  const b1 = br('Practice ordering free on lexkite.com', 17);
  ok(b1.length <= 3 && !b1.some(l => /^\w{1,3}$/.test(l)) && !/\bon$/.test(b1[0]), 'xuống dòng: không để "on" đứng riêng / cuối dòng, ≤ 3 dòng');
  const pg = M.captionPages([..."Practice ordering free on lexkite.com".split(' ')].map((w, i) => ({ w, start: i * 0.3, end: i * 0.3 + 0.25, line: 0 })), { style: 'pop-box' });
  ok(!pg.some(p => p.words.length === 1 && p.words[0].w.length <= 3) && !pg.some((p, i) => i < pg.length - 1 && /^on$/i.test(p.words[p.words.length - 1].w)), 'trang phụ đề: từ chức năng đi cùng cụm sau, không trang 1 từ ngắn');
  ok(V.faceRank({ facing: 'right' }, 'right') === 0 && V.faceRank({ facing: 'left', mirrorOk: true }, 'right') === 1 && V.faceRank({ facing: 'front' }, 'right') === 2 && V.faceRank({ facing: 'left' }, 'right') === 3, 'hướng nhìn: ¾ đúng hướng > ¾ lật được (mirrorOk) > chính diện > ngược hướng không lật được');
  const cq = { facing: 'front', mirrorOk: true, facingSegments: [{ from: 0, to: 2.2, facing: 'right' }] };
  ok(JSON.stringify(V.faceOf(cq, 'left')) === JSON.stringify({ facing: 'right', seg: { from: 0, to: 2.2 } }) && V.faceOf(cq, 'front').seg === null && V.faceRank(cq, 'left') === 1, 'hướng theo đoạn: chỉ đoạn 0–2,2 s mang hướng ¾ (lật được), phần còn lại = chính diện');
  const cm = { ...manifest0(), clips: [{ id: 'mia_l', who: 'mia', outfit: 'office', mouth: true, tags: ['talk'], facing: 'left', mirrorOk: true, file: 'a' }, { id: 'leo_l', who: 'leo', outfit: 'office', mouth: false, tags: ['idle'], facing: 'left', file: 'b' }] };
  const st3 = V.buildStage({ job: { topic: 'Email etiquette', script: { scene: 'office', lines: [{ who: 'mia', beat: 'explain', text: 'Say it like this.' }] } }, casting: J('content/video/casting.json'), manifest: cm });
  ok(!st3.lines[0].actors.find(a => a.who === 'mia').flip, 'không lật gương nhân vật có chi tiết lệch (casting.characters.mia.mirrorOk=false) dù clip ghi mirrorOk');
}
// SFX
const ids = new Set(sfxMan.items.map(x => x.id));
ok(tl.sfx.length >= tl.cuts.length && tl.sfx.every(x => ids.has(x.id)), 'SFX đều có trong kho brand/library/sfx');
ok(tl.sfx.some(x => x.id === 'bass-drop' && x.t < 0.1), 'bass drop ở hook');
ok(tl.sfx.some(x => x.id === 'ding') && tl.sfx.some(x => x.id === 'buzz'), 'ding ở ✅, buzz ở ❌');
ok(tl.cuts.every(c => tl.sfx.some(x => Math.abs(x.t - c.t) < 0.4)), 'mỗi chuyển cảnh có SFX');
ok(tl.sfx.every((x, i) => !i || x.t >= tl.sfx[i - 1].t), 'SFX theo thứ tự thời gian');
const pops = tl.sfx.filter(x => x.id === 'pop').map(x => x.t); ok(pops.every((t, i) => !i || t - pops[i - 1] >= 0.35 - 1e-6), 'pop cách nhau ≥ 0,35 s (không rối tai)');
ok(sfxMan.items.length >= 7 && sfxMan.items.every(x => fs.existsSync(new URL('brand/library/' + x.file, R)) && /CC0/.test(x.license)), 'kho SFX đủ file + giấy phép CC0');
ok(['whoosh', 'pop', 'ding', 'swoosh', 'bass-drop', 'keys', 'riser'].every(x => ids.has(x)), 'đủ whoosh/pop/ding/swoosh/bass drop/keys/riser');
const sfxSig = Object.fromEntries(Object.entries(S.SFX).map(([k, d]) => [k, d.make().length]));
ok(Object.entries(sfxSig).every(([k, n]) => Math.abs(n / S.SR - S.SFX[k].dur) < 0.01), 'SFX tổng hợp đúng thời lượng');
ok(formats.music.every(m => S.MUSIC[m.id]), 'mọi nhạc nền trong formats.json là preset tự tổng hợp');
const mu = S.music('lofi-warm', 3); ok(mu.length === 3 * S.SR && mu.reduce((a, x) => Math.max(a, Math.abs(x)), 0) <= 0.71, 'nhạc nền đúng dài, không vỡ tiếng');

// 5) Visual hook metric (khung tổng hợp)
const W0 = 54, H0 = 96;
const frame = (fn) => { const d = new Uint8Array(W0 * H0 * 3); for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) { const c = fn(x, y); d.set(c, (y * W0 + x) * 3); } return { w: W0, h: H0, data: d }; };
const flat = Array.from({ length: 24 }, () => frame(() => [120, 120, 120]));
const lively = Array.from({ length: 24 }, (_, k) => frame((x, y) => (y > 12 && y < 40 && ((x + k) % 6 < 3) ? [255, 255, 255] : y > 60 ? [15, 61, 62] : [20, 16, 14 + ((x * 3 + k * 9) % 120)])));
const tlHook = { hook: { start: 0, end: 1.8, text: 'Stop saying I\'m agree' }, theme: { colors: { text: '#FFFFFF' } } };
const vFlat = M.visualHookScore({ frames: flat, tl: { ...tlHook, hook: { ...tlHook.hook, text: '' } } }), vLive = M.visualHookScore({ frames: lively, tl: tlHook });
ok(vFlat.score < 40, `khung phẳng, không chữ → điểm thấp (${vFlat.score})`);
ok(vLive.score >= 90, `chữ to + chuyển động + tương phản → ≥ 90 (${vLive.score})`);
ok(M.visualHookScore({ frames: lively.map(() => lively[0]), tl: tlHook }).score < 90, 'đứng yên 2 s → không qua cổng 90');
ok(M.visualHookScore({ frames: lively, tl: { ...tlHook, hook: { ...tlHook.hook, end: 0.8 } } }).text < 1, 'hook < 1,5 s → mất điểm chữ');

// 6) QA màu
const g1 = M.gradeStats(frame(() => [254, 252, 236])); ok(g1.clipHi === 1 && !M.gradeVerdict([g1]).ok, 'cháy sáng → trượt');
ok(M.gradeStats(frame((x, y) => (y < 10 ? [255, 255, 255] : [120, 110, 100]))).clipHi === 0, 'chữ trắng UI không tính là cháy sáng');
const g2 = M.gradeStats(frame((x, y) => [80 + x, 120, 100 + y])); ok(g2.clipHi === 0 && g2.clipLo === 0 && M.gradeVerdict([g2]).ok, 'khung cân bằng → đạt');
ok(!M.gradeVerdict([M.gradeStats(frame(() => [255, 0, 0]))]).ok, 'bão hòa tối đa → trượt');
ok(M.gradeVerdict([{ ...M.gradeStats(frame(() => [15, 61, 62])), grade: 'studio' }]).ok && !M.gradeVerdict([M.gradeStats(frame(() => [15, 61, 62]))]).ok, 'nền studio teal đậm hợp lệ, phòng thật thì không');
const skinWarm = M.gradeStats(frame((x, y) => (x > 20 && x < 34 && y > 30 && y < 60 ? [224, 172, 140] : [196, 150, 112])), [0.35, 0.3, 0.65, 0.65]);
const skinTeal = M.gradeStats(frame((x, y) => (x > 20 && x < 34 && y > 30 && y < 60 ? [224, 172, 140] : [20, 110, 130])), [0.35, 0.3, 0.65, 0.65]);
const uiCard = frame((x, y) => (y > 30 && y < 50 ? [255, 252, 240] : [150, 130, 110])); // thẻ kem + grain chạm Y ≥ 250
ok(!M.gradeVerdict([M.gradeStats(uiCard)]).ok && M.gradeStats(uiCard, null, [[0, 30 / 96, 1, 50 / 96]]).clipHi === 0, 'QA màu: vùng thẻ/chữ UI (mask) không tính là phòng cháy sáng');
ok(skinWarm.dE != null && skinWarm.dE < M.GRADE_LIMITS.dEMax, `da trên phòng ấm hòa tông (ΔE ${skinWarm.dE})`);
ok(skinTeal.dE != null && skinTeal.dE > M.GRADE_LIMITS.dEMax, `da trên phòng lạnh tách lớp (ΔE ${skinTeal.dE})`);
ok(Math.abs(M.deltaE(M.rgb2lab(255, 255, 255), [100, 0, 0])) < 0.5, 'rgb2lab trắng ≈ L100');
ok(M.gradeFor({ time: 'night', hasRoom: true }) === 'night' && M.gradeFor({ time: 'day', hasRoom: false }) === 'studio', 'grade theo giờ / có phòng');

// 7) Cắt nền + kiểm clip stacked
const kw = 40, kh = 60, img = new Uint8Array(kw * kh * 3).fill(246);
for (let y = 10; y < 55; y++) for (let x = 12; x < 28; x++) { const edge = x === 12 || x === 27 || y === 10 || y === 54; img.set(edge ? [20, 20, 20] : (y > 20 && y < 24 && x > 15 && x < 25 ? [250, 250, 250] : [229, 80, 47]), (y * kw + x) * 3); }
const al = K.floodKey(img, kw, kh);
ok(al[0] === 0 && al[(30 * kw) + 20] === 255, 'nền mép → trong suốt, thân → đặc');
ok(al[22 * kw + 20] === 255, 'mảng trắng bên trong viền (mắt/giày) không bị ăn');
const bx = K.alphaBox(al, kw, kh); ok(bx && bx.y1 === 54 && bx.figH === 44 && Math.abs(bx.foot[0] - 19.5) <= 1, 'đo chân + chiều cao người từ alpha');
const st2 = new Uint8Array(kw * kh * 3); for (let i = 0; i < kw * kh; i++) { const y = Math.floor(i / kw), v = y >= kh / 2 ? (i % kw > 10 && i % kw < 30 ? 255 : 0) : 128; st2.set(y >= kh / 2 ? [v, v, v] : [200, 90, 60], i * 3); }
ok(K.isStackedMask(st2, kw, kh).ok, 'clip stacked đúng: nửa dưới là mặt nạ');
ok(!K.isStackedMask(img, kw, kh).ok, 'clip thường (nửa dưới có màu) → bị từ chối, không dựng bóng ma');

// 7b) Round 3 (video-polish): nhịp 30 fps (bỏ khung lặp + nội suy), cỡ nhân vật, phụ đề cố định, hook không lặp, đồng hồ clip
{
  const f = v => new Uint8Array(16).fill(v), fr = [f(0), f(1), f(40), f(41), f(90), f(90), f(90), f(90), f(90), f(140)]; // 1,3: lặp "on twos" · 5–8: đứng yên
  const keep = K.uniqueFrames(fr, { thr: 2, maxRun: 3 });
  ok(JSON.stringify(keep) === JSON.stringify([0, 2, 4, 8, 9]), `bỏ khung lặp "on twos", đứng yên giữ ≥ 1/4 khung, luôn giữ khung cuối (${keep})`);
  const hold = K.holdFrames([0, 2, 4], [10, 500], { srcFps: 24, fps: 30, n: 8 });
  ok(JSON.stringify(hold) === JSON.stringify([3, 4]), `khoảng vung tay quá nhanh → khung gốc gần nhất, không nội suy "bóng ma" (${hold})`);
  ok(K.dropExpr(5, [0, 2, 4]) === "select='not(eq(n,1)+eq(n,3))'," && K.dropExpr(3, [0, 1, 2]) === '', 'biểu thức bỏ khung');
  ok(/\[yl\]\[m\]mergeplanes=0x001010:yuv444p/.test(K.alphaGraph({ ow: 10, oh: 20 })) && (K.alphaGraph({ ow: 10, oh: 20 }).match(/minterpolate/g) || []).length === 2, 'mặt nạ đi chung mặt Y với màu qua minterpolate (vector giống hệt → mép alpha khớp)');
  // nhân vật to: phòng thật office-01-day (h 653 @ y 1692) – trung cảnh đôi/đơn: người cao 60–85 % khung, mặt dưới hook, trên phụ đề
  const act = [{ who: 'diane', x: 389, y: 1692, h: 653, figH: 1547 }, { who: 'mia', x: 691, y: 1692, h: 653, figH: 1727 }];
  for (const fr of ['two', 'single']) { const c = M.shotCamera({ framing: fr, focus: 'mia', line: 2 }, act, { room: { srcW: 1536 }, topLimit: 700, capTop: 1300 }).to, pct = 653 * c.z / 1920;
    ok(pct >= 0.6 && pct <= 0.85, `máy ${fr}: người cao ${(pct * 100).toFixed(0)} % khung (60–85 %)`);
    ok(act.every(a => { const fb = M.faceBox(a), t = M.toScreen(c, fb[0], fb[1])[1], b = M.toScreen(c, fb[2], fb[3])[1]; return (fr !== 'two' && a.who !== 'mia') || (t >= 700 && b <= 1300); }), `máy ${fr}: mặt nằm giữa đáy hook (700) và đỉnh phụ đề (1300)`); }
  const sc = { hook: 'Word of the day', keywords: ['heads-up'], lines: [] }, fmtW = formats.formats.find(x => x.id === 'word-of-day');
  ok(M.hookTitle(sc, fmtW, [{ text: 'Quick heads-up.' }]) === 'heads-up', 'hook không lặp huy hiệu: "WORD OF THE DAY" + tiêu đề = từ khóa');
  ok(!M.isQuiz(fmtW) && M.isQuiz(formats.formats.find(x => x.id === 'quiz-3s')) && M.isQuiz(formats.formats.find(x => x.id === 'quiz-abc')), 'đồng hồ đếm chỉ ở khuôn đố');
  const lines2 = [{ who: 'diane', beat: 'hook', text: 'Quick heads-up.', start: 0.2, end: 1.4 }, { who: 'mia', beat: 'situation', text: 'Heads up?', start: 1.7, end: 2.6 }, { who: 'mia', beat: 'explain', text: 'Oh, so heads-up means a short warning.', start: 2.9, end: 5.6 }];
  const actors2 = i => act.map(a => ({ ...a, role: a.who === lines2[i].who ? 'speaker' : 'listener', asset: { file: `${a.who}-${a.who === 'diane' ? (i === 0 ? 'x' : 'y') : 'z'}` } }));
  const s2 = { job: { script: { hook: 'Word of the day', keywords: ['heads-up'], lines: lines2 } }, lines: lines2, duration: 8, endStart: 6, stage: { time: 'day', segs: [{ from: 0, to: 2, scene: 'office', room: { id: 'r' } }], lines: [0, 1, 2].map(i => ({ actors: actors2(i) })) },
    variant: { format: fmtW, theme: formats.themes.find(t => t.caption === 'karaoke-bar'), transition: { id: 'zoom-blur' }, sfx: { id: 'full' }, setting: { time: 'day' } } };
  s2.shots = V.planFilmShots(lines2.map((l, i) => ({ ...l, listener: l.who === 'mia' ? 'diane' : 'mia', transitionIn: i === 1 })), { endStart: 6, duration: 8 });
  const w2 = lines2.flatMap((l, i) => V.evenTiming(V.tokens(l.text), l.start, l.end).map(w => ({ ...w, line: i })));
  const tl2 = M.buildTimeline({ s: s2, words: w2, assets: { roomOf: () => ({ src: 'r', srcW: 1536 }), actorOf: a => ({ src: a.asset.file, kind: 'video', figH: 1547, aw: 984, ah: 1562, foot: [453, 1558], dur: 4.8 }) } });
  ok(tl2.hook.text === 'heads-up' && tl2.hook.countdown === false, `hook: "${tl2.hook.text}", không số đếm ở khuôn không phải đố`);
  ok(new Set(tl2.pages.map(p => Math.round(p.y * 1920 + p.half))).size === 1 && tl2.pages.every(p => p.y * 1920 + p.half <= 1920 - M.SAFE.bottom), 'phụ đề canh 1 đường đáy cố định, trên vùng UI nền tảng');
  ok(tl2.pages.every(p => p.words.length >= 2 || lines2[p.line].text.split(' ').length === 1), 'không trang phụ đề 1 từ');
  const t0 = who => tl2.shots.filter(x => x.actors.length).map(x => (x.actors.find(a => a.who === who) || {}).t0).filter(x => x != null);
  ok(new Set(t0('mia')).size === 1 && t0('mia')[0] === 0, 'đồng hồ clip: cùng clip qua các câu liên tiếp → chạy liền (không nhảy tư thế)');
  ok(new Set(t0('diane')).size === 2 && t0('diane').includes(+(1.7 - M.CLIP_LEAD).toFixed(3)), 'đổi clip → clip mới bắt đầu từ khung 0 ngay trước câu (tư thế gốc chung)');
  ok(M.layoutGate(JSON.parse(JSON.stringify(tl2)), lines2).ok, 'cổng layout (gồm: chữ không đè mặt, phụ đề 1 vị trí) đạt: ' + M.layoutGate(JSON.parse(JSON.stringify(tl2)), lines2).bad.slice(0, 2).join(' | '));
  const bad = JSON.parse(JSON.stringify(tl2)); bad.pages[1].y -= 0.2;
  ok(M.layoutGate(bad, lines2).capJumps.length === 1, 'cổng layout bắt phụ đề nhảy vị trí');
}

// 8) Thư viện khuôn
ok(formats.formats.length >= 40, `≥ 40 khuôn (${formats.formats.length})`);
const themeIds = new Set(formats.themes.map(t => t.id));
ok(formats.formats.every(f => (f.themes || []).length >= 3 && f.themes.every(t => themeIds.has(t)) && new Set(f.themes).size === f.themes.length), 'mỗi khuôn ≥ 3 theme hợp lệ, không trùng');
ok(formats.themes.every(t => M.CAPTION_STYLES.includes(t.caption) && M.COLOR_THEMES[t.color] && M.LAYOUTS[t.layout]), 'theme = kiểu chữ × màu × bố cục có thật');
ok(formats.formats.every(f => f.hook && M.HOOK_PATTERNS.includes(f.hook.pattern) && f.hook.badge && f.payoff && M.PAYOFFS.includes(f.payoff.type)), 'mỗi khuôn có hook pattern + payoff hợp lệ');
ok(new Set(formats.formats.map(f => `${f.hook.pattern}|${f.hook.badge}|${f.payoff.type}`)).size === formats.formats.length, 'hook + payoff khác nhau giữa các khuôn');
ok(new Set(formats.formats.map(f => f.hook.pattern)).size >= 12 && new Set(formats.formats.map(f => f.payoff.type)).size >= 8, 'dùng đủ 12 kiểu hook, 8 kiểu payoff');
for (const [k, c] of Object.entries(M.COLOR_THEMES)) ok(V.contrast(c.text, c.text === '#FFFFFF' ? '#14100E' : '#FFFFFF') >= 4.5 && c.accents.length <= 3, `theme ${k}: chữ đủ tương phản + ≤ 3 màu nhấn`);
ok(V.contrast('#14100E', '#FFC94A') >= 4.5, 'chữ mực trên hộp vàng (từ khóa) ≥ 4.5');
const casting = J('content/video/casting.json'), manifest = J('brand/library/manifest.json');
const vv = X.pickVariant({ job: sample, formats, casting, manifest, history: [], seed: 'th', date: new Date('2026-10-17T00:00:00Z') });
ok(vv.theme && vv.format.themes.includes(vv.theme.id) && vv.fp.theme === vv.theme.id, 'biến thể chọn theme trong bộ của khuôn, ghi vào vân tay');

if (fails) { console.log(`✗ motion: ${fails} lỗi`); process.exit(1); }
console.log('✓ motion: phụ đề động, 12 chuyển cảnh, ngắt nhịp ≤ 2,6 s, SFX tự đặt, visual hook ≥ 90, QA màu, cắt nền, ≥ 40 khuôn × 3 theme đều đạt');
