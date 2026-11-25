// Vùng chạm ≥ 44 px cho liên kết chữ đứng riêng (Vì sao?, ← Ngữ pháp, Chuyển sang Task 1, email liên hệ): luật ::after phải còn trong style.css và khớp markup thật.
import fs from 'node:fs';
const css = fs.readFileSync('web/css/style.css', 'utf8');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } else console.log('✓', m); };
const blk = css.slice(css.lastIndexOf('@media (pointer: coarse) {\n  .row.between > a.small'));
ok(/\.row\.between > a\.small::after/.test(blk) && /var\(--tap/.test(blk) && /position: absolute/.test(blk), 'luật ::after dùng token --tap');
const src = (f) => fs.readFileSync(f, 'utf8');
ok(/class="row between"[^`]*<a class="small" href="#\/method"/.test(src('web/js/stats-page.js')), 'stats "Vì sao?" khớp .row.between > a.small');
ok(/class="row between"><a href="#\/grammar" class="small">/.test(src('web/js/grammar.js')), 'grammar "← Ngữ pháp" khớp .row.between > a.small');
ok(/<p class="muted"><a href="#\/task1">/.test(src('web/js/write.js')), 'write "Chuyển sang Task 1" khớp .page-head p.muted > a');
ok(/<p class="small muted"[^>]*>[^<]*<a href="mailto:support@lexkite\.com">/.test(src('web/js/app.js').replace(/\$\{[^}]*\}/g, '')), 'liên hệ email khớp p.small.muted > a[mailto]');
process.exit(bad ? 1 : 0);
