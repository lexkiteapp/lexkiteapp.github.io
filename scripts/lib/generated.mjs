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
// Workflow chạy trên PR: job ĐỌC/serve web/ (node scripts/test/…, http.server, playwright test…) mà chưa có bước sinh TRƯỚC đó (npm ci|i|install không --ignore-scripts → postinstall,
// build-web, regen-generated, gen-if-needed) thì thấy bản sinh cũ của main. Workflow không đọc bản sinh ghi `# ci-policy: no-gen – <lý do>`.
const NPM_RUN = /(npm|npm-retry\.sh) (ci|i|install)\b(?![^\n]*ignore-scripts)/;
export const hasGen = t => NPM_RUN.test(t) || /build-web\.sh|regen-generated|gen-if-needed/.test(t);
export const READS_WEB = /node scripts\/test\/|http\.server|npx (-y )?serve|playwright test|node scripts\/[\w/.-]*(shots|e2e|probe)/;
export const onPR = src => /^on:[ \t]*\n[\s\S]*?^  pull_request(_target)?:/m.test(src) || /^on:.*\bpull_request\b/m.test(src);
/** Tên các job vi phạm (đọc trước khi sinh). */
export function genViolations(src) {
  if (!onPR(src) || /^# ci-policy: no-gen\b/m.test(src)) return [];
  const jm = src.match(/^jobs:[ \t]*\n([\s\S]*)$/m); if (!jm) return [];
  const bad = [];
  for (const j of jm[1].split(/^  (?=[\w-]+:[ \t]*(?:#.*)?\n)/m)) {
    const steps = j.split(/^      - /m).slice(1).map(x => x.replace(/^\s*#.*$/gm, '')); let g = -1, r = -1;
    steps.forEach((t, i) => { if (g < 0 && hasGen(t)) g = i; if (r < 0 && READS_WEB.test(t)) r = i; });
    if (r >= 0 && (g < 0 || r < g)) bad.push(j.split('\n')[0].trim().replace(/:.*/, ''));
  }
  return bad;
}
