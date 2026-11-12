#!/usr/bin/env node
// Tầng 2 WIKIMEDIA qua Wikidata (chỉ trang từ điển + /words/, KHÔNG thẻ học – giữ phong cách thẻ đồng nhất):
//   node scripts/vocab-img/wiki.mjs [--limit N] [--write]   → content/lexicon/vimg-wiki.json { "từ#loại": { qid, label, desc, file, lic, by, ref } }
// Chạy OFFLINE (máy/CI) – app KHÔNG gọi API ngoài; free_tier.py tải ảnh về, thu nhỏ, đăng lên media.lexkite.com.
// Nghĩa ứng viên: danh từ cụ thể (vimg-select.json lexname food/animal/plant/object/artifact/body + strict.mjs ruleCheck), chưa có icon (vimg-icons-lex.json), không bị chặn (vimg-wiki-block.json).
// Khớp: wbsearchentities → nhãn en == từ (số ít/nhiều) → mô tả không phải trang định hướng/tên người/tác phẩm/địa danh → P31|P279/P279* thuộc lớp CỤ THỂ (SPARQL) → có P18
//   → Commons extmetadata: chỉ giữ CC0 / CC BY / CC BY-SA / Public domain (ghi tác giả + URL trang tệp để ghi công ở /credits/).
import fs from 'fs';
import { execFileSync } from 'child_process';
import { ruleCheck } from './strict.mjs';

const ROOT = new URL('../../', import.meta.url), P = p => new URL(p, ROOT), rd = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const UA = { 'User-Agent': 'LexkiteBot/1.0 (https://lexkite.com/credits/; build-time image ingest)', Accept: 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
// curl (không phải fetch): đi đúng proxy của máy/CI, có trần thời gian; 429/5xx → chờ rồi thử lại
async function get(u, tries = 4, body) {
  for (let i = 0; i < tries; i++) {
    try {
      const a = ['-s', '-m', body ? '90' : '30', '-A', UA['User-Agent'], '-H', 'Accept: application/json', '-w', '\n%{http_code}', ...(body ? ['--data-binary', body, '-H', 'Content-Type: application/x-www-form-urlencoded'] : []), u];
      const out = execFileSync('curl', a, { maxBuffer: 64 << 20 }).toString(), k = out.lastIndexOf('\n'), code = +out.slice(k + 1);
      if (code === 429 || code >= 500) { await sleep(3000 * (i + 1)); continue; } if (code !== 200) return null; return JSON.parse(out.slice(0, k));
    } catch { await sleep(2000 * (i + 1)); }
  }
  return null;
}
// lớp cụ thể: physical object, product, food, drink, animal, plant, organism, vehicle, building, architectural structure, room, tool, clothing, geographic feature, body of water, landform, furniture, facility, anatomical structure, dish, musical instrument, device, container, artificial physical object
const CONCRETE = ['Q223557', 'Q2424752', 'Q2095', 'Q40050', 'Q729', 'Q756', 'Q7239', 'Q42889', 'Q41176', 'Q811979', 'Q180516', 'Q39546', 'Q11460', 'Q618123', 'Q15324', 'Q271669', 'Q14745', 'Q13226383', 'Q4936952', 'Q746549', 'Q34379', 'Q1183543', 'Q987767', 'Q8205328'];
const BADDESC = /disambiguation|wikimedia|family name|given name|surname|\bfilm\b|album|\bsong\b|\bband\b|novel|company|television|magazine|journal|newspaper|village|commune|municipality|\btown\b|\bcity in\b|river in|lake in|mountain in|hill in|single by|painting|sculpture by|video game|software|character|episode|genus|species of|brand|manufacturer|organization|record label|unit of|scientific article|asteroid|book by/;
const LICOK = /^(cc0|cc[ -]by(-sa)?[ -]?\d|cc[ -]by(-sa)?$|public domain|pd\b|pd-)/i;
const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const forms = w => { const f = new Set([w]); if (/[^s]s$/.test(w)) f.add(w.slice(0, -1)); else f.add(w + 's'); return f; };

export function licOk(l) { return LICOK.test(String(l || '').trim()); }
export function normLic(l) {
  l = String(l || '').trim();
  if (/^cc0/i.test(l)) return 'CC0'; if (/^(public domain|pd)/i.test(l)) return 'PD';
  const m = /^cc[ -]by(-sa)?(?:[ -]?(\d(?:\.\d)?))?/i.exec(l); return m ? `CC BY${m[1] ? '-SA' : ''}${m[2] ? ' ' + m[2] : ''}` : '';
}

async function main() {
  const sel = rd('content/lexicon/vimg-select.json').items, lex = rd('dist/lexicon.json'), ic = rd('content/lexicon/vimg-icons-lex.json').items;
  const blk = fs.existsSync(P('content/lexicon/vimg-wiki-block.json')) ? new Set(rd('content/lexicon/vimg-wiki-block.json').block) : new Set();
  const keys = Object.keys(sel).filter(k => k.endsWith('#n') && lex[k] && !ic[k] && !blk.has(k) && ['food', 'animal', 'plant', 'object', 'artifact', 'body'].includes(sel[k][1]) && ruleCheck(k, lex[k], sel[k][1]).ok).slice(0, +(arg('limit') || 1e9));
  const cand = {};   // k → [qid…]
  for (const k of keys) {
    const w = k.split('#')[0], F = forms(w);
    const j = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&uselang=en&type=item&limit=7&search=${encodeURIComponent(w)}`);
    cand[k] = ((j && j.search) || []).filter(s => F.has(String(s.label || '').toLowerCase()) && !BADDESC.test(String(s.description || '').toLowerCase())).map(s => ({ id: s.id, label: s.label, desc: s.description || '' }));
    await sleep(150); process.stderr.write('.');
  }
  console.error(' search ok');
  // thực thể: P18 + lớp
  const ids = [...new Set(Object.values(cand).flat().map(c => c.id))], ent = {};
  for (let i = 0; i < ids.length; i += 50) {
    const j = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=${ids.slice(i, i + 50).join('|')}`);
    for (const [id, e] of Object.entries((j && j.entities) || {})) { const c = e.claims || {}; ent[id] = { p18: (((c.P18 || [])[0] || {}).mainsnak || {}).datavalue?.value || '' }; }
    await sleep(300);
  }
  const withImg = ids.filter(id => ent[id] && ent[id].p18), concrete = new Set();
  for (let i = 0; i < withImg.length; i += 40) {
    const q = `SELECT DISTINCT ?item WHERE { VALUES ?item { ${withImg.slice(i, i + 40).map(x => 'wd:' + x).join(' ')} } ?item (wdt:P31|wdt:P279)/wdt:P279* ?c . hint:Prior hint:gearing "forward" . VALUES ?c { ${CONCRETE.map(x => 'wd:' + x).join(' ')} } }`;
    const j = await get('https://query.wikidata.org/sparql', 3, 'format=json&query=' + encodeURIComponent(q));
    for (const b of ((j && j.results && j.results.bindings) || [])) concrete.add(b.item.value.split('/').pop());
    await sleep(1000);
  }
  console.error('sparql ok', concrete.size);
  const pick = {};
  for (const k of keys) { const c = (cand[k] || []).find(c => ent[c.id] && ent[c.id].p18 && concrete.has(c.id)); if (c) pick[k] = { ...c, file: ent[c.id].p18 }; }
  // Commons: giấy phép + tác giả
  const out = {}, files = [...new Set(Object.values(pick).map(p => p.file))], meta = {};
  for (let i = 0; i < files.length; i += 40) {
    const j = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=640&titles=${files.slice(i, i + 40).map(f => encodeURIComponent('File:' + f)).join('|')}`);
    const norm = Object.fromEntries((((j || {}).query || {}).normalized || []).map(n => [n.to, n.from]));
    for (const pg of Object.values(((j || {}).query || {}).pages || {})) {
      const ii = (pg.imageinfo || [])[0]; if (!ii) continue; const m = ii.extmetadata || {};
      const f = (norm[pg.title] || pg.title).replace(/^File:/, '');
      meta[f] = { lic: strip((m.LicenseShortName || {}).value), by: strip((m.Artist || {}).value).slice(0, 120), ref: ii.descriptionurl, thumb: ii.thumburl, mime: ii.mime };
    }
    await sleep(300);
  }
  let rej = 0;
  for (const [k, p] of Object.entries(pick)) {
    const m = meta[p.file]; if (!m || !licOk(m.lic) || !/^image\/(jpeg|png|webp)$/.test(m.mime || '')) { rej++; continue; }
    out[k] = { qid: p.id, label: p.label, desc: p.desc, file: p.file, lic: normLic(m.lic), by: m.by || 'unknown', ref: m.ref, thumb: m.thumb };
  }
  const doc = { _note: 'Sinh bởi scripts/vocab-img/wiki.mjs (Wikidata P18 → Wikimedia Commons; chỉ CC0/CC BY/CC BY-SA/PD) – KHÔNG sửa tay; chặn nghĩa sai ở vimg-wiki-block.json. Chỉ dùng ở trang từ điển + /words/ (trường photo của img.json), ghi công ở /credits/.', v: 1, at: new Date().toISOString().slice(0, 10), items: Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : 1))) };
  if (process.argv.includes('--write')) fs.writeFileSync(P('content/lexicon/vimg-wiki.json'), JSON.stringify(doc, null, 1) + '\n');
  console.log(`wiki: ${keys.length} nghĩa ứng viên · ${Object.values(cand).filter(c => c.length).length} có nhãn khớp · ${withImg.length} thực thể có P18 · ${concrete.size} cụ thể · ${Object.keys(pick).length} chọn · giấy phép bỏ ${rej} · giữ ${Object.keys(out).length}`);
}
if (process.argv[1] && process.argv[1].endsWith('wiki.mjs')) main();
