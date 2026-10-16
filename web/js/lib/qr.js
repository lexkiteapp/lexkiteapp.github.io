/* Bộ sinh mã QR SVG chuẩn ISO/IEC 18004 – siêu gọn, thuần JavaScript, không cần thư viện ngoài.
 * Hỗ trợ tạo mã QR cho URL ứng dụng https://lexkite.com hoặc link chia sẻ bộ thẻ. */
(() => {
  const exp = new Uint8Array(512), log = new Uint8Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) { exp[i] = exp[i + 255] = x; log[x] = i; x = (x << 1) ^ (x >= 128 ? 0x11d : 0); }
  const mul = (a, b) => a === 0 || b === 0 ? 0 : exp[log[a] + log[b]];

  function getPoly(ecLen) {
    let p = [1];
    for (let i = 0; i < ecLen; i++) {
      const next = new Array(p.length + 1).fill(0);
      for (let j = 0; j < p.length; j++) { next[j] ^= mul(p[j], exp[i]); next[j + 1] ^= p[j]; }
      p = next;
    }
    return p;
  }

  function makeQR(text) {
    const bytes = new TextEncoder().encode(text);
    const len = bytes.length;
    let ver = 2, totalCW = 44, dataCW = 28, ecCW = 16, align = 18;
    if (len > 26) { ver = 3; totalCW = 70; dataCW = 44; ecCW = 26; align = 22; }
    if (len > 42) { ver = 4; totalCW = 100; dataCW = 64; ecCW = 36; align = 26; }
    if (len > 62) ver = 4; // tối đa 62 ký tự cho bản rút gọn (đủ cho URL)
    const size = 17 + 4 * ver;

    const bits = [];
    const pushBits = (val, n) => { for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); };
    pushBits(0b0100, 4); pushBits(len, 8);
    for (let i = 0; i < len; i++) pushBits(bytes[i], 8);
    for (let i = 0; i < 4 && bits.length < dataCW * 8; i++) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);
    const pad = [0xec, 0x11]; let pidx = 0;
    while (bits.length < dataCW * 8) pushBits(pad[pidx++ % 2], 8);

    const dataBytes = new Uint8Array(dataCW);
    for (let i = 0; i < dataCW; i++) {
      let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bits[i * 8 + j];
      dataBytes[i] = b;
    }

    const numBlocks = ver === 4 ? 2 : 1;
    const ecPerBlock = ecCW / numBlocks;
    const gen = getPoly(ecPerBlock);
    function calcEC(data, numEC) {
      const res = new Uint8Array(numEC);
      for (let i = 0; i < data.length; i++) {
        const lead = data[i] ^ res[0];
        for (let j = 0; j < numEC - 1; j++) res[j] = res[j + 1] ^ mul(lead, gen[numEC - 1 - j]);
        res[numEC - 1] = mul(lead, gen[0]);
      }
      return res;
    }

    let finalCW = new Uint8Array(totalCW);
    if (ver < 4) {
      finalCW.set(dataBytes, 0);
      finalCW.set(calcEC(dataBytes, ecCW), dataCW);
    } else {
      const d1 = dataBytes.subarray(0, 32), d2 = dataBytes.subarray(32, 64);
      const ec1 = calcEC(d1, 18), ec2 = calcEC(d2, 18);
      let idx = 0;
      for (let i = 0; i < 32; i++) { finalCW[idx++] = d1[i]; finalCW[idx++] = d2[i]; }
      for (let i = 0; i < 18; i++) { finalCW[idx++] = ec1[i]; finalCW[idx++] = ec2[i]; }
    }

    const matrix = Array.from({ length: size }, () => new Int8Array(size).fill(-1));
    const isFunc = Array.from({ length: size }, () => new Uint8Array(size));
    function setFunc(r, c, val) { if (r >= 0 && r < size && c >= 0 && c < size) { matrix[r][c] = val; isFunc[r][c] = 1; } }

    function addFinder(or, oc) {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const nr = or + r, nc = oc + c;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const isB = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
            setFunc(nr, nc, isB ? 1 : 0);
          }
        }
      }
    }
    addFinder(0, 0); addFinder(0, size - 7); addFinder(size - 7, 0);
    for (let i = 8; i < size - 8; i++) { setFunc(6, i, i % 2 === 0 ? 1 : 0); setFunc(i, 6, i % 2 === 0 ? 1 : 0); }
    if (ver >= 2) {
      for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
          setFunc(align + r, align + c, Math.max(Math.abs(r), Math.abs(c)) !== 1 ? 1 : 0);
        }
      }
    }
    setFunc(4 * ver + 9, 8, 1);
    for (let i = 0; i < 9; i++) { if (i !== 6) { setFunc(8, i, 0); setFunc(i, 8, 0); } }
    for (let i = size - 8; i < size; i++) setFunc(8, i, 0);
    for (let i = size - 7; i < size; i++) setFunc(i, 8, 0);

    let bitIdx = 0;
    const allBits = [];
    for (let i = 0; i < finalCW.length; i++) {
      for (let b = 7; b >= 0; b--) allBits.push((finalCW[i] >> b) & 1);
    }

    let up = true;
    for (let right = size - 1; right > 0; right -= 2) {
      if (right === 6) right--;
      const rows = [];
      if (up) { for (let r = size - 1; r >= 0; r--) rows.push(r); }
      else { for (let r = 0; r < size; r++) rows.push(r); }
      for (const r of rows) {
        for (let c = right; c >= right - 1; c--) {
          if (!isFunc[r][c]) matrix[r][c] = bitIdx < allBits.length ? allBits[bitIdx++] : 0;
        }
      }
      up = !up;
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!isFunc[r][c] && ((r + c) % 2 === 0)) matrix[r][c] ^= 1;
      }
    }

    const fmt = [1,0,1,0,1,0,0,0,0,0,1,0,0,1,0];
    const tl = [[8,0],[8,1],[8,2],[8,3],[8,4],[8,5],[8,7],[8,8],[7,8],[5,8],[4,8],[3,8],[2,8],[1,8],[0,8]];
    tl.forEach(([r, c], i) => { matrix[r][c] = fmt[i]; });
    for (let i = 0; i < 7; i++) matrix[size - 1 - i][8] = fmt[i];
    for (let i = 0; i < 8; i++) matrix[8][size - 8 + i] = fmt[7 + i];

    return { size, matrix };
  }

  function qrSvg(text, pad = 2) {
    const { size, matrix } = makeQR(text);
    const total = size + pad * 2;
    let d = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (matrix[r][c] === 1) d += `M${c + pad},${r + pad}h1v1h-1z `;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="100%" height="100%" shape-rendering="crispEdges" role="img" aria-label="QR Code"><rect width="${total}" height="${total}" fill="#ffffff"/><path d="${d.trim()}" fill="#0F3D3E"/></svg>`;
  }

  window.LKQR = { make: makeQR, svg: qrSvg };
})();
