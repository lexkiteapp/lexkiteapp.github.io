"""Thứ tự hiển thị (bidi) cho dòng bản địa vẽ theo nhiều đoạn phông (render.native_line).
Mỗi đoạn được raqm dựng hình + đảo chiều BÊN TRONG đoạn, nhưng native_line đặt các đoạn nối nhau trái → phải: câu Ả Rập có chữ Latin
(“Good name”) hiện ngược thứ tự từ. Ở đây làm phần UBA ở mức đoạn: hướng gốc = ký tự mạnh đầu tiên (P2/P3), đoạn trung tính
(khoảng trắng, dấu câu, số) theo hai bên nếu cùng hướng, không thì theo hướng gốc (N1/N2); hướng gốc RTL → đảo thứ tự nhóm,
trong nhóm RTL đảo thứ tự đoạn, nhóm LTR giữ nguyên (L2). Khoảng trắng đầu/cuối đoạn tách thành đoạn trung tính riêng.
Test: scripts/test/rig-bidi.mjs."""
import unicodedata

def strong(c):
    b = unicodedata.bidirectional(c)
    return 'R' if b in ('R', 'AL') else 'L' if b == 'L' else None

def base_rtl(s):
    for c in s:
        d = strong(c)
        if d: return d == 'R'
    return False

def _split_spaces(runs):
    out = []
    for a, f in runs:
        core = a.strip()
        if not core: out.append((a, f)); continue
        i, j = a.index(core[0]), len(a.rstrip())
        if i: out.append((a[:i], f))
        out.append((a[i:j], f))
        if j < len(a): out.append((a[j:], f))
    return out

def visual(runs, rtl=None):
    """runs = [(chữ, phông)] theo thứ tự logic → [(chữ, phông)] theo thứ tự vẽ trái → phải."""
    runs = _split_spaces(runs)
    if rtl is None: rtl = base_rtl(''.join(a for a, _ in runs))
    if not rtl: return runs
    dirs = []
    for a, _ in runs:
        ds = {strong(c) for c in a} - {None}
        dirs.append('R' if 'R' in ds else 'L' if ds else None)
    base = 'R'
    for i, d in enumerate(dirs):
        if d: continue
        prev = next((dirs[k] for k in range(i - 1, -1, -1) if dirs[k]), base)
        nxt = next((dirs[k] for k in range(i + 1, len(dirs)) if dirs[k]), base)
        dirs[i] = prev if prev == nxt else base
    groups = []
    for r, d in zip(runs, dirs):
        if groups and groups[-1][0] == d: groups[-1][1].append(r)
        else: groups.append((d, [r]))
    out = []
    for d, rs in reversed(groups): out += rs[::-1] if d == 'R' else rs
    return out
