// Test dây chuyền dựng video (hàm thuần – không cần ffmpeg/Kokoro/whisper/Rhubarb): scripts/video/lib.mjs + variants.mjs
// Phủ: căn mốc từ (whisper ↔ kịch bản, dự phòng chia đều) · phụ đề ASS karaoke · đo QA · cổng nhất quán · bộ sinh biến thể (1.000 lượt không trùng theo luật) · độ phủ
// Chạy: node scripts/test/video.mjs
import fs from 'fs';
import * as V from '../video/lib.mjs';
import * as X from '../video/variants.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const R = new URL('../../', import.meta.url), J = f => JSON.parse(fs.readFileSync(new URL(f, R), 'utf8'));
const casting = J('content/video/casting.json'), manifest = J('brand/library/manifest.json'), formats = J('content/video/formats.json'), sample = J('content/video/samples/sample.json');

// 1) Mốc từ
let ev = V.evenTiming(['a', 'longer', 'word'], 1, 4);
ok(ev[0].start === 1 && Math.abs(ev[2].end - 4) < 0.02 && ev.every((x, i) => !i || x.start >= ev[i - 1].end - 0.01), 'chia đều phủ đúng khoảng, tăng dần');
ok(ev[1].end - ev[1].start > ev[0].end - ev[0].start, 'từ dài được nhiều thời gian hơn');
const sw = V.tokens('Wait, is "I\'m agree" wrong?');
let m = V.matchWords(sw, [{ w: 'Wait', start: 0.1, end: 0.4 }, { w: 'is', start: 0.45, end: 0.6 }, { w: "I'm", start: 0.62, end: 0.8 }, { w: 'agree', start: 0.82, end: 1.2 }, { w: 'wrong', start: 1.25, end: 1.6 }], 1.8);
ok(m.method === 'whisper' && m.matched === 1 && m.words[3].start === 0.82 && m.words[0].w === 'Wait,', 'khớp whisper đủ từ, giữ chữ gốc kịch bản');
m = V.matchWords(['I', 'agree', 'with', 'your', 'plan'], [{ w: 'I', start: 0, end: 0.1 }, { w: 'agree', start: 0.12, end: 0.5 }, { w: 'plan', start: 1.0, end: 1.3 }], 1.5);
ok(m.method === 'whisper' && m.words[2].start >= 0.5 && m.words[3].end <= 1.0 && m.words[2].start < m.words[3].start, 'từ hụt nội suy giữa 2 mốc kề');
m = V.matchWords(['completely', 'different', 'words', 'here'], [{ w: 'hello', start: 0.2, end: 0.5 }, { w: 'world', start: 0.6, end: 1.1 }], 1.5);
ok(m.method === 'even' && m.words.length === 4 && m.words[0].start === 0.2 && m.words[3].end <= 1.11, 'khớp < 50% → chia đều trong khoảng có tiếng');
ok(V.matchWords(['colour'], [{ w: 'color', start: 0, end: 0.3 }], 0.5).matched === 1, 'chấp nhận lệch 1 ký tự (từ ≥ 4)');
const lay = V.layoutLines([1, 2], { lead: 0.2, gap: 0.3 }); ok(lay[1].start === 1.5 && lay[1].end === 3.5, 'xếp câu nối tiếp + khoảng nghỉ');

// 2) Phụ đề ASS
const lines = [{ who: 'mia', text: 'Say {I} agree', start: 0.2, end: 1.4 }, { who: 'leo', text: 'Agree is a verb', start: 1.7, end: 3 }];
const words = lines.flatMap((l, i) => V.evenTiming(V.tokens(l.text), l.start, l.end).map(x => ({ line: i, ...x })));
let ass = V.buildAss({ w: 1080, h: 1920, lines, words, keywords: ['verb'], hook: 'Stop saying I am agree', cta: { start: 3.5, end: 5 } });
const dl = ass.split('\n').filter(x => x.startsWith('Dialogue:'));
ok(dl.filter(x => /,K,L\d,/.test(x)).length === words.length, 'mỗi từ 1 sự kiện karaoke');
ok(dl.filter(x => /,K,L\d,/.test(x)).every(x => (x.match(/\\1c&H002F50E5/g) || []).length === 1), 'đúng 1 từ màu cam (từ đang đọc) mỗi sự kiện');
ok(/\\1c&H004AC9FF\}verb/.test(ass), 'từ khóa tô vàng');
ok(/Dialogue: 1,0:00:00\.00,0:00:01\.40,Hook,HOOK/.test(ass), 'hook trong ≤ 2 s đầu');
ok(/,CTA,CTA,.*lexkite\.com/.test(ass) && !/,CTA,CTA,/.test(V.buildAss({ w: 1080, h: 1920, lines, words, cta: { start: 3.5, end: 5 }, ctaText: false })), 'thẻ CTA lexkite.com, tắt khi end card in sẵn chữ');
ok(V.subsExact(ass, lines).ok && V.assLineTexts(ass).get(0).has('Say I agree'), 'phụ đề khớp kịch bản 100% (bỏ ký tự ASS đặc biệt)');
ok(!V.subsExact(ass.replace('verb', 'herb'), lines).ok, 'phát hiện phụ đề lệch chữ');
for (const st of V.HOOK_STYLES) { const a = V.buildAss({ w: 1080, h: 1920, lines, words, hook: 'Stop saying it', hookStyle: st }); ok(/,HOOK,/.test(a) && /STOP/.test(a), `kiểu hook ${st}`); }
ok(/,Label,LABEL,.*SAY/.test(V.buildAss({ w: 1080, h: 1920, lines, words, labels: [{ start: 0, end: 1, text: 'SAY', color: 'green' }] })), 'nhãn khuôn (SAY)');
ok(V.assColor('#E5502F') === '&H002F50E5' && V.assTime(61.234) === '0:01:01.23', 'màu & giờ ASS');
ok(V.subsSafeArea({ w: 1080, h: 1920, maxChars: 40 }).ok && !V.subsSafeArea({ w: 1080, h: 1920, maxChars: 400 }).ok, 'vùng an toàn phụ đề (câu quá dài → lọt khỏi vùng)');
ok(['white', 'orange', 'yellow'].every(c => V.contrast(V.BRAND[c], V.BRAND.ink) >= 4.5) && V.contrast('#FFFFFF', '#000000') === 21, 'tương phản chữ/viền ≥ 4.5');

// 3) Đo QA
const eb = '[Parsed_ebur128_0] t: 1.0 M: -20 S: -21 I: -19.0 LUFS\n[Parsed_ebur128_0] Summary:\n  Integrated loudness:\n    I:         -16.4 LUFS\n    Threshold: -26.5 LUFS';
ok(V.parseEbur128(eb) === -16.4 && V.parseEbur128('I: -inf LUFS') === -Infinity && V.parseEbur128('x') === null, 'đọc LUFS từ ebur128 (lấy dòng tổng kết)');
ok(V.audioScore(-16.4) === 10 && V.audioScore(-17.8) === 5 && V.audioScore(-23) === 0 && V.audioScore(-Infinity) === 0 && V.audioScore(null) === 0, 'điểm âm thanh -16 ±1');
const lw = [{ line: 0, w: 'a', start: 0.5, end: 0.8 }, { line: 0, w: 'b', start: 0.82, end: 1 }, { line: 0, w: 'c', start: 1.6, end: 2 }];
const vis = [{ line: 0, start: 0, end: 0.55, v: 'X' }, { line: 0, start: 0.55, end: 0.9, v: 'B' }, { line: 0, start: 0.9, end: 1.5, v: 'X' }, { line: 0, start: 1.64, end: 2, v: 'C' }];
ok(V.lipsyncOffset(lw, vis) === 50 && V.lipsyncScore(50) === 15 && V.lipsyncScore(100) === 8 && V.lipsyncScore(200) === 0 && V.lipsyncScore(null) === 0, 'lệch khẩu hình = trung vị đầu cụm từ (50 ms)');
ok(V.lipsyncOffset(lw, null) === null, 'không có khẩu hình → chưa đo');
const shots = V.planShots([{ start: 0.2, end: 1.9, beat: 'hook' }, { start: 2.2, end: 10, beat: 'explain', camera: 'pan' }, { start: 10.3, end: 12, beat: 'cta', transitionIn: true }], { endStart: 12.4, duration: 14.6 });
ok(shots[0].framing === 'push' && shots[1].framing === 'pan' && shots.filter(s => s.line === 1).length === 3 && shots.at(-1).framing === 'card', 'cắt cảnh: hook đẩy máy, câu dài chia nhỏ, góc máy theo câu, thẻ CTA cuối');
ok(shots.find(s => s.line === 2).transitionIn && shots.every((s, i) => !i || Math.abs(s.start - shots[i - 1].end) < 0.011), 'cảnh nối liền, có chuyển cảnh');
ok(V.pacingScore(shots).bad === 0 && V.pacingScore([{ start: 0, end: 6, framing: 'wide' }]).score === 7, 'điểm nhịp dựng (cảnh > 4 s bị trừ)');
ok(V.hookScore(1.9) === 15 && V.hookScore(2.8) === 10 && V.hookScore(4) === 5, 'điểm hook');

// 4) Cổng nhất quán bối cảnh – nhân vật – lời thoại
const st0 = V.buildStage({ job: sample, casting, manifest });
ok(st0.fails.length === 0 && st0.topic === 'office-english' && st0.segs.length === 1 && st0.segs[0].room.id === 'office-01-day', 'kịch bản mẫu: chủ đề → office, 1 phòng, không lỗi');
ok(st0.lines.every(l => l.actors.every(a => a.role === 'speaker' ? a.asset.mouth || l.who === 'kit' : ['idle', 'nod'].some(t => a.asset.tags.includes(t)))), 'người nói clip có miệng, người nghe idle/nod');
ok(st0.lines[2].actors.find(a => a.who === 'mia').face === 'right' && st0.lines[2].actors.find(a => a.who === 'leo').asset.tags.includes('talk'), 'người nghe nhìn về phía người nói; giải thích → talk/point');
ok(st0.lines[0].emotion === 'wrong' && st0.lines[0].actors[0].asset.tags.includes('shock'), 'câu "sai" → clip shock');
ok(new Set(st0.clips).size === st0.clips.length, 'không lặp clip hành động trong video');
const tweak = f => { const j = JSON.parse(JSON.stringify(sample)); f(j.script, j); return V.buildStage({ job: j, casting, manifest }).fails; };
let fl = tweak(sc => { sc.lines[1].who = 'carlos'; }); ok(fl.some(f => f.k === 'brand' && /carlos/.test(f.reason)), 'Carlos ở văn phòng → lỗi brand');
fl = tweak(sc => { sc.lines[3].scene = 'cafe'; }); ok(fl.some(f => f.k === 'pacing' && /chuyển cảnh/.test(f.reason)) && fl.some(f => f.k === 'brand'), 'đổi phòng không chuyển cảnh + cafe ngoài chủ đề → lỗi');
fl = tweak((sc, j) => { j.topic = 'Small talk: spill the tea'; sc.scene = 'home'; sc.lines[3].scene = 'cafe'; sc.lines[3].transition = 'fade'; }); ok(!fl.some(f => /chuyển cảnh/.test(f.reason)), 'đổi phòng có chủ đích (transition) → hợp lệ');
fl = tweak(sc => { sc.lines[0].text = "That's totally wrong!"; sc.lines[0].expr = 'big laugh'; }); ok(fl.some(f => f.k === 'lipsync' && /biểu cảm/.test(f.reason)), 'câu "sai" mà cười lớn → lỗi biểu cảm');
{ // luật biểu cảm ↔ câu: chỉ chặn mâu thuẫn thật
  const C = (text, expr, beat = 'situation') => V.exprConflict({ text, expr, beat });
  ok(!C('Hi there! What can I get for you today?', 'happy smile', 'hook') && !C('Could I get a large latte, please?', 'happy smile') && !C('Is that wrong?', 'thinking'), 'câu hỏi thân thiện + mặt cười → không lỗi');
  ok(!!C("That's totally wrong!", 'big laugh') && !!C("I'm so sorry, I lost your file.", 'big laugh') && !!C('This is unacceptable and so rude.', 'happy smile') && !!C('Perfect, great job!', 'sad crying'), 'câu sai/buồn/giận mà cười, câu khen mà mặt buồn → lỗi');
  ok(!C('Unfortunately, the meeting moved.', 'sad') && !C("Oops, that's wrong!", 'shocked'), 'câu buồn + mặt buồn, câu sai + mặt sốc → hợp');
}
fl = tweak(sc => { sc.time = 'night'; }); ok(fl.length === 0 || fl.every(f => f.k !== 'pacing'), 'tối có phòng tối riêng → không lỗi ánh sáng');
fl = tweak(sc => { sc.outfit = 'travel'; }); ok(fl.some(f => f.k === 'lipsync' && /không có clip/.test(f.reason)), 'không có clip đúng trang phục → người nói thiếu clip miệng');
const noClips = { ...manifest, clips: manifest.clips.filter(c => !c.mouth || c.id === 'mia_talk_point') };
fl = V.buildStage({ job: sample, casting, manifest: noClips }).fails; ok(fl.some(f => /lặp lại/.test(f.reason)), 'clip hành động lặp trong video → lỗi');
const vd = V.consistencyVerdict([{ k: 'brand', reason: 'x' }, { k: 'lipsync', reason: 'y' }, { k: 'brand', reason: 'z' }]);
ok(!vd.ok && vd.zero.join() === 'brand,lipsync' && vd.reasons[0] === '[brand] x', 'lỗi → chấm 0 đúng mục + lý do');
ok(V.resolveTopic({ topic: 'An example sentence' }, casting).id === 'general' && V.resolveTopic({ topic: 'IELTS exam day' }, casting).id === 'ielts-exam', 'khớp chủ đề theo trọn từ');
ok(V.lineEmotion({ text: 'Could I get a large latte, please?', beat: 'example' }) === 'explain' && V.lineEmotion({ text: 'Why is it rude?', beat: 'example' }) === 'ask', 'lời đề nghị lịch sự (Could I get…, please?) = nói (talk), không phải hỏi phân vân');
ok(V.lineEmotion({ text: 'Why do we say that?', beat: 'situation' }) === 'ask' && V.lineEmotion({ text: 'Exactly right', beat: 'situation' }) === 'right' && V.lineEmotion({ text: 'Practice free', beat: 'cta' }) === 'cta', 'cảm xúc câu: hỏi / đúng / CTA');

// 5) Bộ sinh biến thể
ok(formats.formats.length >= 40 && formats.hookStyles.length === 6 && formats.transitions.length >= 12 && formats.cameraSets.length >= 6, '≥ 40 khuôn, 6 kiểu hook, ≥ 12 chuyển cảnh, ≥ 6 bộ góc máy');
ok(formats.music.every(x => !x.file), 'nhạc nền tự tổng hợp (không file nhạc ngoài)');
const date = new Date('2026-10-17T00:00:00Z');
const a1 = X.pickVariant({ job: sample, formats, casting, manifest, history: [], seed: 'abc', date }), a2 = X.pickVariant({ job: sample, formats, casting, manifest, history: [], seed: 'abc', date });
ok(JSON.stringify(a1.fp) === JSON.stringify(a2.fp) && JSON.stringify(X.pickVariant({ job: sample, formats, casting, manifest, history: [], seed: 'abd', date }).fp) !== JSON.stringify(a1.fp), 'cùng seed → cùng tổ hợp; khác seed → khác');
ok(!a1.recast && a1.cast.to.join() === 'mia,leo' && !X.canRecast({ lines: [{ who: 'mia', text: 'Hi Leo!' }] }, casting), 'kịch bản ghi rõ who → giữ dàn; đổi vai chỉ khi lời thoại không gọi tên');
{ // dàn kịch bản: giữ nguyên khi có clip; recast:true mới đổi để đa dạng; người được gọi tên không có clip nói → đổi riêng người đó + lý do
  const cafe = { topic: 'Ordering coffee like a local', script: { scene: 'cafe', lines: [{ who: 'carlos', beat: 'hook', text: 'Hi there.' }, { who: 'mia', beat: 'explain', text: 'Say could I get.' }] } };
  const cm = { ...manifest, clips: [{ id: 'carlos_t', who: 'carlos', outfit: 'casual', mouth: true, tags: ['talk'], file: 'c' }, { id: 'mia_t', who: 'mia', outfit: 'casual', mouth: true, tags: ['talk'], file: 'm' }, { id: 'leo_t', who: 'leo', outfit: 'casual', mouth: true, tags: ['talk'], file: 'l' }] };
  const keep = [...Array(20)].map((_, i) => X.pickVariant({ job: cafe, formats, casting, manifest: cm, seed: 'k' + i, date }));
  ok(keep.every(v => !v.recast && v.cast.to.join() === 'carlos,mia' && v.setting.scene === 'cafe'), 'cafe-order: Carlos + Mia ghi rõ → 20 seed đều giữ dàn');
  const opt = [...Array(20)].map((_, i) => X.pickVariant({ job: { ...cafe, script: { ...cafe.script, recast: true } }, formats, casting, manifest: cm, seed: 'k' + i, date }));
  ok(opt.some(v => v.recast), 'recast:true → được đổi vai để đa dạng');
  const noMia = { ...cm, clips: cm.clips.filter(c => c.who !== 'mia') }, rv = X.pickVariant({ job: cafe, formats, casting, manifest: noMia, seed: 'z', date });
  ok(rv.recast && rv.cast.to[0] === 'carlos' && rv.cast.to[1] === 'leo' && /mia/.test(rv.recastReason), 'người được gọi tên thiếu clip → chỉ thay người đó + lý do');
}
ok(X.applyCast(sample.script, { from: ['mia', 'leo'], to: ['leo', 'diane'] }).lines.map(l => l.who).join() === 'leo,diane,diane,leo,kit,leo', 'áp dàn mới, Kit giữ nguyên');
const topicsQ = ['Don\'t say "I\'m agree"', 'Job interview: tell me about yourself', 'Ordering coffee like a local', 'IELTS speaking part 2', 'Leo explains "spill the tea"', 'At the airport check-in', 'Affect or effect quiz', 'Email etiquette', 'Restaurant: asking for the check'];
const spk = { 'ielts-exam': ['ama'], 'study-grammar': ['ama'], 'ordering-coffee': ['carlos', 'mia'], restaurant: ['carlos', 'leo'], travel: ['carlos', 'mia'], 'job-interview': ['diane', 'mia'] };
const hist = [], choices = [], Rg = X.rng('test-1000'); let relaxed = 0, clipRepeat = 0, badStage = 0;
for (let i = 0; i < 1000; i++) {
  const topic = topicsQ[Math.floor(Rg() * topicsQ.length)], tid = V.resolveTopic({ topic }, casting).id, who = spk[tid] || ['mia', 'leo'];
  const script = { lines: [{ who: who[0], beat: 'hook', text: 'Wait, is that wrong?' }, { who: who[1] || who[0], beat: 'explain', text: 'Here is the natural way.' }, { who: who[0], beat: 'example', text: 'I agree with your plan.' }, { who: 'kit', beat: 'tip', text: "Kit's tip: say it twice." }, { who: who[1] || who[0], beat: 'cta', text: 'Practice this free on lexkite.com' }] };
  const job = { id: 'j' + i, topic, script }, v = X.pickVariant({ job, formats, casting, manifest, history: hist, seed: 'run' + i, date });
  if (v.relaxed) relaxed++;
  const st = V.buildStage({ job: { ...job, script: v.recast ? X.applyCast(script, v.cast) : script }, casting, manifest, variant: v, avoidClips: hist.slice(-3).flatMap(h => h.clips || []) });
  if (st.fails.some(f => f.k === 'brand' || /chuyển cảnh|phòng .* là/.test(f.reason))) badStage++;
  if (new Set(st.clips).size !== st.clips.length) clipRepeat++;
  hist.push({ ...v.fp, clips: st.clips }); choices.push(v.choice);
}
const audit = X.auditHistory(hist, formats.rules, h => choices[hist.indexOf(h)]);
ok(relaxed === 0 && audit.length === 0, `1.000 lượt: không trùng ≥ 3 thành phần chính với 30 video gần nhất (relaxed ${relaxed}, vi phạm ${audit.length}${audit[0] ? ': ' + audit[0] : ''})`);
ok(clipRepeat === 0, '1.000 lượt: không lặp clip hành động trong 1 video');
ok(badStage === 0, `1.000 lượt: bối cảnh/dàn luôn hợp vai (${badStage} lỗi)`);
const sp = formats.rules.spacing; let spacingBad = 0;
hist.forEach((h, i) => { if (i && hist[i - 1].format === h.format && sp.format) spacingBad++; });
ok(spacingBad === 0, 'giãn cách: khuôn không lặp ở 2 video liên tiếp');
ok(new Set(hist.map(h => X.MAIN.map(c => h[c]).join('|'))).size === 1000, '1.000 tổ hợp đều khác nhau');

// 6) Độ phủ
const cov = X.coverage({ formats, casting, manifest, exists: () => true, emotionTags: V.EMOTION_TAGS, date });
ok(cov.total > 100000 && cov.topics.length === casting.topics.length + 1, `độ phủ đủ lớn khi đủ tài nguyên (${cov.total.toLocaleString('en-US')} tổ hợp)`);
const covNone = X.coverage({ formats, casting, manifest, exists: () => false, existsRepo: () => false, emotionTags: V.EMOTION_TAGS, date });
ok(covNone.missing.some(x => /clip diane/.test(x)) && covNone.missing.some(x => /phòng office-01-day/.test(x)) && covNone.missing.some(x => /end card qr/.test(x)), 'báo thiếu tài nguyên (clip, phòng, end card)');

if (fails) { console.error(`✗ video: ${fails} lỗi`); process.exit(1); }
console.log(`✓ video: căn mốc từ, phụ đề ASS, đo QA, cổng nhất quán, bộ sinh biến thể (1.000 lượt không trùng), độ phủ đều đạt`);
