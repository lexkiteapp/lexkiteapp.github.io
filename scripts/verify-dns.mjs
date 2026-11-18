// Kiểm LIVE bảo mật DNS + header lexkite.com qua DoH (cloudflare-dns.com) + HTTPS. Mong đợi: infra/resources.json (dns-security.expect).
// Dùng: node scripts/verify-dns.mjs   (CI hằng tuần: .github/workflows/content-protect.yml). Thoát 1 khi sai cấu hình; DS chưa dán → cảnh báo.
import fs from 'node:fs';
import { checkCaa, checkDmarc, checkSpf, checkDs, checkHsts, checkSecurityTxt } from './lib/dns-security.mjs';
const exp = JSON.parse(fs.readFileSync(new URL('../infra/resources.json', import.meta.url))).services.find(s => s.key === 'dns-security').expect;
const doh = async (name, type) => {
  const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}&do=1`, { headers: { accept: 'application/dns-json' }, signal: AbortSignal.timeout(15000) });
  const j = await r.json(); return { ad: !!j.AD, data: (j.Answer || []).filter(a => a.type === { CAA: 257, TXT: 16, DS: 43 }[type]).map(a => a.data) };
};
const Z = exp.zone, errs = [], warn = [];
const caa = await doh(Z, 'CAA'); errs.push(...checkCaa(caa.data, exp));
errs.push(...checkDmarc((await doh('_dmarc.' + Z, 'TXT')).data, exp));
errs.push(...checkSpf((await doh(Z, 'TXT')).data, exp));
const ds = checkDs((await doh(Z, 'DS')).data, exp); errs.push(...ds.errs);
if (ds.state === 'pending') warn.push(`DNSSEC: Cloudflare đã ký, chờ owner dán DS "${exp.dnssec.ds}" ở ${exp.registrar}`);
else if (!caa.ad) errs.push('DS có nhưng trả lời không có cờ AD (chuỗi DNSSEC chưa xác thực)');
for (const h of exp.https_hosts) { try { await fetch(`https://${h}/`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15000) }); } catch (e) { errs.push(`${h}: HTTPS lỗi ${e.message}`); } }
const home = await fetch(`https://${Z}/`, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
errs.push(...checkHsts(home.headers.get('strict-transport-security'), exp));
const st = await fetch(exp.security_txt, { signal: AbortSignal.timeout(15000) });
if (!st.ok || !/text\/plain/.test(st.headers.get('content-type') || '')) errs.push(`security.txt HTTP ${st.status} ${st.headers.get('content-type')}`);
else errs.push(...checkSecurityTxt(await st.text(), Date.now(), exp.security_txt));
for (const w of warn) console.log('::warning::' + w);
if (errs.length) { for (const e of errs) console.error('✗ ' + e); process.exit(1); }
console.log(`✓ verify-dns: CAA, DMARC, SPF, HSTS, security.txt đúng · DNSSEC ${ds.state}`);
