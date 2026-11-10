// Chuẩn hóa NGUỒN i18n/ui/<lang>.js và i18n/ui/<lang>/<nhóm>.js: gộp mọi Object.assign + khóa trùng (dòng sau ghi đè dòng trước)
// thành mỗi khóa một dòng, sắp xếp (scripts/lib/i18n-src.mjs). Dùng sau khi giải xung đột merge (mergecheck.sh xóa dấu xung đột = hợp 2 bên),
// rồi chạy node scripts/i18n-pack.mjs (sinh lại gói khóa băm web/js/i18n/<lang>). Idempotent: tệp đã chuẩn không đổi.
const fs=require('fs'), path=require('path');
const LANGS=fs.readFileSync('scripts/i18n-langs.txt','utf8').split('\n').map(s=>s.trim()).filter(s=>s&&!s.startsWith('#'));
import('./lib/i18n-src.mjs').then(({ normSrc }) => {
  let n=0;
  for (const L of LANGS) {
    const files=[`i18n/ui/${L}.js`, ...(fs.existsSync(`i18n/ui/${L}`)?fs.readdirSync(`i18n/ui/${L}`).filter(f=>f.endsWith('.js')).map(f=>path.join('i18n/ui',L,f)):[])];
    for (const f of files) { if (!fs.existsSync(f)) continue; const a=fs.readFileSync(f,'utf8'), b=normSrc(a); if (a!==b) { fs.writeFileSync(f,b); n++; console.log(f, '→ chuẩn hóa'); } }
  }
  console.log(`✓ i18n-dedupe: ${n} tệp chuẩn hóa`);
});
