import cv2,json,sys,numpy as np
V='/Users/mrquyenbk/Documents/addon dictionary/out/cine-cafe-sample.mp4'; tl=json.load(open('render/timeline.json'))
ts=[]
for s in tl['shots']: ts+= [s['t0']+0.15, s['t0']+s['dur']/2, s['t0']+s['dur']-0.15]
ts.append(tl['total']-0.5)
cap=cv2.VideoCapture(V); fps=cap.get(5); ims=[]
for t in ts:
    cap.set(1,int(t*fps)); ok,F=cap.read(); F=cv2.resize(F,(216,384)); cv2.putText(F,'%.1fs'%t,(4,16),0,0.5,(0,255,255),2); ims.append(F)
while len(ims)%9: ims.append(np.zeros_like(ims[0]))
rows=[np.hstack(ims[i:i+9]) for i in range(0,len(ims),9)]
cv2.imwrite(sys.argv[1],np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,85])
