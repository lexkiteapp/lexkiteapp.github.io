// Mỗi web/js/i18n/<lang>.js chỉ được có 1 dòng từ điển – merge tự động hay ghép 2 dòng làm file phình gấp đôi (xem METHODS 20/10/2026).
import fs from 'node:fs';
const bad = ['ar','de','es','fr','hi','id','ja','ko','pt','ru','th','tr','zh'].filter(l => (fs.readFileSync(`web/js/i18n/${l}.js`, 'utf8').match(/Object\.assign\(/g) || []).length > 1);
if (bad.length) { console.error(`✗ i18n-single: ${bad.join(', ')} có nhiều dòng từ điển – chạy node scripts/i18n-dedupe.cjs`); process.exit(1); }
console.log('✓ i18n-single: mỗi ngôn ngữ 1 từ điển');
