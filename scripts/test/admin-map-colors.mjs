// Màu bản đồ khách (owner 4/11: nước 0 khách trùng màu nhóm "1 khách"): token --map-0…5 trong admin.css, sáng + tối, so với nền thẻ --surface. Test tĩnh, render thật ở admin-guard.
import fs from 'node:fs';
import { checkMapColors } from '../lib/admin-table-scan.mjs';
const adm = fs.readFileSync('web/css/admin.css', 'utf8'), st = fs.readFileSync('web/css/style.css', 'utf8'), errs = [];
const pick = (src, re) => { const m = re.exec(src); if (!m) throw new Error('thiếu khối ' + re); return m[1]; };
const toks = blk => [0, 1, 2, 3, 4, 5].map(i => { const m = new RegExp(`--map-${i}:\\s*(#[0-9a-fA-F]{6})`).exec(blk); if (!m) errs.push(`thiếu --map-${i}`); return m && m[1]; });
const light = toks(pick(adm, /\nbody\.adm \{([^}]*--map-0[^}]*)\}/)), dark = toks(pick(adm, /\n:root\[data-theme="dark"\] body\.adm \{([^}]*--map-0[^}]*)\}/)), auto = toks(pick(adm, /:root:not\(\[data-theme="light"\]\) body\.adm \{([^}]*--map-0[^}]*)\}/));
if (dark.join() !== auto.join()) errs.push('tối theo nút và tối theo hệ thống khác màu');
errs.push(...checkMapColors(light, pick(st, /--surface:\s*(#[0-9a-fA-F]{6})/), 'sáng'));
const darkBlock = st.slice(st.indexOf(':root[data-theme="dark"]'));
errs.push(...checkMapColors(dark, pick(darkBlock, /--surface:\s*(#[0-9a-fA-F]{6})/), 'tối'));
if (/surface-3/.test(fs.readFileSync('web/js/admin.js', 'utf8').match(/regionStyle:[^\n]*/)[0])) errs.push('bản đồ lại tô nước trống bằng --surface-3');
if (errs.length) { console.error('✗ admin-map-colors:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('✓ admin-map-colors: 0 khách + 5 nhóm ≥ 3:1 với nền thẻ, phân biệt nhau ở cả sáng lẫn tối');
