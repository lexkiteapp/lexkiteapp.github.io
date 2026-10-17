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
const formats = J('content/video/formats.json'), sfxMan = J('brand/library/sfx/manifest.json');

// 1) Phụ đề động: trang 1–3 từ, từ khóa, mốc bật
const words = [...V.evenTiming(V.tokens('Wait, is I\'m agree wrong?'), 0.2, 1.8).map(w => ({ ...w, line: 0 })), ...V.evenTiming(V.tokens('Agree is a verb so we just say I agree.'), 2.1, 4.6).map(w => ({ ...w, line: 1 }))];
const mk = M.markKeywords(words, ['I agree', 'verb']);
ok(mk.filter(w => w.key).map(w => V.norm(w.w)).join(' ') === 'verb i agree', 'đánh dấu từ khóa theo cụm liên tiếp');
const pages = M.captionPages(mk, { style: 'pop-box' });
ok(pages.every(p => p.words.length >= 1 && p.words.length <= 3), 'pop-box: mỗi trang 1–3 từ');
ok(pages[0].words[0].w === 'Wait,' && pages[0].words.length === 1, 'ngắt trang ở dấu phẩy');
ok(pages.every(p => p.words.every(w => Math.abs(w.pop - (w.start - 0.04)) < 1e-6 && w.pop >= p.start - 1e-6)), 'mỗi từ bật trước mốc đọc 40 ms và không sớm hơn trang');
ok(pages.every((p, i) => !pages[i + 1] || pages[i + 1].line !== p.line || p.end <= pages[i + 1].start + 1e-6), 'trang không chồng nhau trong cùng câu');
ok(pages.every((p, i) => !pages[i + 1] || pages[i + 1].line !== p.line || pages[i + 1].start - p.end < 0.05), 'không nháy trống giữa các trang của 1 câu');
ok(M.captionPages(mk, { style: 'mega-word' }).every(p => p.words.length === 1), 'mega-word: 1 từ / trang');
ok(M.captionPages(mk, { style: 'karaoke-bar' }).length < pages.length, 'karaoke-bar: trang dài hơn');

// 2) Chuyển cảnh
ok(M.TRANSITIONS.length >= 12 && new Set(M.TRANSITIONS).size === M.TRANSITIONS.length, '≥ 12 chuyển cảnh khác nhau');
ok(formats.transitions.length >= 12 && formats.transitions.every(t => M.TRANSITIONS.includes(t.id) && t.d === M.TRANSITION_DUR[t.id]), 'formats.json transitions khớp thư viện Remotion (id + thời lượng)');
const shots = Array.from({ length: 10 }, (_, i) => ({ line: i, start: +(i * 2.2).toFixed(2), end: +((i + 1) * 2.2).toFixed(2), framing: i === 9 ? 'card' : 'wide' }));
const lines = shots.map((s, i) => ({ start: s.start, end: s.end, beat: ['hook', 'situation', 'explain', 'example', 'tip'][i % 5], emotion: i === 2 ? 'wrong' : null }));
const cuts = M.pickTransitions(shots, { lines, seed: 's1', lead: 'whip-pan' });
ok(cuts.length === 9 && cuts.every((c, i) => c.t === shots[i + 1].start && Math.abs(c.to - c.from - c.d) < 1e-6 && Math.abs((c.from + c.to) / 2 - c.t) < 1e-6), 'mỗi cut căn giữa ranh giới cảnh, dài đúng d');
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
