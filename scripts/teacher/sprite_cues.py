# Pilot B cue builder: Rhubarb mouthCues (CI, from Kokoro WAV) -> lines JSON + VAD-gated cues (mouth closed where the audio is silent) + boundary error vs audio.
# Usage: python sprite_cues.py <dir with <id>.wav + <id>.json> <out dir>
import json,sys,numpy as np,wave,subprocess
V,S=sys.argv[1],sys.argv[2]; T={'a_nowyou':'Now you. Repeat after me!','a_could':'Oh! Could I get a latte, please?','a_muffin':'Could I get a muffin, please?','a_askcash':'Your turn. Ask to pay in cash!'}
out={}; errs=[]
for id,text in T.items():
    w=wave.open(f'{V}/{id}.wav'); sr=w.getframerate(); x=np.frombuffer(w.readframes(w.getnframes()),np.int16).astype(np.float32)/32768
    if w.getnchannels()>1: x=x.reshape(-1,w.getnchannels()).mean(1)
    hop=int(sr*.01); rms=np.array([np.sqrt((x[i:i+hop*2]**2).mean()) for i in range(0,len(x)-hop*2,hop)])
    db=20*np.log10(rms+1e-9); thr=db.max()-35; sp=db>thr
    # smooth: fill gaps < 80 ms, drop blips < 40 ms
    def runs(b):
        r=[];s=None
        for i,v in enumerate(b):
            if v and s is None: s=i
            if not v and s is not None: r.append([s,i]); s=None
        if s is not None: r.append([s,len(b)])
        return r
    R=runs(sp); M=[]
    for a in R:
        if M and a[0]-M[-1][1]<8: M[-1][1]=a[1]
        else: M.append(a)
    vad=[(a/100,b/100) for a,b in M if b-a>=4]
    cues=json.load(open(f'{V}/{id}.json'))['mouthCues']
    cs=[]
    for c in cues:
        on=c['value'] not in 'XA'
        if on and cs and abs(cs[-1][1]-c['start'])<1e-6: cs[-1][1]=c['end']
        elif on: cs.append([c['start'],c['end']])
    cs=[(a,b) for a,b in cs if b-a>=0.04]
    # boundary error: each VAD boundary vs nearest cue boundary
    vb=[t for seg in vad for t in seg]; cb=[t for seg in cs for t in seg]
    e=[min(abs(t-c) for c in cb)*1000 for t in vb]; errs+=e
    def gate(cues,vad):
        g=[]
        for c in cues:
            a,b,v=c['start'],c['end'],c['value']
            segs=[(max(a,x),min(b,y)) for x,y in vad if min(b,y)>max(a,x)] if v!='X' else []
            t=a
            for x,y in segs:
                if x>t+1e-3: g.append([round(t,2),'X'])
                g.append([round(x,2),v]); t=y
            if t<b-1e-3: g.append([round(t,2),'X'])
        o=[]
        for q in g:
            if not o or o[-1][1]!=q[1]: o.append(q)
        return o
    out[id]={'gated':gate(cues,vad),'text':text,'dur':cues[-1]['end'],'cues':[[round(c['start'],2),c['value']] for c in cues],'vad':vad,'err_ms':[round(v) for v in e]}
    print(id,'segments vad',len(vad),'cue',len(cs),'boundary err ms',[round(v) for v in e])
errs=np.array(errs); print('ALL boundary err ms: mean %.0f median %.0f p90 %.0f max %.0f n=%d'%(errs.mean(),np.median(errs),np.percentile(errs,90),errs.max(),len(errs)))
json.dump({k:{kk:v[kk] for kk in ('text','dur','cues','gated')} for k,v in out.items()},open(S+'/ama_lines.json','w'),separators=(',',':'))
json.dump({'boundary_err_ms':{'mean':round(float(errs.mean())),'median':round(float(np.median(errs))),'p90':round(float(np.percentile(errs,90))),'max':round(float(errs.max())),'n':len(errs)},'per_line':{k:v['err_ms'] for k,v in out.items()}},open(S+'/timing.json','w'),indent=1)
