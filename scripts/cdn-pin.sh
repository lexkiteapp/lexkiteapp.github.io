#!/usr/bin/env bash
# Giảm băng thông máy chủ chính: các FILE DỮ LIỆU thuần (đề thi, từ vựng, ngữ pháp, bài mẫu…) tải từ GitHub Pages
# (bản dự phòng tự deploy mỗi lần push; nhanh như Firebase, hạn mức ~100 GB/tháng). File mã xử lý luôn lấy từ Firebase để không lệch phiên bản.
# Chỉ bật khi GitHub Pages đã deploy xong đúng commit hiện tại; file nào khác nội dung → lấy từ Firebase.
set -uo pipefail
cd "$(dirname "$0")/.."
PAGES="https://lexkiteapp.github.io/"
SHA=$(git rev-parse HEAD)
ok=""
for try in $(seq 1 20); do   # chờ tối đa ~5 phút cho GitHub Pages deploy commit này
  st=$(curl -s -m 20 "https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/workflows/pages.yml/runs?head_sha=$SHA&per_page=1" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const r=JSON.parse(s).workflow_runs[0];console.log(r?r.status+':'+r.conclusion:'none')}catch(e){console.log('err')}})")
  [ "$st" = "completed:success" ] && { ok=1; break; }
  case "$st" in completed:*) break;; esac
  sleep 15
done
NODE_USE_ENV_PROXY=1 node - "$PAGES" "$ok" <<'JS'
const fs = require('fs'), crypto = require('crypto');
const [PAGES, ok] = process.argv.slice(2);
const DATA = /^js\/(lib\/|readtest\/(test\d|explain)|listen\/test|toeic\/(reading|listening)\d|grammar\/|toefl\/data|write\/|speak\/|pron\/(sounds|skills)|readings|lexis|models|ideas)/;
const src = fs.readFileSync('web/js/app.js', 'utf8'), a = src.indexOf("const G = 'js/grammar/', BUNDLES = {"), b = src.indexOf('\n  };', a);
const files = [...new Set(Object.values(new Function(src.slice(a, b + 4) + ';return BUNDLES')()).flat())].filter(f => DATA.test(f));
let h = fs.readFileSync('dist/app/index.html', 'utf8').replace(/\n  <script type="application\/json" id="vb-cdn">[^<]*<\/script>/, '');
if (!ok) { fs.writeFileSync('dist/app/index.html', h); console.log('⚠ GitHub Pages chưa deploy commit này – lần này dùng Firebase cho mọi file'); process.exit(0); }
(async () => {
  const good = [];
  await Promise.all(files.map(async f => { // nội dung trên Pages phải trùng bản đang phát hành
    try { const r = await fetch(PAGES + f + '?v=' + Date.now()); const t = await r.text(); if (r.ok && t === fs.readFileSync('web/' + f, 'utf8')) good.push(f); } catch (e) { /* bỏ qua */ }
  }));
  h = h.replace('  <meta name="theme-color"', `  <script type="application/json" id="vb-cdn">${JSON.stringify({ base: PAGES, files: good.sort() })}</script>\n  <meta name="theme-color"`);
  fs.writeFileSync('dist/app/index.html', h);
  console.log(`✓ CDN phụ: ${good.length}/${files.length} file dữ liệu qua GitHub Pages`);
})();
JS
