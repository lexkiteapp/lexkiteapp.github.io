// Tách huy hiệu từ tờ minh hoạ Stitch (out/stitch/sv/sv-art-*/light.html) thành web/img/lib/<tên>.svg: khối bóng + gờ theo đúng màu Stitch vẽ + hình vector của Stitch.
// Tờ nguồn lưu ở brand/stitch/web-library/. Chạy lại sau khi vẽ lại tờ: node scripts/stitch/art-extract.mjs [thư mục tờ]
import fs from 'node:fs'; import path from 'node:path';
const SRC = process.argv[2] || 'brand/stitch/web-library', OUT = 'web/img/lib';
const SHEETS = { writing: [0, 'di', 0, 'av', 'pn', 'tp'], topics1: ['education', 'technology', 'environment', 'work', 'travel', 'health'], topics2: ['media', 'urban', 'architecture', 'society', 'culture', 'sport'],
  topics3: ['food', 'consumerism', 'language', 'science', 'wildlife', 'government'], mix1: ['crime', 'economy', 'ad', 'ps', 'formal', 'semi'], mix2: ['informal', 'doc', 'shapes', 'medal', 'phrase', 'clock'],
  vocab1: ['v-topics', 'v-writing', 'v-speaking', 'v-awl', 'v-core', 'v-toeic'], vocab2: ['v-domain', 'v-exam', 'g-foundation', 'g-tenses', 'g-verbs', 'g-words'],
  gram: ['g-sentences', 'g-academic', 'p-vowels', 'p-diphthongs', 'p-consonants', 'p-vn'], pron: ['p-stress', 't-line', 't-bar', 't-pie', 't-table', 't-process'], misc: ['t-map', 'q', 'tick', 'letter', 'notebook', 'audio'] };
const min = s => s.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').replace(/\s+\/>/g, '/>').trim();
const TINT = [['#FFF4D6', '#FFD98A', '#D9A441'], ['#DFF7F2', '#A9E6DA', '#5DB5A5'], ['#FFE6DE', '#FFC2AE', '#DE8468'], ['#E9EAFF', '#C5C8FF', '#8689DB'], ['#E3F3FF', '#B4DCFA', '#6FA9D6'], ['#F0F8DC', '#CFE9A3', '#8FB65C']];
fs.mkdirSync(OUT, { recursive: true }); let n = 0, kb = 0;
for (const [sheet, names] of Object.entries(SHEETS)) {
  const f = path.join(SRC, `sv-art-${sheet}.html`), alt = `out/stitch/sv/sv-art-${sheet}/light.html`, file = fs.existsSync(f) ? f : alt; const h = fs.readFileSync(file, 'utf8');
  const svgs = [...h.matchAll(/<svg\b[\s\S]*?<\/svg>/g)]; if (svgs.length !== names.length) throw new Error(`${sheet}: ${svgs.length} svg, cần ${names.length}`);
  svgs.forEach((m, i) => { const name = names[i]; if (!name) return;
    // Tờ "writing": khối màu vẽ bằng thẻ div (Tailwind from-/to-) → dựng lại quanh hình. Các tờ khác: SVG đã gồm cả khối → giữ nguyên.
    const before = h.slice(Math.max(0, m.index - 1500), m.index), start = before.lastIndexOf('<!--'), own = before.slice(start < 0 ? 0 : start), at = own.lastIndexOf('from-['), cls = at < 0 ? '' : own.slice(at, own.indexOf('"', at));
    const c1 = cls.match(/from-\[(#[0-9a-fA-F]{3,8})\]/)?.[1], c2 = cls.match(/to-\[(#[0-9a-fA-F]{3,8})\]/)?.[1], led = cls.match(/shadow-\[0_\d+px_0_0_(#[0-9a-fA-F]{3,8})/)?.[1] || c2;
    const vb = (m[0].match(/viewBox="([^"]+)"/) || [, '0 0 160 160'])[1], inner = m[0].replace(/^<svg\b[^>]*>/, '').replace(/<\/svg>$/, '');
    // Hình Stitch vẽ rời (không có khối): đặt lên khối sáng cùng dáng để cả bộ đồng nhất, hình tối vẫn nổi ≥ 3:1 ở cả 2 giao diện
    const [vx, vy, vw, vh] = vb.split(/\s+/).map(Number), hasTile = [...inner.matchAll(/<rect\b[^>]*>/g)].some(t => +(t[0].match(/\swidth="([\d.]+)"/)?.[1] || 0) >= vw * .72 && +(t[0].match(/\sheight="([\d.]+)"/)?.[1] || 0) >= vh * .68 && /\brx="/.test(t[0]));
    const tint = TINT[n % TINT.length];
    const out = min(!(c1 && c2) && !hasTile ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 208"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${tint[0]}"/><stop offset="1" stop-color="${tint[1]}"/></linearGradient></defs><rect y="10" width="200" height="198" rx="44" fill="${tint[2]}"/><rect width="200" height="196" rx="44" fill="url(#bg)"/><rect x="24" y="10" width="152" height="30" rx="15" fill="#fff" opacity=".55"/><svg x="22" y="20" width="156" height="156" viewBox="${vb}" fill="none">${inner}</svg></svg>` : c1 && c2 ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 208"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect y="10" width="200" height="198" rx="44" fill="${led}"/><rect width="200" height="196" rx="44" fill="url(#bg)"/><rect x="24" y="10" width="152" height="30" rx="15" fill="#fff" opacity=".2"/><svg x="26" y="24" width="148" height="148" viewBox="${vb}" fill="none">${inner}</svg></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" fill="none">${inner}</svg>`);
    fs.writeFileSync(path.join(OUT, name + '.svg'), out); n++; kb += out.length; });
}
console.log(`✓ ${n} huy hiệu, ${(kb / 1024).toFixed(1)} KB (trung bình ${(kb / n / 1024).toFixed(1)} KB)`);
