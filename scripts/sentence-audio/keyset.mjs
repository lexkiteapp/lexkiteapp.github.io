// Tập khóa audio (FNV-1a 32 bit, base36 – KVoice.lineKey) nén gọn cho web/js/listen/audio-index.js: sắp xếp → hiệu số → mã Rice (tham số k) → base64.
// 2/11: dạng chuỗi "k1 k2 …" 48,5k khóa = 372 KB thô / 207 KB gzip (vượt ngân sách tệp 160 KB gzip và tổng web/js) → Rice ≈ 18 bit/khóa.
// DEC là bộ giải mã chạy trong trình duyệt/Node/vm (không cần atob), trả về tập chuỗi base36 (has/size/forEach/values/duyệt như Set) → mọi chỗ dùng LISTEN_AUDIO.has(k) giữ nguyên.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function encode(keys) {
  const v = [...new Set([...keys].map(k => parseInt(k, 36)))].sort((a, b) => a - b), n = v.length;
  const k = n ? Math.max(0, Math.floor(Math.log2(Math.max(1, v[n - 1] / n)))) : 0, P = 2 ** k, bits = [];
  let prev = 0;
  for (const x of v) { const d = x - prev, q = Math.floor(d / P); prev = x; for (let i = 0; i < q; i++) bits.push(1); bits.push(0); for (let i = k - 1; i >= 0; i--) bits.push(Math.floor((d % P) / 2 ** i) % 2); }
  let s = ''; for (let i = 0; i < bits.length; i += 6) { let c = 0; for (let j = 0; j < 6; j++) c = c * 2 + (bits[i + j] || 0); s += B64[c]; }
  return { s, k, n };
}
// 3/11 (scripts/test/call-lip.mjs, LoAF): giải cả 48,8k khóa một mạch = 14 ms máy nhanh / ~55 ms ở CPU 4× → khung > 50 ms đúng lúc giáo viên mặt vẽ đang nói
// (app.js nạp gói 'voice' sau 4 s). Nay trả "tập lười": giải từng lát 500 khóa trong requestIdleCallback; has/size/duyệt gọi trước khi xong → giải nốt ngay (kết quả y hệt).
export const DEC = `function(s,k,n){var A='${B64}',m={},o=new Set(),p=0,a=0,b=0,P=Math.pow(2,k),v=0,i=0,c,R=typeof requestIdleCallback=='function'?requestIdleCallback:null;for(c=0;c<64;c++)m[A[c]]=c;function t(){if(!b){a=m[s[p++]];b=6}b--;return(a>>b)&1}function run(l){for(var e=Math.min(n,i+l),q,r,j;i<e;i++){q=0;while(t())q++;r=0;for(j=0;j<k;j++)r=r*2+t();v+=q*P+r;o.add(v.toString(36))}return o}function idle(d){while(i<n&&d.timeRemaining()>2)run(500);if(i<n)R(idle)}if(R&&n)R(idle);var L={has:function(x){return run(n).has(x)},forEach:function(f,z){run(n).forEach(f,z)},values:function(){return run(n).values()},keys:function(){return run(n).keys()}};Object.defineProperty(L,'size',{get:function(){return run(n).size}});if(typeof Symbol=='function')L[Symbol.iterator]=function(){return run(n)[Symbol.iterator]()};return L}`;
export const decode = ({ s, k, n }) => new Set(new Function(`return (${DEC})`)()(s, k, n)); // Node: Set thật
