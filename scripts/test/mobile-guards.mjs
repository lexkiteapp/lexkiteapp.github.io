// 📱 Chặn tái phát lỗi web mobile tìm được bởi mobile-qa.yml (scripts/test/mobile-qa.mjs) – kiểm tĩnh, chạy trong npm test.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const R = fileURLToPath(new URL('../../', import.meta.url)), rd = f => fs.readFileSync(R + f, 'utf8');
let fail = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} mobile-guards: ${m}`); if (!c) fail++; };
const app = rd('web/js/app.js'), dict = rd('web/js/dict-page.js'); // trang #/dict tách khỏi app.js (gói lười dictp) 01/11
const pf = (app.match(/App\.prefetchAll = [^\n]+/) || [''])[0];
ok(/let inflight = 0/.test(app) && /inflight\+\+/.test(app) && /finally\(\(\) => \{ inflight--; \}\)/.test(app), 'đếm số gói đang tải (need1)');
ok(/inflight \|\| document\.readyState !== 'complete'/.test(pf), 'tải sẵn chỉ bắt đầu khi trang đã load và không còn gói đang tải (không giành băng thông 4G với trang đang mở → LCP)');
ok(/l\.onload = l\.onerror = next/.test(pf) && /for \(let i = 0; i < 3; i\+\+\) next\(\)/.test(pf) && !/\.forEach\(f => \{ const l = document\.createElement\('link'\)/.test(pf), 'tải sẵn xếp hàng 3 file một lúc (không đổ 200+ <link prefetch> cùng lúc)');
const css = rd('web/css/style.css') + rd('web/css/lazy-ui.css'); // luật trang lười ở lazy-ui.css (scripts/test/css-lazy.mjs)
ok(/\.top-stats #installBtn \{[^}]*min-width: 44px[^}]*min-height: 44px/.test(css), 'nút cài app ở thanh trên ≥ 44×44 (360 px từng là 38×35)');
const appSrc = fs.readFileSync('web/js/app.js', 'utf8'), bip = appSrc.slice(appSrc.indexOf("addEventListener('beforeinstallprompt'")).split('\n')[0];
ok(/addEventListener\('hashchange', showInstallBtn, \{ once: true \}\)/.test(bip) && !/\bshowInstallBtn\(\)/.test(bip), 'beforeinstallprompt không chèn nút ngay: thanh trên không xê dịch khi đang đọc (CLS, J8)');
ok(/\[data-go\]'\)\.onclick = \(\) => \{ n\.remove\(\); showInstallBtn\(\);/.test(appSrc), 'gợi ý cài app vẫn mở được khi nút chưa được chèn');
const rt = app.slice(app.indexOf('const b = [].concat(ROUTE_BUNDLE[name]'), app.indexOf('await App.need(...b)'));
ok(/document\.body\.classList\.toggle\('focus'/.test(rt) && (app.match(/classList\.toggle\('focus'/g) || []).length === 1, 'chế độ tập trung (ẩn thanh trên) bật NGAY đầu route, trước khi đợi tải gói (CLS 0,07–0,09 khi vào ôn/luyện)');
ok(/const mo = new MutationObserver\(crumb\); mo\.observe\(view, \{ childList: true \}\)/.test(app) && /finally \{ mo\.disconnect\(\); \}/.test(app), 'breadcrumb chèn ngay khi trang vẽ .page-head (không đợi dữ liệu → CLS từ điển 0,04–0,05)');
const b = JSON.parse(rd('scripts/test/mobile-qa.budget.json'));
ok(b['tap<44'] === 0 && b.hscroll === 0 && b['kbd-cover'] === 0 && b.cls <= 0.1 && b.inp_ms <= 200 && b.lcp_ms <= 2500 && b.lcp_deep_ms <= 10000 && b.tbt_ms <= 200, 'ngân sách mobile-qa không bị nới (44 px, 0 tràn, CLS ≤ 0,1, INP ≤ 200 ms, LCP ≤ 2,5 s)');
const MQA = rd('.github/workflows/mobile-qa.yml');
ok(/serve-web\.mjs out\/site 8080/.test(MQA), 'mobile-qa đo qua máy chủ có nén (như Cloudflare), không dùng python http.server');
ok(/app-loader\.mjs out\/site\/app\/index\.html/.test(MQA) && /esbuild@[\d.]+ .*--minify .*--outdir=\.\.\/out\/site/.test(MQA), 'mobile-qa đo bản phát hành như build-web.sh (JS khung app nạp sau lần vẽ đầu + rút gọn), không đo web/ thô');
{ const pd = rd('web/js/path-day.js');
  ok(/topIx\.m\.get\(id\)/.test(app) && /ds = days\(\);\n\s*await yieldMain\(\); if \(location\.hash !== h0\) return;/.test(pd) && /put\(chunk\(Math\.min\(flat\.length, Math\.max\(10, ciDay \+ 5\)\)\)\);/.test(pd) && /put\(chunk\(Math\.min\(flat\.length, pos \+ 8\)\)\);/.test(pd) && /await nextFrame\(\); if \(!body\.isConnected\) return;/.test(pd) && /requestAnimationFrame\(go\)/.test(pd), 'lộ trình: topicOf tra Map + nhường luồng trước khi vẽ + chặng đang mở vẽ theo lô NGÀY (lô đầu tới ngày hiện tại + 4, ≥ 10 ngày; sau đó 8 ngày/khung hình) (TBT #/path 197–245 ms)'); }
ok(/notesMem\.get\(w\)/.test(app) && /await Promise\.race\(\[App\.notesReady\(full\.word\)/.test(dict), 'từ điển: khối Hiểu sâu nhớ theo từ + chờ trước lần vẽ đủ → không chèn muộn phía trên ô lưu (CLS 0,66–0,68 #/dict @360)');
{ const sv = dict.indexOf('id="saveCard"'), ph = dict.indexOf('<div id="phraseBox"></div>'), rl = dict.indexOf('<div id="related"></div>');
  ok(sv > 0 && ph > sv && rl > ph, 'từ điển: khối cụm từ (Lex.phrases) + từ liên quan (Datamuse, mạng ngoài) nằm SAU ô lưu → về muộn không gây CLS (0,66 @360)'); }
{ const st = rd('web/js/study.js'), ds = rd('web/js/distract.js');
  ok(/startWhen\(Promise\.all\(\[warmLib\(\), window\.VImg && VImg\.need \? VImg\.need\(items\.map\(w => w\.word\)\) : null\]\), next\)/.test(st) && /startWhen\(warmLib\(\)\.then\(\(\) => preDis\(seq\[0\]\)\), next\)/.test(st) && /view\.prepend\(bar\)/.test(st) && /setTimeout\(\(\) => preDis\(nq\), 0\)/.test(st) && /async function pickAsync\(/.test(ds) && /performance\.now\(\) - t0 < 8/.test(st) && /async function warm\(pool/.test(ds) && /Date\.now\(\) - t0 < 8/.test(ds),
    'trắc nghiệm/học thông minh: kho từ (+ mảnh chỉ mục ảnh VImg ở học thông minh) + bộ nhớ Distract làm nóng theo lát ≤ 8 ms trước câu đầu; phương án nhiễu tính theo lát (pickAsync) trước câu đầu và lúc rảnh cho câu sau (TBT #/practice từng 205–418 ms)'); }
{ const tf = rd('web/js/toefl.js'), sb = rd('scripts/build-stitch-css.mjs'), gap = (css.match(/^\.gap \{[^}]*\}/m) || [''])[0], lhCw = +((css.match(/^\.cw-text \{[^}]*line-height: ([\d.]+)/m) || [])[1] || 0);
  ok(/<label class="cw-slot">\$\{pre\}<input class="gap cw"[^>]*style="--n:\$\{miss\.length\}"/.test(tf) && !/data-cw[^>]*width:\$\{miss/.test(tf) && /line-height: 1\.25/.test(gap) && /vertical-align: baseline/.test(gap) && /\.gap\.cw \{[^}]*width: calc\(var\(--n, 2\) \* 1ch/.test(css) && /\.cw-slot::after \{[^}]*min-width: 44px;[^}]*min-height: 44px/.test(css) && lhCw * 16.32 >= 44, // 1.02rem × line-height
    'điền chữ (TOEFL Complete the Words): ô inline rộng theo số chữ thiếu (ch), line-height riêng (không kéo line-height 2.3 của đoạn → ô cao hơn dòng, lệch gạch chân), vùng chạm 44 px ở nhãn bọc ngoài, dòng ≥ 44 px để vùng chạm không chồng nhau');
  ok(/\.bottom-nav:not\(\.st-nav\) a span \{/.test(css) && /\.bottom-nav:not\(\.st-nav\) a\.active span \{/.test(css) && !/^\.bottom-nav a(\.active)? span \{/m.test(css) && !/\.st-tab\.active \.st-tabi\{background/.test(sb),
    'thanh tab Stitch: tab đang chọn MỘT khối nền (viên nền icon/nhãn của thanh cũ không lọt vào .st-nav; .st-tabi không nền riêng) – từng thành 2–3 khối chồng nhau ở tab Luyện');
  ok(/^html \{ scroll-padding-top: calc\(72px \+ env\(safe-area-inset-top, 0px\)\); \}/m.test(css), 'focus/anchor/scrollIntoView dừng dưới thanh trên dính (tiêu đề thẻ không bị che)'); }
// Màn Stitch v2 (ux1 train): đầu trang dính có vùng an toàn (pt-safe/pb-safe phải được định nghĩa) + ::after mở vùng chạm có min ≥ 44 px (cổng mobile-qa đo min-width/min-height)
{ const sv = rd('web/css/st-v2-ux1-pre.css'), sh = rd('web/js/st/v2/shell.js'); // tiền tố chung gói ux1 (build-stitch-css SHARED) – practice.css trỏ về nó
  ok(/tiền tố chung: css\/st-v2-ux1-pre\.css/.test(rd('web/css/st-v2-practice.css')) && /'css\/st-v2-ux1-pre\.css', 'css\/st-v2-path\.css'/.test(rd('web/js/app.js')), 'gói ux1 nạp tiền tố chung st-v2-ux1-pre.css trước các màn v2');
  ok(!/pt-safe/.test(sh) || /\.st \.pt-safe\{padding-top:env\(safe-area-inset-top/.test(sv), 'lớp pt-safe của đầu trang Stitch có luật env(safe-area-inset-top)');
  ok(/\.st \.pb-safe\{padding-bottom:env\(safe-area-inset-bottom/.test(sv), 'lớp pb-safe có luật env(safe-area-inset-bottom)');
  ok(/:is\(a,button\)\[class\*="after:absolute"\]::after\{min-width:44px;min-height:44px\}/.test(sv), 'liên kết/nút mở vùng chạm bằng ::after có min 44 × 44 px'); }
// Một nút đổi ngôn ngữ (đo render thật: topbar-lang.mjs): khung máy tính không tự vẽ viên thứ hai cạnh #langBtn; viên thanh trên cùng một token cao, viên chuỗi không nền/viền riêng
{ const sv = rd('web/css/st-v2-ux1-pre.css');
  ok(!/data-act="\$\{e\('lang'\)\}"/.test(rd('web/js/st/v2/today-desk.js')), 'today-desk không có nút ngôn ngữ riêng (thanh trên đã có #langBtn)');
  ok(/body\.ux1 \.topbar \.icon-btn,body\.ux1 \.topbar \.avatar\{width:var\(--tap,44px\);height:var\(--tap,44px\)/.test(sv) && !/\.topbar \.pill\.fire\{border-color/.test(sv), 'viên thanh trên cùng token --tap; viên chuỗi không viền riêng'); }
// INP quiz (mqa: bấm đáp án sai ở practice/mcq 216 ms @4×): lượt bấm chỉ tô đáp án + vẽ bảng phản hồi; ghi lỗi, âm/rung, đọc to, 💡 giải thích chạy sau lần vẽ (later), không ép layout trong pick
{ const st = rd('web/js/study.js'), fin = st.slice(st.indexOf('const finish = (ok, given, ty) => {'), st.indexOf("if (q.type === 'mcq-vi' || q.type === 'mcq-en')")), pk = st.slice(st.indexOf('const pick = b => {'), st.indexOf("$$('.option', box).forEach(b => b.onclick = () => pick(b))"));
  ok(/const later = f => requestAnimationFrame\(\(\) => setTimeout\(f, 0\)\)/.test(st), 'study.js có later() = sau lần vẽ kế tiếp');
  ok(/later\(\(\) => \{\s*if \(!ok && App\.logMistake\)[\s\S]*?Sfx\.answer\(ok, \{ badge: false \}\);[^\n]*\n\s*\}\);/.test(fin), 'finish: ghi lỗi + âm/rung chạy trong later');
  ok(/later\(\(\) => FX\.explain\(/.test(fin) && /later\(\(\) => speak\(w\.word/.test(fin), 'finish: giải thích + đọc to chạy trong later');
  ok(!/offsetWidth|offsetHeight|getBoundingClientRect/.test(pk) && !/const fit = [^\n]*\}; fit\(\);/.test(fin), 'pick/finish không ép layout đồng bộ (offsetWidth/fit) trong lượt bấm'); }
if (fail) { console.error(`✗ mobile-guards: ${fail} lỗi`); process.exit(1); }
console.log('✓ mobile-guards: đạt');
