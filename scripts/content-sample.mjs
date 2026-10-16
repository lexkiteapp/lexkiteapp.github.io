// Lấy ngẫu nhiên N mục nội dung mới trong một commit (các dòng thêm vào file web/js/** hoặc content/**) để nghiệm thu đọc tay.
// Dùng: node scripts/content-sample.mjs <commit> [N=5]   (docs/CONTENT-PIPELINE.md §5)
import { execFileSync } from 'child_process';
const [c = 'HEAD', n = '5'] = process.argv.slice(2);
const diff = execFileSync('git', ['show', '--format=', '--unified=0', c, '--', 'web/js', 'content'], { encoding: 'utf8', maxBuffer: 64 << 20 });
const add = diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++') && l.replace(/[\s+{}\[\],]/g, '').length > 40).map(l => l.slice(1).trim());
for (let i = add.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [add[i], add[j]] = [add[j], add[i]]; }
console.log(`${add.length} dòng nội dung mới trong ${c} – mẫu ${Math.min(+n, add.length)}:\n`);
add.slice(0, +n).forEach((l, i) => console.log(`${i + 1}. ${l.slice(0, 700)}\n`));
