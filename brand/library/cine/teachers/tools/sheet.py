# sheet.py out.jpg H img... : side-by-side downscaled sheet (for eye review)
import sys
from PIL import Image
o,H=sys.argv[1],int(sys.argv[2]); ims=[Image.open(f).convert('RGB') for f in sys.argv[3:]]
ims=[i.resize((int(i.width*H/i.height),H)) for i in ims]; s=Image.new('RGB',(sum(i.width for i in ims)+6*len(ims),H),'white'); x=0
for i in ims: s.paste(i,(x,0)); x+=i.width+6
s.save(o,quality=80)
