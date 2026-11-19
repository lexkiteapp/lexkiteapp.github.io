# shift.py <in.png> <out.png> <dy> [src_y0] : 0-credit reframe of a first frame - crop dy rows at the top, extend the vertically uniform desk front at the bottom
# (desk-v2 26/10: puts the desk top above the caption band y 1237-1497 of the 1080x1920 frame). With src_y0: repeat rows src_y0..+dy (d_desk);
# without: mirror the last dy rows (seamless for wood grain, m_desk onward)
import sys, numpy as np
from PIL import Image
a = np.asarray(Image.open(sys.argv[1]).convert('RGB')); dy = int(sys.argv[3])
ext = a[int(sys.argv[4]):int(sys.argv[4]) + dy] if len(sys.argv) > 4 else a[-dy:][::-1]
Image.fromarray(np.vstack([a[dy:], ext])).save(sys.argv[2])
