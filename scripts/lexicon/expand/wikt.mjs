// IPA từ Wiktionary qua kaikki.org (CC BY-SA 4.0, ghi công) – dùng chung cho job.mjs và hiệu chuẩn espeak (espeak-calib.mjs).
import { fixBroken } from '../ipa.mjs';
const KPOS = { n: 'noun', v: 'verb', adj: 'adj', adv: 'adv' };
export async function kaikki(w, pos, stat = {}) {
  const u = `https://kaikki.org/dictionary/English/meaning/${w[0]}/${w.slice(0, 2)}/${encodeURIComponent(w)}.jsonl`;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u, { headers: { 'User-Agent': 'lexkite-lexicon-expand (lexkite.com)' } }); if (r.status === 404) return {}; if (!r.ok) throw 0; stat.kaikki = (stat.kaikki || 0) + 1;
      const ents = (await r.text()).split('\n').filter(Boolean).map(x => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
      const ord = [...ents.filter(e => e.pos === KPOS[pos]), ...ents.filter(e => e.pos !== KPOS[pos])], pick = re => { for (const e of ord) for (const s of e.sounds || []) if (s.ipa && (s.tags || []).some(t => re.test(t))) return s.ipa; return ''; };
      return { uk: pick(/^(Received-Pronunciation|UK|British)$/), us: pick(/^(General-American|US)$/) };
    } catch { await new Promise(s => setTimeout(s, 1500 * (i + 1))); }
  }
  return {};
}
// /…/ đầu tiên → quy ước kho. Pilot 40077853589: bản cũ đổi ɡ → g (ngoài bảng) và bỏ sót t͡ʃ, ̯, ̩ → 40 mục trượt IPA oan.
export const clean = s => { s = String(s || '').trim(); const m = /^\/[^/]+\//.exec(s); if (!m) return '';
  return fixBroken(m[0].replace(/\./g, '').replace(/ɹ/g, 'r').replace(/ɫ/g, 'l').replace(/ɐ/g, 'ʌ').replace(/ɜ(?!ː)/g, 'ɜː').replace(/[̩̯̍͜͡˞]/g, '').replace(/ɚ/g, 'ə').replace(/ɝ/g, 'ɜː')); };
export async function pmap(list, n, f) { const out = []; let i = 0; await Promise.all(Array.from({ length: n }, async () => { while (i < list.length) { const k = i++; out[k] = await f(list[k], k); } })); return out; }
