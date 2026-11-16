// Khoá TRÙNG trong cùng một object JSON: JSON.parse lặng lẽ lấy khoá SAU và bỏ khoá trước (07/11: brand/stitch/v2/bind/today.json sau khi gộp #593 có 2 khoá "attr" cho cùng
// selector → đè data-pv của #826, mất 3 nút "Your path"; ux1 bắt muộn). Bộ quét token (không cần parse lại): trả [{ key, path, line }]. Thuần, có test: scripts/test/json-dupkeys.mjs.
export function dupKeys(text) {
  const out = [], stack = [];   // mỗi object: { keys: Set, path }
  let i = 0, line = 1, expectKey = [];   // expectKey[depth] = đang ở vị trí khoá của object
  const n = text.length;
  const readStr = () => { let j = i + 1, s = ''; while (j < n && text[j] !== '"') { if (text[j] === '\\') { s += text[j] + text[j + 1]; j += 2; } else { if (text[j] === '\n') line++; s += text[j++]; } } i = j + 1; return s; };
  const kinds = [];   // 'o' | 'a'
  let lastKey = '';
  const sub = () => (!stack.length ? '' : kinds[kinds.length - 2] === 'a' ? stack[stack.length - 1].path : stack[stack.length - 1].path + '/' + lastKey);   // phần tử mảng dùng chung đường dẫn của mảng
  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === '{') { kinds.push('o'); stack.push({ keys: new Set(), path: sub() }); expectKey.push(true); i++; continue; }
    if (c === '[') { kinds.push('a'); expectKey.push(false); stack.push({ keys: null, path: sub() }); i++; continue; }
    if (c === '}' || c === ']') { kinds.pop(); expectKey.pop(); stack.pop(); i++; continue; }
    if (c === ',') { if (kinds[kinds.length - 1] === 'o') expectKey[expectKey.length - 1] = true; i++; continue; }
    if (c === ':') { expectKey[expectKey.length - 1] = false; i++; continue; }
    if (c === '"') {
      const at = line, s = readStr(), top = kinds.length - 1;
      if (top >= 0 && kinds[top] === 'o' && expectKey[top]) { const o = stack[top]; if (o.keys.has(s)) out.push({ key: s, path: o.path || '/', line: at }); o.keys.add(s); lastKey = s; }
      continue;
    }
    i++;
  }
  return out;
}
