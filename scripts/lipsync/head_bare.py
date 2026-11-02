#!/usr/bin/env python3
"""Tài sản "đầu trơn" cho mặt VẼ trong luồng Call (web/js/call/face.js, docs/specs/call-lipsync.md): poster-2x đã xoá mắt/mày/miệng/ria (face_board.bare_head)
→ web/teach/<who>/head-bare-2x.webp (1108×960) + head-bare.webp (554×480), nền trong suốt; ghi sha256 vào web/teach/characters.json (cổng characters-gate).
Chạy lại khi poster-2x hoặc RIG.erase đổi. Dùng: python3 scripts/lipsync/head_bare.py   (cần: numpy pillow resvg-py; node 22)"""
import hashlib, json
from pathlib import Path
from PIL import Image
from face_board import ROOT, bare_head, rig

REG = ROOT / 'web/teach/characters.json'


def main():
    R, reg = rig(), json.loads(REG.read_text())
    for who in ['ama', 'carlos']:
        big = bare_head(who, R[who])
        for name, im in [('head-bare-2x.webp', big), ('head-bare.webp', big.resize((big.width // 2, big.height // 2), Image.LANCZOS))]:
            p = ROOT / f'web/teach/{who}/{name}'
            im.save(p, 'WEBP', quality=88, method=6, exact=False)
            b = p.read_bytes()
            reg['files'][f'{who}/{name}'] = {'sha256': hashlib.sha256(b).hexdigest(), 'bytes': len(b)}
            print(p.relative_to(ROOT), im.size, len(b) // 1024, 'KB')
    reg['files'] = dict(sorted(reg['files'].items()))
    REG.write_text(json.dumps(reg, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
