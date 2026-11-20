// Cổng ngân sách thời gian job (20/11): wordlists chờ word-packs tối đa N phút nhưng trần job 75' < 90' → cancelled 5 lượt liền; word-packs cả vòng sát trần 150' → cancelled trước bước lưu.
// Luật: (1) trần job ≥ thời gian chờ + 45'; (2) ngân sách vòng word-packs + 25'/ngôn ngữ + 15' đối chiếu < trần job; (3) không còn nhánh "bỏ lượt im lặng".
import fs from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { console.log('✗ ci-wait-budget: ' + m); bad++; } };
const rd = f => fs.readFileSync(new URL('../../.github/workflows/' + f, import.meta.url), 'utf8');
const wl = rd('wordlists.yml'), wp = rd('word-packs.yml');
const tmo = s => +/timeout-minutes:\s*(\d+)/.exec(s)?.[1];
const wait = +/seq 1 (\d+)/.exec(wl)?.[1];
ok(wait > 0 && tmo(wl) >= wait + 45, `wordlists: trần job ${tmo(wl)}' phải ≥ chờ ${wait}' + 45'`);
ok(!/SKIP=1/.test(wl) && /exit 1/.test(wl), 'wordlists: quá hạn chờ phải đỏ, không bỏ im lặng');
const budget = +/"\$SECONDS" -ge (\d+)/.exec(wp)?.[1] / 60, per = +/timeout (\d+) node scripts\/gen-word-packs/.exec(wp)?.[1] / 60;
ok(budget > 0 && per > 0 && budget + per + 15 < tmo(wp), `word-packs: ngân sách ${budget}' + ${per}' + đối chiếu 15' phải < trần ${tmo(wp)}'`);
ok(/\(i \+ off\) % n/.test(wp), 'word-packs: phải xoay ngôn ngữ bắt đầu để không bỏ đói ngôn ngữ cuối');
if (bad) process.exit(1); console.log(`✓ ci-wait-budget: wordlists chờ ${wait}' ≤ trần ${tmo(wl)}'; word-packs ngân sách ${budget}' < trần ${tmo(wp)}'`);
