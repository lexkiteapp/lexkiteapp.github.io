#!/usr/bin/env node
// Hồi quy bộ chia động từ tiếng Pháp (scripts/target/conj-fr.mjs, french-course.md W2) – 0 mạng. Kiểm chéo đầy đủ với Wiktionary trên CI: conj-check.mjs --tl fr.
// Mỗi dòng: động từ | khóa | 6 ngôi (hoặc dạng) – đủ lớp: nhóm 1 (ç/ge, è, -eler/-eter, -oyer), nhóm 2, nhóm 3 theo kiểu (partir, ouvrir, -re, -indre, -uire, -aître), bất quy tắc mạnh, phái sinh, thì ghép (être + hợp số).
import { conjugate, form, TENSES, PERSONS } from '../target/conj-fr.mjs';
const G = `
parler|pres|parle parles parle parlons parlez parlent
commencer|pres|commence commences commence commençons commencez commencent
commencer|ps|commençai commenças commença commençâmes commençâtes commencèrent
manger|impf|mangeais mangeais mangeait mangions mangiez mangeaient
acheter|fut|achèterai achèteras achètera achèterons achèterez achèteront
appeler|pres|appelle appelles appelle appelons appelez appellent
jeter|fut|jetterai jetteras jettera jetterons jetterez jetteront
préférer|pres|préfère préfères préfère préférons préférez préfèrent
nettoyer|fut|nettoierai nettoieras nettoiera nettoierons nettoierez nettoieront
finir|pres|finis finis finit finissons finissez finissent
finir|subj|finisse finisses finisse finissions finissiez finissent
partir|pres|pars pars part partons partez partent
ouvrir|pres|ouvre ouvres ouvre ouvrons ouvrez ouvrent
vendre|pres|vends vends vend vendons vendez vendent
peindre|pres|peins peins peint peignons peignez peignent
conduire|ps|conduisis conduisis conduisit conduisîmes conduisîtes conduisirent
connaître|pres|connais connais connaît connaissons connaissez connaissent
être|pres|suis es est sommes êtes sont
être|subj|sois sois soit soyons soyez soient
avoir|ps|eus eus eut eûmes eûtes eurent
aller|fut|irai iras ira irons irez iront
aller|subj|aille ailles aille allions alliez aillent
faire|pres|fais fais fait faisons faites font
dire|pres|dis dis dit disons dites disent
pouvoir|subj|puisse puisses puisse puissions puissiez puissent
vouloir|subj|veuille veuilles veuille voulions vouliez veuillent
venir|ps|vins vins vint vînmes vîntes vinrent
venir|subjImpf|vinsse vinsses vînt vinssions vinssiez vinssent
prendre|subj|prenne prennes prenne prenions preniez prennent
comprendre|pres|comprends comprends comprend comprenons comprenez comprennent
écrire|pres|écris écris écrit écrivons écrivez écrivent
décrire|ps|décrivis décrivis décrivit décrivîmes décrivîtes décrivirent
voir|fut|verrai verras verra verrons verrez verront
boire|pres|bois bois boit buvons buvez boivent
devoir|part|dû
naître|part|né
cueillir|fut|cueillerai cueilleras cueillera cueillerons cueillerez cueilleront
envoyer|fut|enverrai enverras enverra enverrons enverrez enverront
savoir|ppres|sachant
parler|pc|ai parlé as parlé a parlé avons parlé avez parlé ont parlé
aller|pc|suis allé es allé est allé sommes allés êtes allés sont allés
venir|plup|étais venu étais venu était venu étions venus étiez venus étaient venus
finir|futAnt|aurai fini auras fini aura fini aurons fini aurez fini auront fini
partir|futProche|vais partir vas partir va partir allons partir allez partir vont partir
arriver|passeRecent|viens d'arriver viens d'arriver vient d'arriver venons d'arriver venez d'arriver viennent d'arriver
se lever|pres|lève lèves lève levons levez lèvent
`.trim().split('\n');
let n = 0, bad = 0;
const words = (v, t) => t === 'part' || t === 'ppres' ? [form(v, t)] : form(v, t).map(x => x.split(' ')).flat();
for (const line of G) {
  const [v, t, want] = line.split('|'); n++;
  const got = words(v, t).join(' ');
  if (got !== want) { bad++; console.error(`✗ ${v} ${t}: ${got} ≠ ${want}`); }
}
const imp = conjugate('parler').imp, impA = conjugate('aller').imp, impE = conjugate('être').imp;
for (const [c, m] of [[imp.tu === 'parle', 'imp parle (không -s)'], [impA.tu === 'va', 'imp va'], [impE.vous === 'soyez', 'imp soyez'], [conjugate('aller').aux === 'être' && conjugate('parler').aux === 'avoir' && conjugate('se lever').aux === 'être', 'trợ être/avoir/phản thân']]) { n++; if (!c) { bad++; console.error('✗ ' + m); } }
if (PERSONS.length !== 6 || !TENSES.includes('subjPasse')) { bad++; console.error('✗ PERSONS/TENSES'); }
if (bad) { console.error(`✗ fr-conjugate: ${bad}/${n} lệch`); process.exit(1); }
console.log(`✓ fr-conjugate: ${n} dạng khớp (đủ lớp nhóm 1–3, bất quy tắc, phái sinh, thì ghép)`);
