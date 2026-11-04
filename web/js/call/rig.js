/* 🕺 LipRig – thân + tay sống cho giáo viên 2D, 0 credit, giữ đúng hình đã duyệt (docs/specs/teacher-motion.md §Rig thân tay): MỘT canvas WebGL dưới lớp mặt vẽ.
 * Vẽ thân từ ảnh tĩnh registry (Chars.still/đầu trơn) và uốn trong shader, không cần cắt lớp: thở (co giãn quanh hông), lắc thân (xô ngang theo độ cao), tay (xoay vùng khuỷu→bàn tay quanh khuỷu, rơi mềm theo khoảng cách).
 * Input số kiểu Rive (breath, sway, arm[2], mix) → sau này thay lớp này bằng footage/Rive mà không đổi người gọi. Đầu do LipFace vẽ ở canvas trên, thân ở đây cắt mềm ở cổ.
 * Tọa độ = pixel poster-2x (1108×960). Không có WebGL / giảm chuyển động / máy yếu → teacher.js giữ cách vẽ 2D cũ. */
(function (g) {
  // [khuỷu x, y, bàn tay x, y, bán kính] – đo trên ảnh (scripts/test/chars-lively-shots.mjs chụp tờ soát); poster: tay xuôi, xoay quanh vai nên biên độ nhỏ
  const LIMB = {
    ama: { rest: [[420, 520, 380, 900, 70], [680, 520, 720, 900, 70]], explain: [[368, 740, 442, 540, 85], [732, 740, 662, 540, 85]], encourage: [[300, 680, 330, 880, 60], [724, 750, 824, 570, 80]] },
    carlos: { rest: [[280, 580, 180, 950, 90], [830, 580, 930, 950, 90]], explain: [[250, 900, 442, 570, 105], [960, 900, 702, 570, 105]] },
  };
  const NECK = { ama: 486, carlos: 520 }, DX = { carlos: { explain: -26 } }; // đường cắt thân/đầu; lệch ngang tư thế so với poster để cổ khớp
  const GEST = { ama: ['explain', 'encourage'], carlos: ['explain'] };
  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const FS = `precision mediump float;varying vec2 v;uniform sampler2D A,B;uniform float m,br,sw,neck,dx;uniform vec4 ca[2],cb[2];uniform vec2 ra,rb,an,bn;
float cap(vec2 P,vec2 a,vec2 b,float r){vec2 d=b-a;float h=clamp(dot(P-a,d)/dot(d,d),0.,1.);return 1.-smoothstep(r*.75,r*1.5,length(P-a-d*h));}
vec2 rot(vec2 P,vec2 o,float t){float c=cos(t),s=sin(t);vec2 q=P-o;return o+vec2(c*q.x-s*q.y,s*q.x+c*q.y);}
vec2 arm(vec2 P,vec4 c[2],vec2 r,vec2 a){vec2 Q=P;for(int i=0;i<2;i++){float t=a[i]*cap(P,c[i].xy,c[i].zw,r[i]);if(abs(t)>.0001)Q=rot(Q,c[i].xy,t);}return Q;}
void main(){vec2 P=v*vec2(1108.,960.);P.x-=sw*(960.-P.y);P.y=960.-(960.-P.y)/(1.+br*smoothstep(960.,500.,P.y));
vec4 a=texture2D(A,arm(P,ca,ra,an)/vec2(1108.,960.)),b=m>0.?texture2D(B,arm(P-vec2(dx,0.),cb,rb,bn)/vec2(1108.,960.)):vec4(0.);
gl_FragColor=mix(a,b,m)*smoothstep(neck-26.,neck+10.,P.y);}`;
  const smooth = x => x * x * (3 - 2 * x);
  const neckOf = NECK;
  /** LipRig(cv, who, restImg, stillUrl) → null nếu máy không có WebGL · draw(st, now, dt) · sway/lift để lớp đầu đi cùng thân */
  g.LipRig = (cv, who, rest, stillUrl) => {
    const gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'low-power' }); if (!gl) return null;
    const sh = (t, x) => { const o = gl.createShader(t); gl.shaderSource(o, x); gl.compileShader(o); return o; }, pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr); gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const lp = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
    const U = n => gl.getUniformLocation(pr, n); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    const tex = (i, im) => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, gl.createTexture()); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); };
    tex(0, rest); gl.uniform1i(U('A'), 0); gl.uniform1i(U('B'), 1); gl.uniform1f(U('neck'), NECK[who]);
    const caps = (n, list) => { gl.uniform4fv(U(n), list.flatMap(c => c.slice(0, 4))); gl.uniform2f(U(n === 'ca' ? 'ra' : 'rb'), list[0][4], list[1][4]); }; caps('ca', LIMB[who].rest);
    const ok = {}, want = GEST[who]; let cur = '', mix = 0, target = 0, quiet = 9, pick = 0, beat = 0, side = 1, last = 0, dead = false;
    // ảnh tư thế nạp sau, thiếu thì thôi cử chỉ (vẫn thở + lắc)
    for (const p of want) { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => { if (!dead) ok[p] = im; }; im.src = stillUrl(who, p); }
    const use = p => { if (cur === p || !ok[p]) return !!ok[p]; cur = p; tex(1, ok[p]); caps('cb', LIMB[who][p]); gl.uniform1f(U('dx'), (DX[who] || {})[p] || 0); return true; };
    const self = {
      sway: 0, lift: 0, stats: { gest: 0 },
      /** câu mới: chọn cử chỉ theo hạt giống của câu (cùng câu, cùng cử chỉ) */
      phrase(seed) { pick = Math.abs(seed | 0); },
      /** st = trạng thái LipFace (talk 0..1, beat 0..1) · t = giây đồng hồ tường */
      draw(st, t, dt) {
        if (dead) return; const talk = st.talk || 0, W = cv.width, H = cv.height;
        quiet = talk > .25 ? 0 : quiet + dt; target = quiet < .7 && use(want[pick % want.length]) ? 1 : 0;
        if (target && !self.was) self.stats.gest++; self.was = target; // về tư thế nghỉ sau 0,7 s im; câu liền nhau giữ nguyên tay, không vẫy lên xuống mỗi cụm từ
        mix += Math.sign(target - mix) * Math.min(Math.abs(target - mix), dt / .26); // mờ chéo 260 ms ease bên dưới
        if (st.beat > beat + .4) side = -side; beat = st.beat || 0;
        const br = .007 * Math.sin(t * 1.75), sw = (.0035 + .0035 * talk) * Math.sin(t * .83 + pick) + .0012 * Math.sin(t * 2.1);
        const hit = beat * 0.085, idle = .012 * Math.sin(t * 1.3 + pick), mk = smooth(mix); // biên độ nhỏ: nhịp nói ~5°, nghỉ ~0,7°
        const key = [br, sw, mk, beat, idle].map(v => Math.round(v * 2000)).join();
        self.sway = sw * (960 - NECK[who]); self.lift = -br * 460;
        if (key === last) return; last = key;
        gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(U('br'), br); gl.uniform1f(U('sw'), sw); gl.uniform1f(U('m'), mk);
        gl.uniform2f(U('an'), .25 * idle + .004 * beat, -.25 * idle - .004 * beat);
        gl.uniform2f(U('bn'), idle + (side > 0 ? hit : hit * .35), -idle - (side > 0 ? hit * .35 : hit));
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
      destroy() { dead = true; const x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); },
    };
    return self;
  };
  g.LipRig.neck = neckOf;
})(self);
