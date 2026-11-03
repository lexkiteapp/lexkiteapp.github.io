// Gộp mọi dòng Object.assign trong NGUỒN i18n/ui/<lang>.js và i18n/ui/<lang>/<nhóm>.js thành 1 từ điển (dòng sau ghi đè dòng trước).
// Dùng sau khi giải xung đột merge các file này, rồi chạy node scripts/i18n-pack.mjs (sinh lại gói khóa băm web/js/i18n/<lang>).
const fs=require('fs'), path=require('path');
const LANGS=fs.readFileSync('scripts/i18n-langs.txt','utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
for (const L of LANGS) {
  const files=[`i18n/ui/${L}.js`, ...(fs.existsSync(`i18n/ui/${L}`)?fs.readdirSync(`i18n/ui/${L}`).filter(f=>f.endsWith('.js')).map(f=>path.join('i18n/ui',L,f)):[])];
  for (const f of files) {
    const src=fs.readFileSync(f,'utf8'), lines=src.split('\n');
    if ((src.match(/Object\.assign\(/g)||[]).length<2) continue;
    const g={I18N_DICT:{}}; new Function('self','globalThis',src.replace(/\(typeof self !== 'undefined' \? self : this\)/g,'(self)'))(g,g);
    const d=g.I18N_DICT[L]; const head=lines[0].startsWith('/*')?lines[0]+'\n':'';
    const out=head+`(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D["${L}"] = Object.assign(D["${L}"] || {}, ${JSON.stringify(d)}); })(typeof self !== 'undefined' ? self : this);\n`;
    fs.writeFileSync(f,out); console.log(f, lines.length, '->', out.split('\n').length, Object.keys(d).length,'keys');
  }
}
