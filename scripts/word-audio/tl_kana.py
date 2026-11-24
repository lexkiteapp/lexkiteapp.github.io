# Cách đọc tiếng Nhật để CHẤM lượt mẫu giọng (tl-voices.json ja: asrMatch/ipaCheck = "reading"; docs/specs/japanese-course.md §5) – CHỈ CI.
# yomi(chữ) = cách đọc katakana của OpenJTalk (pyopenjtalk, kèm misaki[ja]); fold() = so được hai cách đọc: hiragana → katakana, bỏ ký tự ngoài kana,
# trường âm viết kiểu nào cũng thành ー (おう/オウ, えい, nguyên âm lặp) – Whisper/OpenJTalk viết ガッコー, seed viết がっこう. accent(chữ) = vị trí hạ (NHK-kiểu) của OpenJTalk.
import re
V = {}
for v, ks in {'a': 'アカサタナハマヤラワガザダバパァャヮ', 'i': 'イキシチニヒミリギジヂビピィ', 'u': 'ウクスツヌフムユルグズヅブプゥュヴ', 'e': 'エケセテネヘメレゲゼデベペェ', 'o': 'オコソトノホモヨロヲゴゾドボポォョ'}.items():
    for k in ks: V[k] = v
def kata(s): return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s or '')
def fold(s):
    s = re.sub(r'[^ァ-ーー]', '', kata(s)); out, pv = [], ''
    for c in s:
        if (c == 'ウ' and pv in ('o', 'u')) or (c == 'イ' and pv in ('e', 'i')) or (c in 'アイウエオ' and V.get(c) == pv): out.append('ー'); continue
        out.append(c)
        if c in V: pv = 'a' if c in 'ャァ' else 'u' if c in 'ュゥ' else 'o' if c in 'ョォ' else V[c]
    return ''.join(out)
def yomi(s):
    import pyopenjtalk
    return pyopenjtalk.g2p(s, kana=True)
def accent(s):
    """(vị trí hạ, số mora) của OpenJTalk cho một từ đơn – None nếu bộ phân tích tách thành nhiều từ (không so được)."""
    import pyopenjtalk
    nj = [x for x in pyopenjtalk.run_frontend(s) if x.get('pos') != '記号']
    if len(nj) != 1: return None
    return nj[0].get('acc'), nj[0].get('mora_size')
