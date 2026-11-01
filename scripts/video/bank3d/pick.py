import cv2,sys,numpy as np
src,out=sys.argv[1],sys.argv[2]
last=int(sys.argv[3]) if len(sys.argv)>3 else None
cap=cv2.VideoCapture(src);fr=[]
while True:
    ok,f=cap.read()
    if not ok:break
    fr.append(f)
n=len(fr) if last is None else min(last+1,len(fr))
g=lambda f:cv2.cvtColor(cv2.resize(f,(270,480)),cv2.COLOR_BGR2GRAY).astype(float)
g0=g(fr[0]);fps=24
lo=max(1,n-72)
best=min(range(lo,n),key=lambda i:np.abs(g(fr[i])-g0).mean())
cv2.imwrite(out,fr[best]);print(src,"frame",best,"of",n,"diff",round(np.abs(g(fr[best])-g0).mean(),2))
