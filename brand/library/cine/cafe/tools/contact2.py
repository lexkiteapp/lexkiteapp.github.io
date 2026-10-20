import cv2,json,numpy as np
V='/Users/mrquyenbk/Documents/addon dictionary/out/cine-cafe-sample-v2.mp4'; tl=json.load(open('render2/timeline.json'))
ts=[]
for s in tl['shots']: ts+=[s['t0']+0.1, s['t0']+s['dur']/2, s['t0']+s['dur']-0.12]
ts.append(tl['total']-0.6)
cap=cv2.VideoCapture(V); fps=cap.get(5); ims=[]
for t in ts:
    cap.set(1,int(t*fps)); ok,F=cap.read(); F=cv2.resize(F,(200,356)); cv2.putText(F,'%.1fs'%t,(4,16),0,0.5,(0,255,255),2); ims.append(F)
while len(ims)%7: ims.append(np.zeros_like(ims[0]))
cv2.imwrite('/Users/mrquyenbk/Documents/addon dictionary/out/cine-cafe-sample-v2-contact.jpg',np.vstack([np.hstack(ims[i:i+7]) for i in range(0,len(ims),7)]),[cv2.IMWRITE_JPEG_QUALITY,85])
