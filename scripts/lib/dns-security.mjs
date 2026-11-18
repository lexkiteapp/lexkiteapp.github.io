// Kiểm cấu hình bảo mật DNS/header của lexkite.com (thuần, không gọi mạng – test offline ở scripts/test/dns-security.mjs).
// Mong đợi lấy từ infra/resources.json (services[key=dns-security].expect). Chạy thật: scripts/verify-dns.mjs (DoH + HTTPS).
export const unq = s => String(s || '').replace(/" "/g, '').replace(/^"|"$/g, '');
// CAA dạng DoH: '0 issue "letsencrypt.org"'
export function checkCaa(answers, exp) {
  const recs = answers.map(a => String(a).match(/^(\d+)\s+(\w+)\s+"?([^"]*)"?$/)).filter(Boolean).map(m => ({ tag: m[2].toLowerCase(), v: m[3] }));
  const issue = recs.filter(r => r.tag === 'issue').map(r => r.v.split(';')[0].trim()).sort();
  const errs = [];
  if (!recs.length) errs.push('thiếu CAA');
  const want = [...exp.caa_issue].sort();
  if (issue.join() !== want.join()) errs.push(`CAA issue = [${issue}] ≠ [${want}]`);
  if (recs.some(r => r.tag === 'issuewild' && r.v === ';')) errs.push('CAA issuewild ";" sẽ chặn chứng chỉ wildcard Universal SSL');
  if (exp.caa_iodef && !recs.some(r => r.tag === 'iodef' && r.v === exp.caa_iodef)) errs.push('thiếu CAA iodef');
  return errs;
}
export function checkDmarc(txts, exp) {
  const d = txts.map(unq).filter(t => /^v=DMARC1/i.test(t));
  if (d.length !== 1) return [`cần đúng 1 bản ghi DMARC, có ${d.length}`];
  const tags = Object.fromEntries(d[0].split(';').map(x => x.trim().split('=')).filter(x => x[0]).map(([k, v]) => [k.toLowerCase(), (v || '').trim()]));
  const errs = [];
  if (!['quarantine', 'reject'].includes(tags.p)) errs.push(`DMARC p=${tags.p} (cần quarantine/reject)`);
  if (!/^mailto:/.test(tags.rua || '')) errs.push('DMARC thiếu rua');
  if (exp.dmarc && d[0] !== exp.dmarc) errs.push('DMARC khác bản ghi trong infra/resources.json');
  return errs;
}
export function checkSpf(txts, exp) {
  const s = txts.map(unq).filter(t => /^v=spf1/i.test(t));
  if (s.length !== 1) return [`cần đúng 1 bản ghi SPF, có ${s.length}`];
  const errs = [];
  if (/\+all|\?all/.test(s[0])) errs.push('SPF cho phép mọi máy (+all/?all)');
  if (exp.spf && s[0] !== exp.spf) errs.push(`SPF "${s[0]}" ≠ infra/resources.json`);
  return errs;
}
// DS ở vùng cha: '2371 13 2 3F3E…'. Chưa có DS → 'pending' (owner chưa dán ở registrar), không phải lỗi cấu hình phía mình.
export function checkDs(answers, exp) {
  const norm = s => String(s).trim().toUpperCase().replace(/\s+/g, ' ');
  if (!answers.length) return { state: 'pending', errs: [] };
  return answers.map(norm).includes(norm(exp.dnssec.ds)) ? { state: 'ok', errs: [] } : { state: 'bad', errs: [`DS ở registrar [${answers}] ≠ DS Cloudflare ${exp.dnssec.ds} → DNSSEC sẽ hỏng phân giải`] };
}
export function checkHsts(value, exp) {
  const v = String(value || ''), age = +((v.match(/max-age=(\d+)/i) || [])[1] || 0), errs = [];
  if (age < exp.hsts_min_age) errs.push(`HSTS max-age=${age} < ${exp.hsts_min_age}`);
  if (!/includeSubDomains/i.test(v)) errs.push('HSTS thiếu includeSubDomains');
  return errs;
}
// RFC 9116: Contact + Expires bắt buộc; Expires ≤ 1 năm; còn < 30 ngày → báo gia hạn
export function checkSecurityTxt(text, now = Date.now(), canonical) {
  const lines = String(text || '').split(/\r?\n/).filter(l => l && !l.startsWith('#'));
  const f = k => lines.filter(l => l.toLowerCase().startsWith(k.toLowerCase() + ':')).map(l => l.slice(k.length + 1).trim());
  const errs = [];
  if (!f('Contact').length) errs.push('security.txt thiếu Contact');
  const ex = f('Expires');
  if (ex.length !== 1) errs.push('security.txt cần đúng 1 Expires');
  else {
    const t = Date.parse(ex[0]);
    if (!t) errs.push('Expires sai định dạng');
    else if (t - now < 30 * 864e5) errs.push(`security.txt hết hạn ${ex[0]} (< 30 ngày) – gia hạn web/.well-known/security.txt`);
    else if (t - now > 366 * 864e5) errs.push('Expires > 1 năm (RFC 9116 khuyên ≤ 1 năm)');
  }
  if (canonical && !f('Canonical').includes(canonical)) errs.push('security.txt thiếu Canonical đúng');
  if (!f('Preferred-Languages').length) errs.push('security.txt thiếu Preferred-Languages');
  return errs;
}
