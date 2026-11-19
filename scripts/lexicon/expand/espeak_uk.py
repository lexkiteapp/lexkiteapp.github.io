#!/usr/bin/env python3
# IPA Anh (en-gb) từ espeak-ng (GPL-3, chạy như công cụ – không phân phối kèm) cho từ Wiktionary thiếu IPA Anh. docs/LEXICON.md §Mở rộng 20k.
#   python espeak_uk.py < words.txt  →  JSON {word: "raw espeak IPA"} (chuẩn hoá ở scripts/lexicon/expand/espeak.mjs)
# Thư viện: pip espeakng-loader (gói sẵn libespeak-ng + dữ liệu, giống nhau trên Mac/CI → kết quả tất định).
import ctypes, json, sys
import espeakng_loader as L
lib = ctypes.cdll.LoadLibrary(L.get_library_path())
lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
if lib.espeak_Initialize(0x02, 0, L.get_data_path().encode(), 0) <= 0: sys.exit('espeak init failed')
lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
V = (sys.argv[1] if len(sys.argv) > 1 else 'gmw/en').encode()
assert lib.espeak_SetVoiceByName(V) == 0, V
lib.espeak_TextToPhonemes.restype = ctypes.c_char_p
lib.espeak_TextToPhonemes.argtypes = [ctypes.POINTER(ctypes.c_void_p), ctypes.c_int, ctypes.c_int]
def ipa(w):
    buf = ctypes.c_char_p(w.encode()); p = ctypes.cast(buf, ctypes.c_void_p); out = []
    while p.value:
        r = lib.espeak_TextToPhonemes(ctypes.byref(p), 1, 0x02)  # textmode=UTF8, phonememode bit1 = IPA
        if r: out.append(r.decode())
    return ' '.join(out).strip()
print(json.dumps({w: ipa(w) for w in (l.strip() for l in sys.stdin) if w}, ensure_ascii=False))
