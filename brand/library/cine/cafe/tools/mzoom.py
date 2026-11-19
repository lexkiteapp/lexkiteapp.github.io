import cv2,json,numpy as np,sys
sys.path.insert(0,'.'); import lipsync as L
rows=[]
for sid,clip,who in [('bossy','c05_ots_ama_talk_a','ama'),('correct','c03_ots_carlos_talk_a','carlos'),('polite','c06_ots_ama_talk_b','ama'),('tip','c10_ama_mcu_talk','ama')]:
    m=json.load(open(f'meta/{clip}/{who}/mouth.json')); MS=np.load(f'meta/{clip}/{who}/track.npy'); log=json.load(open(f'render/{sid}.vis.json'))
    cap=cv2.VideoCapture(f'render/{sid}.mp4'); fr=[]
    while True:
        ok,F=cap.read()
        if not ok: break
        fr.append(F)
    x,y,w,h=L.WM_CROP; sc=1080/w; cx,cy=m['mouth_center']; bw=(m['mouth_box'][2]-m['mouth_box'][0])*2.2
    ims=[]
    for f in range(4,len(fr),max(1,len(fr)//10))[:10]:
        p=MS[min(f,len(MS)-1)]@np.array([cx,cy,1]); X,Y=(p[0]-x)*sc,(p[1]-y)*sc; r=int(bw*sc/2)
        c=fr[f][max(0,int(Y-r*0.7)):int(Y+r*0.7),max(0,int(X-r)):int(X+r)]; c=cv2.resize(c,(140,98)); cv2.putText(c,'%d %s'%(f,log[f].get('0','')),(2,12),0,0.4,(0,255,255),1); ims.append(c)
    rows.append(np.hstack(ims))
cv2.imwrite('mzoom.jpg',np.vstack(rows))
