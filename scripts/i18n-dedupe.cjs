// Gộp mọi dòng Object.assign trong web/js/i18n/<lang>.js thành 1 từ điển (dòng sau ghi đè dòng trước). Dùng sau khi giải xung đột merge các file này.
const fs=require('fs');
for (const L of ['ar','de','es','fr','hi','id','ja','ko','pt','ru','th','tr','zh']) {
  const f=`web/js/i18n/${L}.js`, src=fs.readFileSync(f,'utf8'), lines=src.split('\n');
  const g={I18N_DICT:{}}; new Function('self','globalThis',src.replace(/\(typeof self !== 'undefined' \? self : this\)/g,'(self)'))(g,g);
  const d=g.I18N_DICT[L]; const head=lines[0].startsWith('/*')?lines[0]+'\n':'';
  const out=head+`(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D["${L}"] = Object.assign(D["${L}"] || {}, ${JSON.stringify(d)}); })(typeof self !== 'undefined' ? self : this);\n`;
  fs.writeFileSync(f,out); console.log(L, lines.length, '->', out.split('\n').length, Object.keys(d).length,'keys');
}
