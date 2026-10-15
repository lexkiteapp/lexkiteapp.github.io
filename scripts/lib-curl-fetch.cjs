// Thay fetch bằng curl khi chạy dịch máy tại máy cá nhân (node fetch có thể bị proxy chặn): node --require scripts/lib-curl-fetch.cjs scripts/gen-i18n.mjs <lang>
const { execFileSync } = require('child_process');
globalThis.fetch = async url => { try { const out = execFileSync('curl', ['-s', '--max-time', '20', String(url)], { maxBuffer: 50e6 }).toString(); return { ok: out.startsWith('['), json: async () => JSON.parse(out), text: async () => out }; } catch (e) { return { ok: false }; } };
