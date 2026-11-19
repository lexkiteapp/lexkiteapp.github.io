#!/usr/bin/env node
// Hồi quy bộ chia động từ es-419 (scripts/target/conjugate.mjs) – 0 mạng. Kiểm chéo đầy đủ với Wiktionary chạy trên CI: scripts/target/conj-check.mjs.
// Mỗi dòng: động từ | khóa | 5 ngôi (hoặc 1 dạng) – chọn đủ lớp: đều, đổi gốc, chính tả, -uir, gốc nguyên âm, bất quy tắc mạnh, ghép, dấu i/ú.
import { conjugate, form, TENSES, PERSONS } from '../target/conjugate.mjs';
const G = `
hablar|pret|hablé hablaste habló hablamos hablaron
tener|pres|tengo tienes tiene tenemos tienen
ser|subj|sea seas sea seamos sean
ir|imp|ve vaya vamos vayan
pedir|pret|pedí pediste pidió pedimos pidieron
dormir|subj|duerma duermas duerma durmamos duerman
seguir|pres|sigo sigues sigue seguimos siguen
conocer|subj|conozca conozcas conozca conozcamos conozcan
construir|pret|construí construiste construyó construimos construyeron
leer|pret|leí leíste leyó leímos leyeron
oír|pres|oigo oyes oye oímos oyen
jugar|subj|juegue juegues juegue juguemos jueguen
buscar|pret|busqué buscaste buscó buscamos buscaron
enviar|pres|envío envías envía enviamos envían
continuar|subj|continúe continúes continúe continuemos continúen
mantener|imp|mantén mantenga mantengamos mantengan
prever|pret|preví previste previó previmos previeron
predecir|fut|predeciré predecirás predecirá predeciremos predecirán
satisfacer|pret|satisfice satisficiste satisfizo satisficimos satisficieron
sonreír|pres|sonrío sonríes sonríe sonreímos sonríen
conducir|pret|conduje condujiste condujo condujimos condujeron
elegir|pres|elijo eliges elige elegimos eligen
haber|imp|he haya hayamos hayan
hacer|subjImpf|hiciera hicieras hiciera hiciéramos hicieran
decir|ger|diciendo
tener|subjFut|tuviere tuvieres tuviere tuviéremos tuvieren
terminar|pretAnt|hube terminado hubiste terminado hubo terminado hubimos terminado hubieron terminado
volver|part|vuelto
rehacer|pret|rehíce rehiciste rehízo rehicimos rehicieron
discernir|pret|discerní discerniste discernió discernimos discernieron
avergonzar|pres|avergüenzo avergüenzas avergüenza avergonzamos avergüenzan
teñir|ger|tiñendo
empezar|subj|empiece empieces empiece empecemos empiecen
vencer|pres|venzo vences vence vencemos vencen
tener|perf|he tenido has tenido ha tenido hemos tenido han tenido
leer|prog|estoy leyendo estás leyendo está leyendo estamos leyendo están leyendo
irse|irA|voy a ir vas a ir va a ir vamos a ir van a ir`;
let bad = 0, n = 0;
for (const line of G.trim().split('\n')) {
  const [v, k, want] = line.split('|'); n++;
  const got = form(v, k), s = Array.isArray(got) ? got.join(' ') : typeof got === 'object' ? Object.values(got).join(' ') : got;
  if (s !== want) { bad++; console.log(`✗ ${v} ${k}: ${s}\n   muốn: ${want}`); }
}
// mọi khóa thì có 5 ngôi (trừ phi ngôi / mệnh lệnh), không vosotros
for (const k of TENSES) { const f = form('trabajar', k); if (['ger', 'part'].includes(k) ? typeof f !== 'string' : ['imp', 'impNeg'].includes(k) ? Object.keys(f).length !== 4 : f.length !== PERSONS.length) { bad++; console.log('✗ khóa thì ' + k + ' sai số ngôi'); } }
const all = c => Object.values(c).flatMap(x => typeof x === 'object' ? Object.values(x) : [x]);
for (const v of ['hablar', 'tener', 'ir', 'decir']) if (all(conjugate(v)).some(f => /(áis|éis|ais|eis)$/.test(f))) { bad++; console.log('✗ dạng vosotros lọt vào ' + v); }
try { conjugate('casa'); bad++; console.log('✗ nhận "casa" là động từ'); } catch {}
if (bad) { console.log(`✗ es-conjugate: ${bad} lỗi`); process.exit(1); }
console.log(`✓ es-conjugate: ${n} dãy chuẩn + ${TENSES.length} khóa thì`);
