"""Vẽ icon PNG của Lexkite (giống icons/icon.svg) bằng thư viện chuẩn – không cần Pillow."""
import struct, zlib, sys, os, math

def png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    chunk = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))

def in_rr(x, y, x0, y0, x1, y1, r):
    if x < x0 or x > x1 or y < y0 or y > y1: return False
    cx = min(max(x, x0 + r), x1 - r); cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def seg_d(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - ax - t * dx, py - ay - t * dy)

def in_tri(px, py, a, b, c):
    def s(p, q, r): return (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1])
    d1, d2, d3 = s((px, py), a, b), s((px, py), b, c), s((px, py), c, a)
    return not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0))

def lerp(c1, c2, t): return tuple(c1[i] + (c2[i] - c1[i]) * t for i in range(3))
def grad3(t):
    a, b, c = (0x6D, 0x5D, 0xFC), (0x7C, 0x3A, 0xED), (0xC0, 0x26, 0xD3)
    return lerp(a, b, t / .55) if t < .55 else lerp(b, c, (t - .55) / .45)

TRI = ((94, 28.5), (73.6, 40), (94.4, 52))
def color_at(X, Y, pad):
    if not in_rr(X, Y, 0, 0, 128, 128, 32): return None
    col = grad3(max(0, min(1, (X + Y) / 256)))
    if pad: pass
    if seg_d(X, Y, 33, 41, 58, 92) <= 7.5: col = (255, 255, 255)
    if seg_d(X, Y, 58, 92, 84, 47) <= 7.5:
        t = max(0, min(1, ((X - 58) * 26 + (Y - 92) * -45) / (26 * 26 + 45 * 45)))
        col = lerp((0xFD, 0xE6, 0x8A), (0xF5, 0x9E, 0x0B), t)
    if in_tri(X, Y, *TRI) or min(seg_d(X, Y, *TRI[0], *TRI[1]), seg_d(X, Y, *TRI[1], *TRI[2]), seg_d(X, Y, *TRI[2], *TRI[0])) <= 2.5:
        col = (0xF5, 0x9E, 0x0B)
    return col

def render(n, pad=0):
    # pad: lề trong suốt (Chrome Web Store khuyên icon 128 có lề 16px)
    inner = n - 2 * pad
    SS = 4; out = []
    for y in range(n):
        for x in range(n):
            r = g = b = a = 0
            for sy in range(SS):
                for sx in range(SS):
                    X = (x - pad + (sx + .5) / SS) * 128 / inner; Y = (y - pad + (sy + .5) / SS) * 128 / inner
                    c = color_at(X, Y, pad)
                    if c: r += c[0]; g += c[1]; b += c[2]; a += 1
            k = SS * SS
            out += [int(r / a), int(g / a), int(b / a), int(255 * a / k)] if a else [0, 0, 0, 0]
    return out

outdir = sys.argv[1]
for spec in sys.argv[2:]:
    n, _, pad = spec.partition(':')
    n = int(n); pad = int(pad or 0)
    name = f'icon-{n}.png' if not pad else f'icon-{n}-store.png'
    png(os.path.join(outdir, name), n, n, render(n, pad))
    print('icon', name)
