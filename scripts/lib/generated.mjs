// Tệp SINH KHÔNG COMMIT TRONG PR (15/11, gốc xung đột): gói dịch web/js/i18n/<lang≠en>, gói pathn web/cpack/lesson/pn-*, bản sao add-on extension/app.
// PR chỉ sửa NGUỒN (i18n/ui, web/, scripts/); CI dựng lại các tệp này trong cây làm việc (scripts/ci/regen-generated.mjs, chạy ở `npm ci` trên PR),
// và bot gen-sync (.github/workflows/gen-sync.yml) commit bản sinh lên main sau mỗi lần gộp. Cổng: scripts/test/gen-pr-clean.mjs (PR không đụng các đường này).
export const GEN_RE = /^(web\/js\/i18n\/(?!en[./])[a-z]{2,3}(\.js|\/)|web\/cpack\/lesson\/pn-[a-z]{2,3}\.js$|extension\/app\/)/;
export const GEN_DIRS = ['extension/app', 'web/js/i18n', 'web/cpack/lesson'];
export const isGenerated = f => GEN_RE.test(f);
/** Tệp trong danh sách mà PR không được commit. */
export const offenders = files => files.filter(isGenerated);
