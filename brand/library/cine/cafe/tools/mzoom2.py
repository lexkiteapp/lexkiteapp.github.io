import cv2,json,numpy as np,sys
sys.path.insert(0,'.'); import lipsync as L
tl=json.load(open('render2/timeline.json')); rows=[]
for sid,k in [('mistake',0),('fix',0),('repeat',0),('pattern',0),('yourturn',0)]:
    s=[q for q in tl['shots'] if q['id']==sid][0]; clip,who=s['mouths'][k]
    m=json.load(open(f'meta/{clip}/{who}/mouth.json')); MS=np.load(f'meta/{clip}/{who}/track.npy'); log=json.load(open(f'render2/{sid}.vis.json'))
    cap=cv2.VideoCapture(f'render2/{sid}.mp4'); fr=[]
    while True:
        ok,F=cap.read()
        if not ok: break
        fr.append(F)
    x,y,w,h=L.WM_CROP; sc=1080/w; cx,cy=m['mouth_center']; bw=(m['mouth_box'][2]-m['mouth_box'][0])*2.4
    sp=[f for f in range(len(fr)) if log[f].get(str(k),'X')!='X']; pick=np.linspace(max(0,sp[0]-2),min(len(fr)-1,sp[-1]+2),14).astype(int) if sp else []
    ims=[]
    for f in pick:
        p=MS[s['frames'][0]+ (f if s['frames'][-1]>=s['frames'][0] else -f)]@np.array([cx,cy,1]); X,Y=(p[0]-x)*sc,(p[1]-y)*sc; r=int(bw*sc/2)
        c=fr[f][max(0,int(Y-r*0.7)):int(Y+r*0.7),max(0,int(X-r)):int(X+r)]; c=cv2.resize(c,(100,70)); cv2.putText(c,'%d%s'%(f,log[f].get(str(k),'')),(2,11),0,0.35,(0,255,255),1); ims.append(c)
    rows.append(np.hstack(ims))
cv2.imwrite('mzoom2.jpg',np.vstack(rows))
