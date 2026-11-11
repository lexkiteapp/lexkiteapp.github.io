> TL;DR: Lược đồ chính xác của vector M2 (lesson/rig/audio), định nghĩa rig giáo viên và ảnh giáo viên đóng gói – hợp đồng mà bản port Swift/Kotlin phải khớp. Sinh bởi `scripts/native/gen-{lesson,teach,audio,vocab}.mjs`; kiểm bằng `scripts/test/native-m2-vectors.mjs`. Mục cuối "M3 vectors" = vector + kiểm kê 15 màn từ vựng (P04/P05).
> Đọc khi: port hoặc sửa trình học bài, giáo viên, âm thanh trên iOS/Android, hoặc đổi các file gen trên.

# Native M2 – lớp chung: ghi chú bàn giao cho người port iOS / Android

Nhánh `native-m2`, worktree `social-channel-ui-57eaad`. Chưa commit. Mọi tệp dưới đây do `node scripts/native/gen.mjs` sinh từ JS web THẬT (`node:vm`/`require`); sửa web → `gen.mjs --check` đỏ → chạy `node scripts/native/gen.mjs`. Test gác: `node scripts/test/native-m2-vectors.mjs` (đã vào `scripts/test/suite.txt`, chạy trong `npm test`).

Luật cứng khi port: KHÔNG gõ tay chữ giao diện / màu / hằng số chấm điểm hay rig trong Swift/Kotlin (`native-one-source.mjs` chặn). Hằng số rig đọc từ `teach/rig.json`; logic = port của JS web, kiểm bằng vector. Dung sai số thực mặc định: **2e-6** (vector rig làm tròn 6 chữ số; mọi số thực trong rig.json làm tròn 9 chữ số thập phân để ổn định giữa x64/arm64 – so sánh rig dùng dung sai ≥ 1e-9) và **1e-9** cho vector lesson/audio (không làm tròn). Chuỗi so khớp tuyệt đối.

---------------------------------------------------------------------------------------------------
## 0. Tệp và cách đọc

| Tệp | Dùng cho | iOS đọc | Android đọc |
|---|---|---|---|
| `native/shared/gen/vectors/lesson.json` (206 KB) | P03 engine bài học | thẳng từ `native/shared/gen/vectors` (đúng như `Vectors.swift` hiện có, `#filePath/../../../../shared/gen/vectors`) | classpath resource `lesson.json` (test resources srcDirs của `:app` đã trỏ `../../shared/gen/vectors`) |
| `native/shared/gen/vectors/rig.json` (403 KB) | C05 khung rig, lip sync, nét vẽ, mood | như trên | resource `rig.json` |
| `native/shared/gen/vectors/audio.json` (27 KB) | C04 URL + chọn giọng | như trên | resource `audio.json` |
| `native/shared/gen/teach/rig.json` (22 KB) | ĐỊNH NGHĨA rig (app dùng lúc chạy, không chỉ test) | bản sao tự sinh `native/ios/LexkiteKit/Sources/LKDesign/Resources/teach/rig.json` (`.copy("Resources/teach")` đã có trong `Package.swift` → `Bundle.module` đường dẫn `teach/rig.json`) | asset `teach/rig.json` (assets srcDir `../../shared/gen`); trong JUnit thuần đọc tệp `../../shared/gen/teach/rig.json` (đừng thêm `teach` vào test resources: trùng tên `rig.json` với vector) hoặc Robolectric `assets.open("teach/rig.json")` |
| ảnh giáo viên | xem §6 | `LKDesign/Resources/teach/<who>/…` | asset `teach/<who>/…` |

Không chép vector vào package (quy ước M1; chỉ `scoring.json` có bản sao trong `LKCoreTests/Resources`). Đã KHÔNG sửa `Package.swift`/gradle.

---------------------------------------------------------------------------------------------------
## 1. `vectors/lesson.json` – engine bài học (P03). Nguồn: `web/js/lesson/engine.js`

Top: `now` (ms, 2026-01-05T09:00:00Z; đồng hồ cố định, **TZ=UTC**: `isDue` dùng cuối ngày UTC), `inputs`, `consts`, và các mảng ca (dưới).

**Quy ước mục (item)**: giữ nguyên MỌI trường JS (`id,type,word,why,ipa,retry,hints,mean,noAudio,sent,own,blank{i,n,toks,form},answer,options,tiles,prompt,tr,def,len,first,bank,alt,choice,spoke,pairs…`). Chỉ khác: trường `card` (đối tượng thẻ) được thay bằng **tham chiếu chuỗi** `"c:<i>"` → `inputs.cards[i]`, `"s:<i>"` → `inputs.starter[i]`; `null` với bài `match`/truyện. `pairs` của bài `match` do `build` sinh là mảng tham chiếu như vậy; `pairs` của `storyItems` là `{word, mean}` thường. Thứ tự khóa trong object không quan trọng; mảng thì quan trọng.

**`inputs`**: `cards[]` (18 thẻ đúng dạng web sau `Cards.make`: `word,pos,ipa,ipaUS,vi,def,ex,col,syn,sentences[{en,vi}],contexts,ctx,src,mod,srs{ef,interval,reps,lapses,due,last,step,S,D}`…; 6 thẻ đầu = bộ DEMO thật của `lesson/ui.js`, còn lại từ `lesson-ngsl1.1.json` với SRS/ngữ cảnh đặt có chủ ý, 2 thẻ cuối không có câu ví dụ), `starter[]` (6 thẻ STARTER của ui.js), `imgWords[]`, `gloss{câuEN:bản dịch}`. Quy tắc hàm đầu vào (chuỗi mô tả trong `meanRule/hasImgRule/glossRule/poolRule/pickMapRule`):
- `opts.pool = cards ++ starter` (đúng thứ tự danh sách).
- `hasImg(word,pos)` = `imgWords.includes(word)` khi ca có `img:true`, ngược lại luôn false.
- `gloss(card, câuEN)` = `inputs.gloss[câuEN] ?? ''` khi ca có `gloss:true`, ngược lại không truyền hàm.
- `mean(card)` = `card.vi ?? ''` khi `mean:"vi"`, `''` khi `mean:"none"`.
- `pickWords(cards, …)`: `cards:"all"` = map `{k0..kN}` theo thứ tự danh sách; `"none"` = rỗng; `"new"` = thẻ `srs.reps==0 && !srs.last`; `"noex"` = thẻ không có `ex/ctx/sentences`. Sắp xếp ổn định (hòa giữ thứ tự nhập).

**Các mảng ca** (mỗi ca: đầu vào + `out`; so `out` tuyệt đối):
| Khóa | Ca | Cách chạy |
|---|---|---|
| `pickWords[]` `{id,cards,opts{n,now,mode?},starter:bool,out:[{card:ref,why}]}` | 8 | `pickWords(cards, {...opts, starter: starter ? inputs.starter : []})`. `why` ∈ due/ext/new/start |
| `build[]` `{id,seed,pick:<id pickWords>,mean,gloss,img,off?,only?,calm?,perWord?,match?,out:[item]}` | 20 | picks = `pickWords[pick].out` (map ref→thẻ); `build(picks,{seed,pool,off,only,calm,perWord,match,hasImg,gloss,mean})` (khóa vắng = không truyền). Có ca tắt nghe, tắt nói, `only` (gap/build; KIND.listen; KIND.speak), `calm`, `perWord` 1/3, không match, từ không có câu (`mean` thay `say`, `spoke:true`) |
| `adapt{offs[4], cases[{in:item, outs:[{off,out}]}]}` | ~10 dạng | `adapt(in, off)` cho 4 tổ hợp `{},{listen},{speak},{listen,speak}` |
| `check[{item{type,answer,choice?}, cases[{ans,ok}]}]` | 10 | `check(item, ans)`; `ans` có thể là chuỗi, số (điểm nhận dạng), mảng ô chữ, `true/false` (match) |
| `session[]` `{id,build,opts{maxRetry?,ease?},script,steps[],log,wrong{},firstOk[],results[],resultsNow}` | 8 | `new Session(build[...].out, opts)`; mỗi bước theo `script` (ký tự `1`=đúng `0`=sai `s`=bỏ qua; hết chữ → đúng) cho tới `done`. `steps[k]` = `{op:'right'|'wrong'|'skip', res, cur(id kế|null), curRetry, solved, progress, combo, best, n, ok1, miss, accuracy, done, q:[[id,retry]…]}` chụp SAU bước. `res` = giá trị trả của `answer()`: `{ok,combo,requeued?}` / `{ok:true,combo,free:true}`; `null` khi skip. Cuối: `log`, `wrong` (Map→object theo `norm(word)`), `firstOk`, `total` ở `start.total`. `results[{word,grade,add,card:ref|null}]` = `results(sess, items, cards={c0..cN}=inputs.cards, now=resultsNow)` |
| `rng[{seed,out[8]}]`, `shuffle[{seed,in,out}]` (`shuffle(in, rng(seed))`), `letterBank[{word,seed,out}]` (`letterBank(word.toLowerCase(), rng(seed))`) | | rng xorshift32 (`s^=s<<13; s^=s>>>17; s^=s<<5`, kết quả `((s>>>0)%1e6)/1e6`, hạt 0→1) – số thực chính xác 6 chữ số |
| `toks`, `norm`, `findWord{sentence,word,out{i,n,toks,form}|null}`, `sentenceOf[{card:'c:i',out}]`, `stress`, `usuk`, `visemes[{text,dur|null,out:[[t,shape]]}]` | | hàm thuần cùng tên |
| `plans[{cards:'mixed'|'many-due'|'none', now, path:[{has,out:[kind×6]}], unit:[…]}]`, `nextKind[{kind,ctx,out}]`, `isDue[{card,now,isDue,fromExt}]` | | `pathPlan(cards,now,has)`, `unitPlan`, `nextKind`, `isDue(c,now)`, `fromExt(c)`. Bản đồ thẻ của `plans`: `'mixed'`=toàn bộ `inputs.cards`; `'many-due'` = như vậy nhưng MỌI thẻ gán `srs={ef:2.5,interval:3,reps:2,lapses:1,due:now0-2·DAY,last:now0-5·DAY,step:0,S:3,D:5}` (now0 = `now`); `'none'`={} |
| `calm{in,out(ids),hard[]}`, `hard[{item,out}]` | | `calm(items)` thứ tự id sau; `HARD(item)` |
| `storyItems[{story,lang,seed,out}]` (5 truyện × 4 ngôn ngữ `vi,en,ar,xx`; seed 2, riêng `ar` seed 3), `storySession{story,lang,seed,steps[]}` | | `storyItems(story, lang, seed)` trên `web/cpack/lesson/stories.js` (CDN: `…/cpack/lesson/stories.js`, mảng `self.LESSON_STORIES=[…]` → parse JSON sau dấu `=`); `storySession` đi hết hàng đợi: dòng `free` → `answer(true)`, còn lại `answer(i%4!==0)` |
| `consts{HINTS,KIND,DAY}` | | bảng gợi ý và loại nút (`KIND.lesson/review = null`) |

Ghi chú port: `Session.accuracy` làm tròn `Math.round`; `progress` = `min(1, solved/total)`; `answer()` của `free` không tăng `n`; `ease` đẩy bài dễ lên đầu khi `miss>=2`. Web ui.js dùng thêm `app` (FSRS ghi `results` → `SRS.review`, đã có vector `scoring.json`).

---------------------------------------------------------------------------------------------------
## 2. `teach/rig.json` – định nghĩa rig (dùng lúc chạy) và cách web VẼ

Native = port của `TeacherRig` web (KHÔNG .riv): cùng input `viseme` (9 hình), `emotion` (9), trigger `gesture`. Code tham chiếu phải đọc: `web/js/teacher-rig.js` (`machine`, `matrix`, `cuesOf`, `poseOf`; lớp DOM `mount` ở nửa dưới là phần cần làm bằng Canvas), `web/js/call/face.js` (`machine`, `parts`), `mouths.js` (`SHAPE/STYLE/mix/svg`), `paint.js` (`compile`/`draw`), `lipsync.js` (`stateAt`, `gain`, `unpack`, `fromText`, `live`, `fromEnv`).

### Schema `teach/rig.json`
- `canvas {w:1108,h:960,breathPivot:[554,960]}` – MỌI toạ độ mặt là pixel **poster-2x 1108×960**; ảnh đầu và mọi ảnh tư thế cùng kích thước 1108×960, cùng gốc (góc trên-trái), nền trong suốt. Canvas hiển thị tỉ lệ 1108/960, rộng = min(1108, chiều rộng·dpr); `sc = canvasW/1108`.
- `fps:60`, `limits {tilt:6,nod:8,shake:4,sway:3,breath:0.006,perFrame{tilt,nod,sway,brow,knit,smile,look,fade}}` (độ, px, px, tỉ lệ co; `perFrame` = bước tối đa mỗi khung 60 fps, nhân `dt·60`), `fade:0.18` (s, mờ chéo mặt↔tư thế).
- `emotions{name:{brow,knit,smile,o,look[x,y],tilt,nodHz,nodPx}}` (9: neutral happy praise encourage thinking surprise listen sad explain).
- `poseEmo{pose→emotion}` (cho TeacherMood/`Chars.POSE_EMO`).
- `people.ama|carlos`: `{name, voice(af_heart|am_michael – giọng app), head:'teach/<who>/head-bare-2x.webp', stillPattern, seed (=[...who].reduce((a,c)=>a*31+c.charCodeAt(0),7), dùng làm hạt `machine`), stills[] (chỉ-ảnh: ama thumbs_up,clap · carlos thumbs_up,hold_card), poses[] (mọi tư thế người này CÓ ảnh = `Chars.has`), bundledPoses[], gestures{name→…}}`. `gestures[name]`: `{kind:'proc',dur}` (nod 0.9, shake 1.1, blink 0.16, bob 0.6 – thủ tục trên khớp cổ) hoặc `{kind:'pose', wanted, pose (ĐÃ giải theo người: `poseOf(G, has)` → dùng `alt` khi người chưa có ảnh), file:'teach/<who>/still-<pose>.webp', hold(s), emo, pending, alt, bundled}`.
- `face.rig.ama|carlos` = `LipFace.RIG`: `skin, ink, pivot[px,py] (tâm xoay cổ), mouth[x,y], rest, look[x,y], hl, lw, flick, iris, temper{blink[a,b],dbl,brow,tilt,nod,sacc[a,b]}, eyes[{c,rx,ry,side}], brows[{i,p,o,th}], erase, stache{c,w,h} (chỉ Carlos)`; `face.emo` = `LipFace.EMO` (bảng biểu cảm của face machine; TeacherRig không truyền `emo`).
- `mouth {shapes[X A B C D E F G H], shape{X..H → {w,u,d,a,s,tt,tb,tg,tu,bite,lip}}, style{ama,carlos}, segments:24}` – 11 tham số mỗi hình; `mix(A,B,k)` = nội suy tuyến tính từng khóa.
- `lip {vis (bảng viseme chung: shapes,names,fallback,timing,leads,arpabet,ipa), blend:0.06, minHold:0.05, lead:0.02, leads{A:.065,G:.045,F:.04}, gain{min:.45,max:1.15}, dict (từ điển live "#P:…" gọn; `LipSync.parseDict`), elv, emin}`.
- `bundle {head, poses[9], maxStillBytes, fallbackPose:'happy'}`, `moodRules` (mô tả; số liệu ở vector `mood`).

### Máy trạng thái (`machine.step(now)`) – port đúng từng dòng, hằng số ở trong code JS
`step(now)` (now = giây, khung đầu `dt=1/60`; `dt = clamp(now-prev,0,0.1)`, `k=dt·60`):
1. Biểu cảm = lò xo tắt dần tới hạn ω=9 rad/s trên 7 khóa `brow,knit,smile,o,lx,ly,tilt` (vận tốc khởi đầu 0; `dts=min(dt,1/30)`); `nodHz,nodPx` đặt thẳng từ đích.
2. Lớp miệng/mắt: đang `speak` → `S.M.at(clock())` (live: `tick` rồi `at(max(0,clock−LEAD))`), không thì `idle.at(now % 120)` (idle = `LipFace.machine(who,{dur:120,seed,calm})`); `openK` tăng `dt/0.04` khi `playing`, giảm `dt/0.08` khi không → pha `LipMouth.mix('X', mouth, openK)`, `shape='X'` nếu `openK<0.5`, `open*=openK`; im + `emo.o>0.01` → trộn sang `E` theo `o·(1−openK)`; `mouth.s += emo.smile·(open>0 ? .5 : 1)` kẹp [−0.3, 0.9].
3. Tư thế: `poseW` tiến về `poseWant` (0/1) tốc độ `min(dt,1/30)/FADE`; đạt 1 thì giữ `hold` giây rồi về 0; cử chỉ khi đang nói → xếp hàng (tối đa 2), chạy khi hết câu (`quiet()`); `speak()` huỷ tư thế đang giữ.
4. Khớp cổ: `proc` nod `6·env·max(0,sin(4πu))`, bob `3·env`, shake sway `3.2·env·sin(6πu)` + tilt `0.6·env·sin(6πu)` (env=`sin(πu)`, u=(now−t0)/dur); `tilt = clamp(s.tilt + emo.tilt·0.6 + pt, ±6)`, `nod = clamp(s.nod + pn + nodE, ±8)` (`nodE = nodPx·max(0,sin(2π·nodHz·now))`), `sway = clamp(ps, ±3)`; `calm` ⇒ tilt=nod=sway=breath=0 và các cử chỉ `proc` (trừ blink) bị bỏ; sau đó `toward(cur, want, perFrame·k)`. `breath = 0.006·sin(2π·0.22·now)`.
5. `brow = toward(…, clamp(s.brow+emo.brow,−.3,1))`, `knit` (0..1), `look` kẹp [−1,1]; `blink = max(s.blink, blinkProc)`.
Kết quả mỗi khung (`last`): `shape, talking, tilt, nod, sway, breath, pose, poseW, faceW=1−poseW, emo`, và trạng thái mặt `s` (mouth params, blink, look, brow, knit, open, gain…). `speak({clock,playing,cues,env,live,dur,text})` tạo `LipFace.machine(who,{cues,env,dur:max(30,dur),seed: seed + text.length, text, calm})` (chữ kết thúc bằng `?` thêm nhướng mày cuối câu). Nên port cả `LipFace.machine` (chớp: lịch `mulberry32`, 2 loại; liếc; nhấn mạnh; nghiêng đầu theo năng lượng nói) – hạt giống/`mulberry32` là số nguyên 32 bit: Swift dùng `&+ &*` và `UInt32`, Kotlin `Int` có tràn.

### Cách vẽ (thứ tự lớp, biến đổi) – y như `mount()` của web
Mỗi khung (chỉ vẽ lại khi khoá đổi; web có tối ưu vùng, native có thể vẽ lại cả khung):
1. Ma trận khung (`TeacherRig.core.matrix(f)`): xoay `-tilt` độ quanh `pivot` (mỗi người) + tịnh tiến `(sway, nod)` rồi co giãn đều `k=1+breath` quanh `(554, 960)`. Dạng affine `[a,b,c,d,e,f]` (x' = a·x + c·y + e; y' = b·x + d·y + f), công thức trong `matrix()`; vector `matrix[]` kiểm. Biến đổi vẽ T = `scale(sc) ∘ matrix`. KHÔNG trượt (a=d, b=−c).
2. Nếu `faceW > 0`: (a) vẽ **ảnh đầu trơn** `head-bare-2x.webp` (đã xoá mắt/mày/miệng/ria) với T; (b) vẽ lần lượt 5 lớp mặt từ `LipFace.parts(who, s, id)`: **mắt trái, mắt phải, mày (cả 2), miệng, ria (Carlos)**. Mỗi lớp là danh sách lệnh (§3 `paint`); lớp miệng có `tr` (translate tới `mouth[x,y]`) + `clip` lòng miệng.
3. Nếu `pose != null && poseW > 0` và ảnh đã tải: vẽ **ảnh tư thế** (cùng T, alpha = `poseW`). Khi đang mờ chéo (`0<faceW<1`): vẽ cả khuôn mặt (ảnh đầu + 5 lớp) vào lớp riêng rồi cộng vào canvas với alpha `faceW` bằng chế độ **cộng (`lighter`)**, ảnh tư thế cũng cộng với alpha `poseW` → kết quả = `(1−w)·mặt + w·tư thế` và không trong suốt giữa chừng (source-over sẽ làm người trong suốt 25 %). SwiftUI/CoreGraphics: `blendMode(.plusLighter)` / `BlendMode.Plus` (Compose: `BlendMode.Plus`).
4. Nền canvas trong suốt; không có bóng/quầng (kiểu Duolingo, chạm nền).
Ảnh tư thế chỉ bật hình khi đã tải XONG (web tải trước rồi mới `M.gesture`). `reduced motion` ⇒ `calm:true`. Máy yếu/ẩn màn: dừng vòng vẽ (0 CPU), khi chạy lại đặt `prev` lại (dt không nhảy).

### Luồng nói (lớp DOM → native)
`speak(audio, visemes, {text,dur})`: `cuesOf(visemes)` → `{cues,env,dur}`; `clock()` = đồng hồ player (giây, có bù trễ đầu ra như `LipSync.clock`: nội suy giữa mẫu, + 1 khung trình chiếu − latency loa), `playing()` = đang phát; không có mốc → `live = LipSync.live(text,{dur})` (đặt `LipSync.setDict(rig.lip.dict)` như web lesson). Kết thúc (ended/error) → `quiet()`. Cử chỉ: `gesture(name)`; nghe: `listen(on)` = `setEmotion(on ? 'listen' : 'neutral')`.
Mốc `cues`: Kokoro đã sinh sẵn trong `web/js/call/cues.js` (`LK_CUES.k[lineKey] = [ms, cues, env]`, khoá = `KVoice.lineKey(voice,text)`; mp3 tương ứng là `<key>-ls.mp3`). Câu không có mốc → `fromEnv` (khi giải mã được tiếng) hoặc `live` theo chữ. (`fromEnv` và `live` đều có vector.)

---------------------------------------------------------------------------------------------------
## 3. `vectors/rig.json` – schema

Top: `fps:60`, `every:6`, `columns[]`, `sources`, `lipsync`, `lipGate`, `scenarios`, `matrix`, `paint`, `mood`.

**`sources{key→{key,dur,cues:[[start,value]…],env255:[int…]}}`** (19 dòng Kokoro THẬT từ cues.js). Cue `i` kết thúc tại `cues[i+1].start` (cuối: `dur`). `env = env255[j]/255` (Double). Mốc 100 Hz.

**`scenarios[]`** (24 = 12 × {ama, carlos}): `{id, who, calm, seed, dict, seconds, events[], rows[]}`. Chạy: `machine(who,{calm, seed, has})` với `has(p)` = `p ∈ rig.people[who].poses`; `now = i/60` với `i=0..round(seconds·60)−1`. TRƯỚC khi `step(now)` ở khung `i`, áp mọi sự kiện có `t ≤ now+1e-9` theo thứ tự `t`:
- `{op:'emotion',name}` → `setEmotion(name)` · `{op:'listen',on}` → `setEmotion(on?'listen':'neutral')` · `{op:'gesture',name}` → `gesture(name, now)` · `{op:'quiet'}` → `quiet()`.
- `{op:'speak', source|text, dur?, text}`: `t0=now`; `clock = ()=> curNow−t0`, `playing = ()=> curNow−t0 < dur` (`dur` = `sources[source].dur` hoặc `e.dur`). Có `source` → `cues/env` từ `sources`; không có → `live = LipSync.live(text,{dur})` (kịch bản `speak-live` có `dict:true` ⇒ `setDict(rig.lip.dict)` trong suốt kịch bản).
`rows[r]` ứng với khung `i = r·6` (và khung cuối), mảng theo `columns`: `i, shape, talking(0/1), tilt, nod, sway, breath, poseW, pose(tên|null – tên tư thế gần nhất đã yêu cầu; chỉ vẽ ảnh khi poseW>0), emo(tên), blink, brow, knit, lookX, lookY, open, gain, m.w, m.u, m.d, m.a, m.s, m.tt, m.tb, m.tg, m.tu, m.bite, m.lip` (tham số miệng SAU khi cộng `smile`). Bước đủ mọi khung 60 fps, so sánh ở các hàng. Dung sai 2e-6 (chuỗi/`shape`/`pose`/`emo` khớp tuyệt đối; chỗ `shape` đổi đúng ranh giới có thể lệch 1 khung nếu chênh làm tròn → báo lại, đừng nới).
Kịch bản: `idle`, `emotions` (đổi mỗi 0,7 s), `gestures` (nod, shake, bob, blink, cheer, thumbs_up, hold_card, clap, wave), `speak-cues`, `speak-queue` (cử chỉ đến khi đang nói được xếp hàng), `speak-live`, `listen-then-speak`, và bản `*-calm` (Reduce Motion) của 5 cái đầu.

**`lipGate[]`** (38 = 19 câu × 2 người) – cổng lip sync ±33 ms: `{source, who, seed:3, nowOffset:100, text, transitions:[[t,shape]…], checks:[{i,start,value,deltaMs}]}`. Chạy: `machine(who,{seed:3})` (không `has`), `speak({clock:()=>T, playing:()=>T<dur, cues, env, dur, text})`, vòng `i=0…` trong khi `T<=dur+0.1`: `T=i/60`, `shape = step(100+T).shape`; ghi mỗi lần `shape` đổi `[T,shape]` (`T` làm tròn 6 chữ số). `transitions` phải khớp (cùng số lượng/hình, `t` ±2e-6). Mỗi `check` (cue có `value` chưa từng hiện ngay trước đó, độ dài ≥ 50 ms, không sát đầu/cuối câu): trong `transitions` tìm lần chuyển đổi sang `value` GẦN `start` nhất → `|t−start| ≤ 0.033` (`deltaMs` là số web đo, native phải ±1 ms). Tối đa web hiện tại 27 ms.

**`lipsync{}`**: `tolMs:33` · `unpack[{packed:[ms,cuesStr,envStr?], out:{dur,cues:[[start,value]],env255|null}}]` (7 ca gồm 3 định dạng mốc: `"*"` delta 5 ms base36, `"+"` delta, tuyệt đối ms; env base64 với `~n.` = n nhóm `AAAA`) · `units{plain,dict}[{text,out:[{v,w,wi,ci,gap?}]}]` (`dict` = sau `setDict(rig.lip.dict)`) · `fromText{plain,dict}[{text,dur,out:[[start,end,value]]}]` · `fromEnv[{source,text,dur,out:[[start,end,value]]}]` (env = sources[source].env255/255) · `live[{text,dur,fps,voicedRule,trace:[[i,voiced,curValue]],cues:[[start,end,value]]}]` (mô phỏng: `lv.tick(t=i/60, voiced, 1/60)` cho `i=0…ceil(dur·60)+20`, `voiced = t>0.1 && t<dur−0.1 && (i%90)<72`; `trace` mỗi 6 khung; `dict` BẬT (`setDict(rig.lip.dict)` như gen-teach.mjs sinh – fromEnv cũng vậy)) · `stateAt[{source,t,a,b,k,i}]` (`stateAt(cues, t)`: `t+=LEAD` rồi tìm cue; `k=clamp((t−start)/BLEND,0,1)`) · `gain[{source,samples:[[t,g]]}]` (`gain(env)(t)`; hằng `GMIN/GMAX` ở `rig.lip.gain`, làm mượt tấn 30 ms/nhả 120 ms, `ref` = phân vị 95 % của env, đi trước `LEAD`).

**`matrix[]`**: `{who,pivot,tilt,nod,sway,breath,m:[a,b,c,d,e,f]}` – `matrix(f)` (2e-6).

**`paint[]`** (28 = 14 trạng thái × 2 người): `{who,name,state,parts:[5 danh sách lệnh]}`. `state` = đầu vào của `LipFace.parts(who, st, 'tr'+who)`: `mouth` (tên hình `"X".."H"` HOẶC object 11 tham số) + tuỳ chọn `blink, look{x,y}, brow, knit, open`; mặc định `mouth:'X', blink:0, look: RIG[who].look, brow:0, knit:0, open:0`. `parts[0..4]` = mắt trái, mắt phải, mày, miệng, ria (ria rỗng với Ama). Lệnh (kết quả `LipPaint.compile`, bỏ nhánh `display:"none"`): `{op:'save'|'restore'}`, `{op:'tr',x,y}` (translate), `{op:'clip', s:[shape…]}` (hợp các hình làm vùng cắt), `{op:'fill', s, c:'#RRGGBB', al}`, `{op:'stroke', s, c, w, cap, join, al}` (`al`=alpha); `shape` = `{d:'M… L… Q… C… Z'}` (đường SVG) | `{e:[cx,cy,rx,ry]}` (ellipse; circle = rx=ry) | `{r:[x,y,w,h]}`. Mọi toạ độ trong chuỗi SVG được **làm tròn 0.1** bằng `Math.round(n·10)/10` (làm tròn nửa lên, kể cả số âm: dùng `floor(x·10+0.5)/10`, KHÔNG dùng `.rounded()` mặc định của Swift hay `roundToInt` âm). So sánh: số lệnh, loại lệnh, màu, `cap/join`, cờ `al` khớp tuyệt đối; số trong `d/e/r/x/y/w` ±0.11 (hoặc port y hệt hàm làm tròn thì khớp tuyệt đối). Đây là bằng chứng port `LipFace.parts` + `LipMouth.svg` đúng.

**`mood[]`**: chuỗi sự kiện `[{type,data}]` qua `TeacherMood.machine().feed(type,data)` → `{type,pose,emo}`/`null` + `state{ok,bad}`: `answer` đúng → `cheer` (ok++,bad=0); sai → `concern`, từ lần sai thứ 2 liền → `encourage`; `streak` → `laugh`; `streakLost` → `empathy`; `idle` → `encourage`; loại lạ → `null`. `emo` = `poseEmo[pose] ?? pose`.

---------------------------------------------------------------------------------------------------
## 4. `vectors/audio.json` – C04

- `bases[3]`: `https://audio.lexkite.com/audio/l/`, `https://lexkiteapp.github.io/lexkite-media-2/audio/l/`, `https://lexkiteapp.github.io/audio/l/` (thứ tự = ưu tiên). `wordSuffix:'|s3'`. `rules{}` mô tả bằng chữ.
- URL = `<base><key>.mp3` (kind `l`, câu); kind `w` (từ): thay `/l/` cuối base bằng `/w/`: `…/audio/w/<key>.mp3`. Với kind `l`, nếu `key ∈ LISTEN_AUDIO_S2` thì thêm `-s2` vào key (tập này ở web; native có thể bỏ qua ⇒ luôn không `-s2`, vì tập chưa bắt buộc). `urls[{kind,key,fails,s2[],urls[]}]`: `fails` = số lần thất bại tích luỹ (lỗi/404/quá 7 s tới lúc bắt đầu phát; KHÔNG tính `blocked`/NotAllowed). Danh sách thử = `bases.slice(min(2, fails>>1))` (tức mỗi gốc được 2 lần lỗi rồi mới bỏ làm gốc đầu) → với từng URL lần lượt: lỗi/404/quá giờ → URL kế; hết URL → TTS máy.
- `voices{ama:'af_heart',carlos:'am_michael'}`; **khoá câu** `key = fnv36(voice + '|' + text.trim())` (`KVoice.lineKey`) – `sentence[{who,voice,text,key,urls,cueUrls}]`; `cueUrls` dùng key + `-ls` (bản có mốc lip; lỗi → mp3 thường + live). **Khoá từ đơn** = `fnv36(wordVoice + '|' + headword.trim() + '|s3')` (`word[{accent,word,voice,key,urls}]`; `wordVoice(en-US)=af_heart`, `en-GB=bf_emma`; headword = từ đúng như trong từ điển, phân biệt hoa/thường; không có file → TTS, đừng thử mãi). `fnv36[{in,out}]` = FNV-1a 32-bit (offset 0x811c9dc5, prime 0x01000193, `Math.imul`/`>>>0`, **mã UTF-16** của JS (`charCodeAt`) – Swift dùng `s.utf16`, Kotlin `s[i].code`), cơ số 36 chữ thường.
- `split[{text,out}]` = `KVoice.split` (tách câu để phát từng file: `/[^.!?;:]+[.!?;:]+["”’)]*|[^.!?;:]+$/g` rồi cắt ≤ 220 ký tự). `ttsClean[{in,out}]` = làm sạch trước khi đọc (bỏ emoji, phiên âm `/…/`, nhãn UK/US, từ loại, nhãn mục «Ví dụ…»; chỉ nhãn tiếng Việt vì `t` = identity trong vector; câu thường giữ nguyên).
- Giọng máy: `genderOf[{name,out:'f'|'m'|''}]`, `kokoro[{id,out:{accent,gender}|null}]`, `genderFor[{who,out}]` (ama→f, carlos→m, 'f'/'m' giữ nguyên, mã Kokoro→giới tính), `sampleVoices[{name,lang,localService}]`, `rank[{accent,gender,out:[tên theo thứ tự]}]`, `pick[{accent,gender,want,out}]` (giọng người dùng chọn `want` chỉ được nhận khi đúng giới tính yêu cầu), `score[{name,accent,gender,out}]` = `voiceScore` (−1 = loại). Chỉ accent tiếng Anh (web không có bảng `Target` ngoài Anh). Android tên giọng `en-us-x-…` không có giới tính trong tên ⇒ `genderOf` = '' (như web) – nếu cần giới tính thật thì chỉ dùng thêm metadata hệ thống làm bước SAU `pickVoice` (ghi chú, không thuộc vector).
- Hằng số phát lấy từ nguồn web (không có trong vector, đọc ở `web/js/ui.js`/`teacher.js`): từ chậm `rate 0.7`; giáo viên nói `rate` mặc định 0,95, `rate<0.9` ⇒ phát 0,75× còn lại 1×; khoảng nghỉ giữa các câu `SENT_GAP = 280 ms / tốc độ`; `TIMEOUT 7 s`; giữ `preservesPitch`. Web không chuẩn hoá −16 LUFS khi phát (file Kokoro đã chuẩn hoá lúc dựng ở CI) ⇒ native chỉ phát đúng file, không cần AGC.

---------------------------------------------------------------------------------------------------
## 5. Chuỗi bài học – ID mới trong `native/shared/strings.json` (86 ID, đủ 15 ngôn ngữ; `L10nKey.swift/.kt` đã sinh lại)

Dùng lại ID cũ cho: Tiếp tục `action.continue`, Kiểm tra `action.check`, Đóng `action.close`, Thử lại `action.retry`, Bắt đầu `today.start`, nhãn "Bài học" `today.lesson`, nhãn XP `today.xp`.
- Hộp/thanh: `lesson.kind.{lesson,listen,speak,review,story}` (Bài học/Nghe/Nói/Ôn lỗi/Truyện), `lesson.exit` (Thoát bài học – nhãn X), `lesson.progress` (nhãn thanh tiến độ), `lesson.teacher`, `lesson.target` {s}, `lesson.soon`, `lesson.home`, `lesson.stage` {n}, `lesson.demo`, `lesson.free`.
- Xác nhận thoát: `lesson.exitAsk` (Thoát bài? – khi đã lưu), `lesson.exitSaved`, `lesson.exitLose` (khi chưa lưu), `lesson.exitStay`, `lesson.exitGo`.
- Đề từng dạng: `lesson.q.gap` (Chọn từ còn thiếu) · `lesson.q.build` (Xếp câu tiếng Anh – có bản dịch) · `lesson.q.buildHeard` (Xếp thành câu – chỉ nghe) · `lesson.q.say` · `lesson.q.picChoice` (Đây là gì? – ảnh+chọn) · `lesson.q.picSay` (Nói tên hình) · `lesson.q.tr` · `lesson.q.mean` · `lesson.q.type` · `lesson.q.match` · `lesson.q.q`. (Dạng `line` không có tiêu đề.)
- Tiến độ/nhãn: `lesson.qn` {a}/{b}, `lesson.combo` {n}, `lesson.tag.old` (Lỗi cũ), `lesson.tag.looked` (Từ bạn đã tra), `lesson.typeHint` {letter},{n}.
- Thân câu hỏi: `lesson.replay`, `lesson.slow` (Nghe chậm hơn), `lesson.slowShort` (Nghe chậm – truyện), `lesson.sample` (Mẫu âm thanh), `lesson.yourAnswerField` (Câu trả lời của bạn – nhãn ô), `lesson.pic` (Ảnh minh họa – alt), `lesson.tapToSpeak`, `lesson.dialog`, `lesson.noListen`, `lesson.noSpeak`, `lesson.checkAnswer`, `lesson.video`.
- Nói: `lesson.listening`, `lesson.heard` {s}, `lesson.unclear`, `lesson.noVoice`, `lesson.orSkipSpeak`.
- Phản hồi: `lesson.right`, `lesson.wrong`, `lesson.streakDays` {n}, `lesson.why`, `lesson.great` (Tuyệt!), `lesson.answer`, `lesson.pairWrong`, `lesson.correctChoice`, `lesson.yourChoice`, `lesson.boost.title` (Tăng điểm), `lesson.boost.good` (Nói hay hơn), `lesson.stress` {n},{m}, `lesson.usuk`, `lesson.accUK`, `lesson.accUS`, `lesson.gold.{mnemonic,definition,example,none}`.
- Hoàn thành: `lesson.done`, `lesson.awesome` (≥ 80 % đúng), `lesson.keepGoing` (< 80 %), `lesson.accuracy`, `lesson.comboBest`, `lesson.time`, `lesson.learned`, `lesson.perfect`, `lesson.again`, `lesson.map`, `lesson.mistakes`, `lesson.share` {a},{x}, `lesson.copied`.
- Truyện/radio: `lesson.story.lookup` {w}, `lesson.story.notFound` {w}.
**KHÔNG ánh xạ được (thiếu trong pipeline i18n web, gen sẽ đỏ nếu thêm tay)**: `Hay sai` (nhãn "lỗi hay sai" của bảng Tăng điểm – web hiện hiện tiếng Việt ở mọi ngôn ngữ, lỗi tiềm ẩn của web; native: bỏ nhãn đó hoặc chờ thêm khoá qua pipeline) và `Radio` (web in chữ "Radio" thẳng; tên không dịch – cần coordinator quyết định cách cho phép). Web lesson CHƯA có nhãn cho gợi ý (HINTS `fifty/first/letter/bank/slow/pair`) nên chưa có khoá để ánh xạ: thêm qua pipeline web trước nếu native cần chữ. Test `native-m2-vectors.mjs` bắt mọi `t('…')` mới của `lesson/ui.js|teacher.js|story-stage.js` chưa có ID.

---------------------------------------------------------------------------------------------------
## 6. Ảnh giáo viên đóng gói offline

Byte-for-byte từ `web/teach/<who>/…`, mỗi tệp ≤ 60 KB (gen throw nếu vượt). Mỗi người 10 tệp: `head-bare-2x.webp` (lớp NỀN mặt vẽ – KHÔNG bao giờ hiện một mình) + `still-{happy,cheer,point,thinking,concern,encourage,laugh,empathy,thumbs_up}.webp` (đủ cho tấm phản hồi: cheer/concern/encourage, màn hoàn thành: cheer/encourage/laugh, mất chuỗi: empathy, mặc định rig: happy/thinking/point, gesture bank: thumbs_up).
- Android: `native/shared/gen/teach/{ama,carlos}/…` (assets srcDir) → đường dẫn asset `teach/<who>/<tệp>` (= đường dẫn CDN `https://lexkite.com/teach/<who>/<tệp>`, thứ tự: nhớ → asset → đĩa → CDN như `Teacher.kt` hiện có).
- iOS: `native/ios/LexkiteKit/Sources/LKDesign/Resources/teach/{ama,carlos}/…` (gói LKDesign, `Bundle.module`).
- Các tư thế khác (explain, wave, surprise, clap, hold_card, talk, listen, concern của Carlos là cùng ảnh với empathy…) tải từ CDN như web; thiếu mạng và chưa có file → dùng `rig.bundle.fallbackPose` (`happy`). `rig.json.people[who].gestures[name].bundled` cho biết cử chỉ nào có sẵn offline.
- Dung lượng: 20 tệp = **733 788 B (717 KB) mỗi nền tảng**; trước PR đã có 4 tệp Ama (136 200 B) ⇒ thêm **597 588 B (≈ 584 KB) mỗi nền tảng** (repo giữ 2 bản: ≈ 1,17 MB trong git). `rig.json` thêm 22 KB mỗi nền tảng.
- Tệp `still-*` là 1108×960 nền trong suốt (WebP, VP8X có alpha) – cần decoder WebP có alpha (iOS 14+ ImageIO, Android 4.3+ đều hỗ trợ).

---------------------------------------------------------------------------------------------------
## 7. Gợi ý test (XCTest `testParityP03/C04/C05`, JUnit `parity_P03/C04/C05`)
- P03: nạp `lesson.json`, dựng lại từng ca từ `inputs` + `build.*` rồi so JSON từng mục (đã có `jsonDiff` ở `Vectors.swift`); `Session` chạy kịch bản và so `steps`; `results`.
- C04: tính `fnv36`, `lineKey`, URL `urls/word/sentence`, `split`, `ttsClean`, `genderOf/kokoro/genderFor/rank/pick` – khớp tuyệt đối; kèm test player thật: gốc thứ nhất lỗi → gốc thứ 2, `fails` tăng, TTS cuối.
- C05: (1) `lipGate`: cổng ±33 ms bằng lõi native; (2) `scenarios` so từng hàng; (3) `matrix`, `paint` (so lệnh vẽ do port `LipFace.parts` sinh ra, chưa cần raster); (4) `mood`; (5) `lipsync.*` hàm thuần; (6) snapshot raster 2 người × mỗi hình miệng/biểu cảm do CI tự ghi.
- Mọi nơi dùng `Date`/lịch: đặt `TimeZone UTC` (`isDue` dùng cuối ngày UTC), đồng hồ cố định `now`.

## 8. Việc phiên chính cần biết
- Chưa làm mục 6 của brief (gold bank): `web/js/lesson/gold.js` (56 KB, `self.LESSON_GOLD = {"<từ>":[{why,w,r,mem,ex[]}]}`) – app tải qua CDN như web (parse JSON sau `self.LESSON_GOLD =`), không nhúng. Cấu trúc dùng ở "Vì sao?" (`explain`) và "Tăng điểm" (`booster`) trong `lesson/ui.js` 536–567.
- Ghi chú này nằm ngoài repo; nếu muốn người sau đọc được, chép vào `docs/specs/` (spec đã trỏ "ghi chú bàn giao M2"; `_doc` trong các vector nhắc `native-m2-shared.md`).
- Trong worktree có thay đổi KHÔNG phải của phiên này (Teacher.kt, OnboardingScreens.kt, snapshot onb-* bị xoá, brand/stitch/v2/onb-language*/splash*): giữ nguyên.

## vectors/vimg.json – ảnh dạng bài "pic" (thêm sau, `scripts/native/gen-vimg.mjs`)
Nguồn = `web/js/vocab-img.js` thật (VImg v3). App tải đầu `https://lexkite.com/js/lexicon-img.json` (`head`: `{v:3, base, sv, on, n}`) rồi mảnh `https://lexkite.com/js/vimg/<shard 2 chữ số>.json` (`{m:{key:hash}, s:[…], a:[…], x:[…], w:[…], p:{…}}`), cache đĩa.
- `pos[]` = `VImg.pos` (chuẩn hoá loại từ), `key` = `word.trim().toLowerCase() + '#' + pos` (đúng từ#loại, không lấy loại khác).
- `sh[]` = FNV-1a 32-bit theo code point của `word.toLowerCase()` (`Math.imul`, `>>> 0`) `% n`.
- `cases[]` (`word,pos,key,shard,hash,url,url2x,scene,a`): ảnh = `base + hash + '.webp'`. Bài "pic": chỉ khi `url != null && !scene` (ảnh cảnh cần câu ví dụ). Chế độ tối: ảnh `a == false` (nền kem) ẩn.
- `mode[]` = luật bật dần: Remote Config `vocab_img` ("on"/"off"/"" → web `true`/`false`/không đặt) + `vocab_img_pct` (mặc định `defaultPct` = 10) + nhóm thiết bị cố định 0–99 (sinh ngẫu nhiên 1 lần, lưu). `1` bật · `0` tắt · `-1` bật dần → bật khi `head.on`. Cờ mới trong `native/shared/flags.json`: `vocab_img`, `vocab_img_pct`.

## lesson.json `similarity` – chấm nói (say/pic không chọn)
`web/js/ui.js similarity()` thật: chữ thường, chỉ giữ `[a-z ]`, trim; cả hai rỗng → 1; `1 − Levenshtein / max(len)`. `score = round(sim·100)`. Luồng bài: `score ≥ pass (70)` → nộp `score/100`; thấp hơn → "Thử lại", trượt lần thứ `retriesBeforeSubmit` (2) → nộp luôn (Session chấm sai). Lấy câu nhận dạng tốt nhất trong các phương án (alts) theo `sim`.

## teach/cues.json – mốc khẩu hình sinh sẵn (như web)
= `window.LK_CUES` của `web/js/call/cues.js` (CI sinh từ audio Kokoro): `{v, k, dict}`. Khi giáo viên đọc một câu có giọng `voice`: `key = lineKey(voice, text)` (vectors/audio.json) → `k[key]` có → `LipSync.unpack` (vectors/rig.json `lipsync.unpack`) → `machine.speak({cues, env, dur})`; không có → `fromEnv` (độ lớn tiếng của file) rồi `fromText(text, dur, dict)`. Đúng thứ tự `web/js/lesson/teacher.js` (`cue(key)`). Android: asset `teach/cues.json`; iOS: LKDesign `teach/cues.json`. Chuỗi mới: `lesson.hint` ("Gợi ý") cho nút gợi ý.


---------------------------------------------------------------------------------------------------

Vector M3 (từ vựng, P04/P05): xem [native-m3-vectors.md](native-m3-vectors.md).
