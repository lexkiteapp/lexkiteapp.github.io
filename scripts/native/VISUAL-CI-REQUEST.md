# Yêu cầu CI – native visual QC (cho coordinator; file này chỉ là bản nháp, không phải workflow)

Cổng: `node scripts/test/native-visual.mjs` (không phụ thuộc gói ngoài; PNG đọc bằng `node:zlib`). Đọc ảnh snapshot **đã commit** (`native/ios/.../__Snapshots__/**`, `native/android/app/src/test/snapshots/*.png`) nên **không cần artifact chéo workflow** (không `workflow_run`, không fan-out). Chưa có ảnh → qua kèm `::notice::`.

1. Thêm vào `scripts/test/suite.txt`: `node scripts/test/native-visual.mjs --self-test` (≈1.5 s, ảnh giả trong `scripts/test/fixtures/native-visual/`; làm lại fixture: `--self-test --write-fixtures`).
2. Workflow mới `.github/workflows/native-visual.yml` (chạy trên ubuntu, ≈ 2–4 phút; cột web chỉ để so mắt, bước cổng mới chặn):

```yaml
# 🎨 Native ↔ web visual QC: ảnh snapshot iOS/Android phải đúng màu token + mốc bố cục (thanh 5 tab, nút chính); tờ so sánh với Stitch render (web) làm artifact.
name: Native visual QC
on:
  pull_request:
    paths: ['native/**/__Snapshots__/**', 'native/android/app/src/test/snapshots/**', 'native/shared/gen/**', 'brand/stitch/tokens.dtcg.json', 'brand/stitch/v2/today-*.html', 'scripts/native/visual-*', 'scripts/test/native-visual.mjs', 'scripts/test/fixtures/native-visual/**', '.github/workflows/native-visual.yml']
  workflow_dispatch:
permissions:
  contents: read
concurrency:
  group: native-visual-${{ github.ref }}
  cancel-in-progress: true
jobs:
  visual:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - name: Tự kiểm (ảnh giả)
        run: node scripts/test/native-visual.mjs --self-test
      - name: Vẽ web Stitch (Hôm nay sáng/tối, 390 px) làm cột so sánh
        continue-on-error: true     # chỉ là ảnh tham chiếu; không làm đỏ cổng
        run: |
          npm i --no-save --no-audit --no-fund playwright@1.48.2 pngjs@7.0.0
          npx playwright install --with-deps chromium >/dev/null
          sudo apt-get install -y -qq imagemagick fonts-noto-core fonts-noto-color-emoji >/dev/null || true
          mkdir -p "$RUNNER_TEMP/today" && cp brand/stitch/v2/today-light.html brand/stitch/v2/today-dark.html "$RUNNER_TEMP/today/"
          node scripts/test/stitch-render.mjs "$RUNNER_TEMP/today" out/stitch-today
      - name: Cổng màu token + mốc bố cục (chặn khi lệch)
        run: node scripts/test/native-visual.mjs --web out/stitch-today/png --out out/native-visual --langs en,vi
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: native-visual, path: out/native-visual, retention-days: 14 }
```

Ghi chú vận hành
- Ngưỡng nằm ở `THRESH` trong `scripts/test/native-visual.mjs` (chỉ siết, không nới). Ngoại lệ có lý do (vùng tranh giáo viên, màu ngoài token): `scripts/native/visual-allow.json`.
- Lần đầu có ảnh thật nếu đỏ do đo mốc (vd `thanh tab` không dò được): chạy lại với `--landmarks warn` để xem tờ `report.html` trước khi chỉnh; màu/tương phản luôn chặn.
- `stitch-render.mjs` đọc `web/css/style.css`, `web/icons/icon.svg` → checkout đầy đủ là đủ. Nếu muốn dùng lại ảnh từ `stitch-diff.yml` thì tải artifact `stitch-v2-review` (`png/today-{light,dark}.png`) thay vì vẽ lại.
- Thêm `Native visual QC` vào danh sách check bắt buộc của nhánh sau khi xanh một lần trên PR có ảnh chuẩn.
