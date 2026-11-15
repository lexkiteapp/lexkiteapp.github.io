// Tệp SINH KHÔNG COMMIT TRONG PR (15/11, gốc xung đột): gói dịch web/js/i18n/<lang≠en>, gói pathn web/cpack/lesson/pn-*, bản sao add-on extension/app.
// PR chỉ sửa NGUỒN (i18n/ui, web/, scripts/); CI dựng lại các tệp này trong cây làm việc (scripts/ci/regen-generated.mjs, chạy ở `npm ci` trên PR),
// và bot gen-sync (.github/workflows/gen-sync.yml) commit bản sinh lên main sau mỗi lần gộp. Cổng: scripts/test/gen-pr-clean.mjs (PR không đụng các đường này).
export const GEN_RE = /^(web\/js\/i18n\/(?!en[./])[a-z]{2,3}(\.js|\/)|web\/cpack\/lesson\/pn-[a-z]{2,3}\.js$|extension\/app\/)/;
export const GEN_DIRS = ['extension/app', 'web/js/i18n', 'web/cpack/lesson'];
export const isGenerated = f => GEN_RE.test(f);
/** Tệp trong danh sách mà PR không được commit. */
export const offenders = files => files.filter(isGenerated);

// Nguồn của bản sinh: PR đổi các đường này thì workflow serve web/ phải dựng lại (action .github/actions/gen-if-needed). `ext` = thêm extension/app.
export const needsRegen = (files, ext = false) => files.some(f => !isGenerated(f) && (/^(i18n\/ui\/|scripts\/(lib\/)?i18n-pack\.mjs$|scripts\/lib\/i18n-pack\.mjs$)/.test(f)
  || (ext && /^(web\/|extension\/|scripts\/build-extension\.sh$)/.test(f))));
// Workflow chạy trên PR mà dựng/serve web/ từ cây làm việc nhưng không chạy `npm ci|i|install` (postinstall sinh lại), build-web, regen-generated → phải gọi gen-if-needed.
export const SERVES_WEB = /http\.server|npx (-y )?serve|playwright|lighthouse|wrangler|webkit|chromium/;
const NPM_RUN = /(npm|npm-retry\.sh) (ci|i|install)\b/;   // chạy postinstall → regen-generated --if-ci (trừ khi --ignore-scripts)
export const hasGen = src => /build-web\.sh|regen-generated|gen-if-needed/.test(src) || (NPM_RUN.test(src) && !/ignore-scripts/.test(src));
export const onPR = src => /^on:[ \t]*\n[\s\S]*?^  pull_request(_target)?:/m.test(src) || /^on:.*\bpull_request\b/m.test(src);
export const mustGen = src => onPR(src) && SERVES_WEB.test(src) && !hasGen(src.replace(/^\s*#.*$/gm, ''));
