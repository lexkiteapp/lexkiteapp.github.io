#!/usr/bin/env python3
# Nén PNG KHÔNG MẤT DỮ LIỆU (size-guard: cây repo ≤ 600 MB): dựng lại IDAT bằng Pillow (optimize, zlib 9), giữ nguyên IHDR + sRGB/pHYs/eXIf/gAMA/cHRM/iCCP, bỏ iDOT (chỉ mục
# giải mã song song của Apple, vô hiệu khi IDAT đổi) rồi XÁC MINH điểm ảnh giống hệt (mode, kích thước, byte) – lệch → AssertionError, không ghi.
#   python3 scripts/media/png-lossless.py <thư-mục> <kết-quả.json>     # chỉ ĐO (không ghi đè); PR nén chỉ lấy tệp giảm ≥ 10 % và ≤ 20 MB bản mới/PR (luật size-guard)
import struct,zlib,io,sys,glob,os,json
from PIL import Image
def chunks(b):
    i=8; out=[]
    while i<len(b):
        n,=struct.unpack('>I',b[i:i+4]); out.append((b[i+4:i+8],b[i+8:i+8+n])); i+=12+n
    return out
def mk(t,d): return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
def opt(path):
    raw=open(path,'rb').read(); im=Image.open(io.BytesIO(raw)); im.load()
    o=io.BytesIO(); im.save(o,'PNG',optimize=True,compress_level=9); new=o.getvalue()
    keep=[(t,d) for t,d in chunks(raw) if t in (b'sRGB',b'pHYs',b'eXIf',b'gAMA',b'cHRM',b'iCCP')]
    idat=b''.join(d for t,d in chunks(new) if t==b'IDAT')
    ihdr=[d for t,d in chunks(raw) if t==b'IHDR'][0]
    out=b'\x89PNG\r\n\x1a\n'+mk(b'IHDR',ihdr)
    order=[b'iCCP',b'sRGB',b'gAMA',b'cHRM',b'pHYs']
    for t in order:
        for tt,d in keep:
            if tt==t: out+=mk(tt,d)
    out+=mk(b'IDAT',idat)
    for tt,d in keep:
        if tt==b'eXIf': out+=mk(tt,d)
    out+=mk(b'IEND',b'')
    # xác minh điểm ảnh giống hệt
    a=Image.open(io.BytesIO(raw)); a.load(); b2=Image.open(io.BytesIO(out)); b2.load()
    assert a.mode==b2.mode and a.size==b2.size and a.tobytes()==b2.tobytes(), 'pixel khác'
    return raw,out
if __name__=='__main__':
    res=[]
    for f in sorted(glob.glob(sys.argv[1]+'/**/*.png',recursive=True)):
        raw,out=opt(f); res.append((f,len(raw),len(out)))
    json.dump(res,open(sys.argv[2],'w'))
    a=sum(r[1] for r in res); b=sum(r[2] for r in res); print(len(res),a,b,1-b/a)
