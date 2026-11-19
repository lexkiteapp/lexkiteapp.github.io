// Props mẫu cho Remotion Studio (npm run studio) – không cần tài nguyên ngoài (nền gradient thương hiệu). Dựng thật luôn truyền props.json từ render.mjs.
const w = (line, arr, t0, step = 0.32) => arr.map((x, i) => ({ w: x, key: /agree/i.test(x), pop: +(t0 + i * step - 0.04).toFixed(2), start: +(t0 + i * step).toFixed(2), end: +(t0 + (i + 1) * step).toFixed(2) }));
export const DEMO = {
  w: 1080, h: 1920, fps: 30, durationInFrames: 300, duration: 10, seed: 'demo', format: 'dont-say',
  theme: { id: 'pop-teal', caption: 'pop-box', color: 'teal-cream', layout: { hookY: 0.17, capY: 0.6, cardY: 0.3 }, colors: { bg: ['#0F3D3E', '#17595A'], accents: ['#E5502F', '#FFC94A', '#2FBF71'], text: '#FFFFFF', ink: '#14100E' } },
  grain: true,
  hook: { pattern: 'stop-saying', badge: "DON'T SAY THIS", text: "Stop saying I'm agree", start: 0, end: 1.8, sticker: 'cross', sfx: 'wrong', shake: true },
  pages: [
    { line: 0, start: 0.16, end: 1.2, words: w(0, ['Wait,', 'is', "I'm agree"], 0.2) },
    { line: 0, start: 1.2, end: 2.2, words: w(0, ['wrong?'], 1.24) },
    { line: 1, start: 2.6, end: 4.6, words: w(1, ['Agree', 'is', 'a verb.'], 2.64, 0.5) },
    { line: 2, start: 5, end: 7.6, words: w(2, ['I', 'agree', 'with you.'], 5.04, 0.6) },
  ],
  cuts: [{ i: 0, t: 2.4, type: 'whip-pan', d: 0.36, from: 2.22, to: 2.58 }, { i: 1, t: 4.8, type: 'circle-reveal', d: 0.45, from: 4.575, to: 5.025 }, { i: 2, t: 7.8, type: 'confetti-burst', d: 0.6, from: 7.5, to: 8.1 }],
  shots: [
    { k: 0, start: 0, end: 2.4, line: 0, framing: 'push', grade: 'studio', room: null, actors: [], kit: null, shake: true, punch: true },
    { k: 1, start: 2.4, end: 4.8, line: 1, framing: 'wide', grade: 'studio', room: null, actors: [], kit: null, shake: false, punch: false },
    { k: 2, start: 4.8, end: 7.8, line: 2, framing: 'close', grade: 'studio', room: null, actors: [], kit: null, shake: false, punch: true },
    { k: 3, start: 7.8, end: 10, line: -1, framing: 'card', grade: 'studio', room: null, actors: [], kit: null },
  ],
  cards: [{ kind: 'dont', style: 'compare-cards', start: 1.7, end: 4.6, text: "I'm agree", label: "DON'T SAY" }, { kind: 'do', style: 'compare-cards', start: 4.8, end: 7.6, text: 'I agree', label: 'SAY' }],
  interrupts: [{ t: 3.6, kind: 'sticker', sticker: 'bulb', side: 'right' }, { t: 6.3, kind: 'punch', sticker: null, side: 'left' }],
  sfx: [], progress: { start: 0, end: 7.8 },
  watermark: { from: 1.5, fade: 0.5, until: 7.8, x: 60, y: 236, h: 40, opacity: 0.62 },
  endCard: { start: 7.8, url: 'lexkite.com', cta: 'Practice free', kit: null },
  safe: { top: 220, bottom: 420, left: 60, right: 140 },
};
