// Tập khóa audio (FNV-1a 32 bit, base36 – KVoice.lineKey) nén gọn cho web/js/listen/audio-index.js: sắp xếp → hiệu số → mã Rice (tham số k) → base64.
// 2/11: dạng chuỗi "k1 k2 …" 48,5k khóa = 372 KB thô / 207 KB gzip (vượt ngân sách tệp 160 KB gzip và tổng web/js) → Rice ≈ 18 bit/khóa.
// DEC là bộ giải mã chạy trong trình duyệt/Node/vm (không cần atob), trả về Set chuỗi base36 như cũ → mọi chỗ dùng LISTEN_AUDIO.has(k) giữ nguyên.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function encode(keys) {
  const v = [...new Set([...keys].map(k => parseInt(k, 36)))].sort((a, b) => a - b), n = v.length;
  const k = n ? Math.max(0, Math.floor(Math.log2(Math.max(1, v[n - 1] / n)))) : 0, P = 2 ** k, bits = [];
  let prev = 0;
  for (const x of v) { const d = x - prev, q = Math.floor(d / P); prev = x; for (let i = 0; i < q; i++) bits.push(1); bits.push(0); for (let i = k - 1; i >= 0; i--) bits.push(Math.floor((d % P) / 2 ** i) % 2); }
  let s = ''; for (let i = 0; i < bits.length; i += 6) { let c = 0; for (let j = 0; j < 6; j++) c = c * 2 + (bits[i + j] || 0); s += B64[c]; }
  return { s, k, n };
}
export const DEC = `function(s,k,n){var A='${B64}',m={},o=new Set(),p=0,a=0,b=0,P=Math.pow(2,k),v=0,i,q,r;for(i=0;i<64;i++)m[A[i]]=i;function t(){if(!b){a=m[s[p++]];b=6}b--;return(a>>b)&1}for(i=0;i<n;i++){q=0;while(t())q++;r=0;for(var j=0;j<k;j++)r=r*2+t();v+=q*P+r;o.add(v.toString(36))}return o}`;
export const decode = ({ s, k, n }) => new Function(`return (${DEC})`)()(s, k, n);
