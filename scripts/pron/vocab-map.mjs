// Maps a model's vocab.json (token -> id, ARPA or IPA/espeak labels) onto the ARPA39 set used by gop.mjs.
// Tokens that have no single ARPA39 equivalent become null (ignored by the harness).
export const ARPA39 = 'AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH'.split(' ');
const SET = new Set(ARPA39);

// IPA (espeak / speako) -> ARPA39. Diphthong+r tokens (ɑːɹ ɔːɹ ...) map to the vowel only (the r is lost: counted as a deletion).
// ɾ (flap) and ʁ, ʔ, syllabic əl, nasalised vowels etc. are intentionally absent -> null.
const IPA = {
  n: 'N', s: 'S', t: 'T', 'ə': 'AH', l: 'L', a: 'AA', i: 'IY', k: 'K', d: 'D', m: 'M', 'ɛ': 'EH', e: 'EH', 'ɪ': 'IH', p: 'P', o: 'OW',
  'ɐ': 'AH', z: 'Z', 'ð': 'DH', f: 'F', j: 'Y', v: 'V', b: 'B', 'ɹ': 'R', r: 'R', 'ʊ': 'UH', 'iː': 'IY', w: 'W', 'ʌ': 'AH', u: 'UW',
  'ɡ': 'G', g: 'G', 'æ': 'AE', 'aɪ': 'AY', 'ʃ': 'SH', h: 'HH', 'ɔ': 'AO', 'ɑː': 'AA', 'ŋ': 'NG', 'ɚ': 'ER', 'ɝ': 'ER', 'eɪ': 'EY',
  'uː': 'UW', 'ɑ': 'AA', 'oʊ': 'OW', 'əʊ': 'OW', 'ᵻ': 'IH', 'θ': 'TH', 'aʊ': 'AW', 'ɜ': 'ER', 'ɜː': 'ER', 'dʒ': 'JH', 'ʤ': 'JH',
  'ʒ': 'ZH', 'tʃ': 'CH', 'ʧ': 'CH', 'ɔː': 'AO', 'ɑːɹ': 'AA', 'ɔːɹ': 'AO', 'ɔɪ': 'OY', 'ɛɹ': 'EH', 'ɪɹ': 'IH', 'ʊɹ': 'UH', 'aɪɚ': 'AY',
  'ɒ': 'AA',
};
/** vocabJson: {token: id}. Returns { vocab: string[] (id -> ARPA label, or '<x{id}>' for unmapped), blankId, nMapped, unmapped: string[] } */
export function mapVocab(vocabJson, V) {
  const ids = Object.values(vocabJson), n = Math.max(V || 0, Math.max(...ids) + 1);
  const vocab = Array.from({ length: n }, (_, i) => `<x${i}>`);
  let blankId = -1, nMapped = 0; const unmapped = [];
  for (const [tok, id] of Object.entries(vocabJson)) {
    const raw = tok.trim();
    if (['<pad>', '[PAD]', '<PAD>'].includes(raw)) { blankId = id; vocab[id] = '<pad>'; continue; }
    const up = raw.toUpperCase();
    const a = SET.has(up) ? up : IPA[raw];       // ARPA-label models first (case/space-insensitive), then IPA table
    if (a && SET.has(a)) { vocab[id] = a; nMapped++; } else unmapped.push(tok);
  }
  if (blankId < 0) throw new Error('no <pad>/[PAD] token in vocab');
  return { vocab, blankId, nMapped, unmapped };
}
