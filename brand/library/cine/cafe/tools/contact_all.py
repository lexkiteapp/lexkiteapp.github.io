import cv2,json,numpy as np
rows=[]
for rd in ['render_latte_v4','render_forhere','render_paycard','render_idlike']:
    tl=json.load(open(f'{rd}/timeline.json')); V='/Users/mrquyenbk/Documents/addon dictionary/out/'+tl['lesson']['out']
    ts=[]
    for s in tl['shots']: ts+=[s['t0']+0.25, s['t0']+s['dur']*0.7]
    ts.append(tl['total']-0.5)
    cap=cv2.VideoCapture(V); fps=cap.get(5); ims=[]
    for t in ts:
        cap.set(1,int(t*fps)); ok,F=cap.read(); O=F.copy(); O[:220]=(0,0,255); O[1500:]=(0,0,255); O[:,940:]=(0,0,255); F=cv2.addWeighted(F,0.75,O,0.25,0)
        F=cv2.resize(F,(144,256)); cv2.putText(F,'%.1f'%t,(3,13),0,0.4,(0,255,255),1); ims.append(F)
    r=np.hstack(ims); lab=np.zeros((22,r.shape[1],3),np.uint8); cv2.putText(lab,tl['lesson']['out']+'  %.1fs'%tl['total'],(4,16),0,0.55,(255,255,255),1); rows.append(np.vstack([lab,r]))
W=max(r.shape[1] for r in rows); rows=[cv2.copyMakeBorder(r,0,0,0,W-r.shape[1],0) for r in rows]
cv2.imwrite('/Users/mrquyenbk/Documents/addon dictionary/out/cine-cafe-lessons-contact.jpg',np.vstack(rows),[cv2.IMWRITE_JPEG_QUALITY,84])
