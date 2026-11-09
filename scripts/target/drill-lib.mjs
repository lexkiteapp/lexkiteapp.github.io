// Thư viện gói luyện tập tiếng Tây Ban Nha W2b: dựng dữ liệu (câu điền từ + bài chia động từ sinh từ conjugate.mjs) – dùng bởi drill-pack.mjs và corpus âm thanh.
import { readJSON } from './lib.mjs';
import { form, conjugate, TENSES } from './conjugate.mjs';
import { buildPx } from './px-lib.mjs';
import { buildExam } from './exam-es-lib.mjs';
import { buildPath } from './path-lib.mjs';

export const D = 'content/target/es/', LV = ['A1', 'A2', 'B1'];
export const GX_LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
const VERBAL = new Set(['verb', 'mood', 'sereestar', 'modal', 'cond']);
const VERBS = {
  A1: 'ser estar tener hacer ir querer poder comer beber hablar vivir ver dar decir venir'.split(' '),
  A2: 'saber poner salir volver pedir dormir pensar conocer llamar empezar seguir sentir'.split(' '),
  B1: 'traer oír construir leer conducir elegir mantener conseguir proponer resolver'.split(' '),
};
const TN = { pres: 'presente', pret: 'pretérito', impf: 'imperfecto', fut: 'futuro', cond: 'condicional', subj: 'presente de subjuntivo', subjImpf: 'imperfecto de subjuntivo', subjFut: 'futuro de subjuntivo',
  imp: 'imperativo', ger: 'gerundio', part: 'participio', perf: 'pretérito perfecto', plup: 'pluscuamperfecto', futPerf: 'futuro perfecto', condPerf: 'condicional perfecto',
  subjPerf: 'pretérito perfecto de subjuntivo', subjPlup: 'pluscuamperfecto de subjuntivo', pretAnt: 'pretérito anterior', prog: 'presente progresivo', irA: 'ir a + infinitivo' };
const PRON = ['yo', 'tú', 'él', 'nosotros', 'ellos'], IMPP = [['tu', 'tú'], ['usted', 'usted'], ['nos', 'nosotros'], ['ustedes', 'ustedes']];
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function conjItems(pts) {
  const out = Object.fromEntries(LV.map(l => [l, []]));
  for (const p of pts) {
    if (!LV.includes(p.level) || !VERBAL.has(p.area)) continue;
    const ts = (p.tenses || []).filter(t => TENSES.includes(t) && t !== 'impNeg').slice(0, 2); if (!ts.length) continue;
    const vs = VERBS[p.level], h = hash(p.id);
    for (let k = 0; k < 3; k++) {
      const t = ts[k % ts.length], v = vs[(h + k * 4) % vs.length];
      let pron, ans;
      if (t === 'imp') { const [key, lab] = IMPP[(h + k) % 4]; pron = lab; ans = conjugate(v).imp[key]; }
      else if (t === 'ger' || t === 'part') { pron = ''; ans = form(v, t); }
      else { const i = (h + k * 2) % 5; pron = PRON[i]; ans = form(v, t)[i]; }
      out[p.level].push(['c', p.id, `${pron ? pron + ' ' : ''}___ (${v})`, ans, TN[t]]);
    }
  }
  return out;
}

export function build() {
  const inv = readJSON(D + 'grammar-inventory.json').points, cloze = readJSON(D + 'drills.json').cloze, files = {};
  const pts = inv.filter(p => LV.includes(p.level)), c = conjItems(inv), dr = Object.fromEntries(LV.map(l => [l, []]));
  for (const p of pts) for (const it of cloze[p.id] || []) dr[p.level].push(['g', p.id, it.s, it.a, it.o, it.en]);
  for (const l of LV) dr[l].push(...c[l]);
  files['dr.js'] = `self.ESX=self.ESX||{};ESX.dr=${JSON.stringify(dr)};\n`;
  for (const l of GX_LANGS) {
    const src = readJSON(`${D}gx/${l}.json`), o = {};
    for (const p of pts) if (src[p.id]) o[p.id] = [src[p.id].t, src[p.id].x];
    files[`gx-${l}.js`] = `self.ESX=self.ESX||{};(ESX.gx=ESX.gx||{})[${JSON.stringify(l)}]=${JSON.stringify(o)};\n`;
  }
  Object.assign(files, buildPx().files); // gói phát âm W3 (px.js + px-<ngôn ngữ>.js) cùng thư mục, cùng kiểm 'cũ so với nguồn' / mồ côi
  Object.assign(files, buildExam().files); // gói luyện định dạng DELE/SIELE W5 (x-<cấp>.js + x-ui-<ngôn ngữ>.js)
  Object.assign(files, buildPath(pts, buildPx().topics).files); // gói lộ trình ngày W4 (wd/dy/cl + bản dịch 15 ngôn ngữ)
  return { files, dr, pts, cloze };
}

// Câu đọc to của một câu hỏi (đáp án điền sẵn; bài chia động từ: bỏ phần "(động từ)") – js/espr.js dùng đúng phép biến đổi này
export const sayText = it => it[2].replace('___', it[3]).replace(/\s*\([^)]*\)/, '');
