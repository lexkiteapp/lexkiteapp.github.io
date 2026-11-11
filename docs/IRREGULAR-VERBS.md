# Bảng động từ bất quy tắc (#/irregular)

> TL;DR: Một nguồn dạng V1/V2/V3 (`web/js/verbs-core.js` IRR), nội dung ở `content/verbs/`, dựng ra `web/cpack/irv/`, UI web + add-on + app dùng chung.
> Đọc khi: sửa dữ liệu hoặc màn động từ bất quy tắc.

- Thêm/sửa động từ: sửa IRR trong `web/js/verbs-core.js`, thêm dòng ở `content/verbs/irregular.json` và `content/verbs/i18n/<lang>.json` (14 ngôn ngữ), rồi `node scripts/verbs/build-irregular.mjs` và `node scripts/native/gen.mjs`. Lệnh `--check` chạy trong `scripts/test/verbs.mjs`.
- Đối chiếu nguồn: dạng V2/V3 so với WordNet verb.exc (`content/verbs/sources/wordnet-forms.json`), IPA Mỹ so với CMUdict (`cmudict-forms.json`). Ngoại lệ đã duyệt tay ở `forms-reviewed.json`, `ipa-reviewed.json`. Danh sách động từ đối chiếu thêm với Wiktionary Appendix (11/11/2026).
- Âm thanh: chuỗi 3 dạng và 2 câu ví dụ đi qua corpus Kokoro (`scripts/sentence-audio/corpus.mjs`).
- Màn: `web/js/irregular.js`, `web/js/irregular-drill.js`, mẫu Stitch `brand/stitch/v2/irv-*`. Trang SEO: `scripts/build-seo-verbs.mjs`. Add-on: bong bóng tra từ gọi message `irv` ở `extension/background.js`.
