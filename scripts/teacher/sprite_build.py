# Pilot B sprite builder (docs/TEACHER-IN-APP.md §5.3): base still + 7 Rhubarb mouth shapes + blink, cut from the 3D bank v2 (a05*) at 0 credits.
# ORB features on the face (mouth masked) -> partial affine to ama2_first.png -> patch, mean colour match in LAB, feathered alpha.
# Usage: FOOTAGE=<dir with ama2_first.png + a05*.mp4> python sprite_build.py  (writes ./out/). Frame picks were chosen by eye from a contact sheet.
import cv2, numpy as np, json, math, sys
from PIL import Image
import os
D=os.environ.get('FOOTAGE','brand/library/cine/teachers3d/carlos2').rstrip('/')+'/'
O=os.environ.get('OUT','.'); os.makedirs(O+'/out',exist_ok=True)
base0=cv2.imread(D+'ama2_first.png'); g0=cv2.cvtColor(base0,cv2.COLOR_BGR2GRAY); H0,W0=g0.shape
FX,FY,FW,FH=600,720,350,260; MX,MY,MW,MH=650,940,220,170; EX,EY,EW,EH=615,852,320,95
mask=np.zeros_like(g0); mask[FY:FY+FH,FX:FX+FW]=255; mask[MY:MY+MH,MX-10:MX+MW+10]=0
orb=cv2.ORB_create(1500); k0,d0=orb.detectAndCompute(g0,mask); bf=cv2.BFMatcher(cv2.NORM_HAMMING,crossCheck=True)
def frame(clip,i):
    cap=cv2.VideoCapture(D+clip+'.mp4'); cap.set(cv2.CAP_PROP_POS_FRAMES,i); ok,f=cap.read(); return f
def align(f):
    g=cv2.cvtColor(f,cv2.COLOR_BGR2GRAY); m2=np.zeros_like(g); m2[FY-300:FY+FH+300,FX-350:FX+FW+350]=255
    k1,d1=orb.detectAndCompute(g,m2); ms=bf.match(d0,d1)
    A,inl=cv2.estimateAffinePartial2D(np.float32([k1[m.trainIdx].pt for m in ms]),np.float32([k0[m.queryIdx].pt for m in ms]),method=cv2.RANSAC,ransacReprojThreshold=3)
    return cv2.warpAffine(f,A,(W0,H0),flags=cv2.INTER_LANCZOS4,borderMode=cv2.BORDER_REPLICATE), int(inl.sum())
SH={'X':('a05t3_ama2_present',125),'A':('a05b_ama2',185),'B':('a05t2_ama2_present',187),'C':('a05_ama2',127),'D':('a05t2_ama2_present',151),'E':('a05l_ama2_listen',52),'F':('a05l_ama2_listen',47)}
base,_=align(frame(*SH['X']))
w_,n_=align(frame('a05b_ama2',208)); best=(0,208,w_)
print('blink frame',best[1],'white px',best[0])
def ellipse(w,h,feather):
    a=np.zeros((h,w),np.float32); cv2.ellipse(a,(w//2,h//2),(w//2-feather,h//2-feather),0,0,360,1,-1)
    return cv2.GaussianBlur(a,(0,0),feather/2.2)
def colormatch(p,ref,al):
    pl=cv2.cvtColor(p,cv2.COLOR_BGR2LAB).astype(np.float32); rl=cv2.cvtColor(ref,cv2.COLOR_BGR2LAB).astype(np.float32)
    ring=(al>0.05)&(al<0.6)
    skin=ring&(pl[...,0]>60)&(pl[...,0]<200)&(rl[...,0]>60)&(rl[...,0]<200)
    for c in range(3):
        pl[...,c]+= rl[...,c][skin].mean()-pl[...,c][skin].mean()
    return cv2.cvtColor(np.clip(pl,0,255).astype(np.uint8),cv2.COLOR_LAB2BGR)
CX,CY,CW,CHh,K=475,600,600,800,0.8
crop=lambda im,x,y,w,h: cv2.resize(im[y:y+h,x:x+w],(round(w*K),round(h*K)),interpolation=cv2.INTER_AREA)
Image.fromarray(cv2.cvtColor(crop(base,CX,CY,CW,CHh),cv2.COLOR_BGR2RGB)).save(O+'/out/ama_base.webp',quality=82,method=6)
al=ellipse(MW,MH,22); tiles=[]; order='XABCDEF'
for k in order:
    w,n=align(frame(*SH[k])); p=w[MY:MY+MH,MX:MX+MW]; ref=base[MY:MY+MH,MX:MX+MW]
    p=colormatch(p,ref,al); rgba=np.dstack([cv2.cvtColor(p,cv2.COLOR_BGR2RGB),(al*255).astype(np.uint8)])
    tiles.append(cv2.resize(rgba,(round(MW*K),round(MH*K)),interpolation=cv2.INTER_AREA)); print(k,SH[k],'inliers',n)
ae=np.zeros((EH,EW),np.float32); cv2.rectangle(ae,(12,10),(EW-13,EH-11),1,-1); ae=cv2.GaussianBlur(ae,(0,0),5); w=best[2]; p=colormatch(w[EY:EY+EH,EX:EX+EW],base[EY:EY+EH,EX:EX+EW],ae)
blink=cv2.resize(np.dstack([cv2.cvtColor(p,cv2.COLOR_BGR2RGB),(ae*255).astype(np.uint8)]),(round(EW*K),round(EH*K)),interpolation=cv2.INTER_AREA)
Image.fromarray(np.hstack(tiles)).save(O+'/out/ama_mouths.webp',quality=85,method=6)
Image.fromarray(blink).save(O+'/out/ama_blink.webp',quality=85,method=6)
json.dump({'w':round(CW*K),'h':round(CHh*K),'mouth':{'x':round((MX-CX)*K),'y':round((MY-CY)*K),'w':round(MW*K),'h':round(MH*K),'order':order},'blink':{'x':round((EX-CX)*K),'y':round((EY-CY)*K),'w':round(EW*K),'h':round(EH*K)},'src':{k:f'{v[0]}#{v[1]}' for k,v in SH.items()}|{'blink':f'a05b_ama2#{best[1]}','base':'a05b_ama2#185 aligned to ama2_first'}},open(O+'/out/ama_sprite.json','w'),indent=1)
# preview: each shape composited
prev=[]
b=cv2.cvtColor(crop(base,CX,CY,CW,CHh),cv2.COLOR_BGR2RGB).astype(np.float32)
mx,my=round((MX-CX)*K),round((MY-CY)*K)
for t in tiles:
    c=b.copy(); a=t[...,3:4]/255.; c[my:my+t.shape[0],mx:mx+t.shape[1]]=c[my:my+t.shape[0],mx:mx+t.shape[1]]*(1-a)+t[...,:3]*a
    prev.append(c[150:450,90:390])
Image.fromarray(np.hstack(prev).astype(np.uint8)).save(O+'/preview.jpg',quality=80); bb=b.copy(); bx,by=round((EX-CX)*K),round((EY-CY)*K); a=blink[...,3:4]/255.; bb[by:by+blink.shape[0],bx:bx+blink.shape[1]]=bb[by:by+blink.shape[0],bx:bx+blink.shape[1]]*(1-a)+blink[...,:3]*a; Image.fromarray(bb[150:450,90:390].astype(np.uint8)).save(O+'/blinkchk.jpg')
