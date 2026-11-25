/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 10 (đủ 4 kỹ năng). Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Nạp SAU data1.js: chỉ BỔ SUNG vào window.TOEFL, cùng cấu trúc với bộ 1 (cw ×2, daily ×4, academic ×2, response, conversation ×2,
* announcement ×2, talk ×2, sentence, email ×2, discussion ×2, repeat ×2, interview ×2).
* Đáp án đúng soạn ở vị trí 0 rồi xoay cuối file (A–D phân bố đều); mỗi câu có lv riêng chấm theo nội dung. */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });

/* Helper: o[0] là đáp án đúng, đặt vào vị trí a. */
const Q = (n, q, o, a, cue, explain, type, lv) => { const w = o.slice(1); w.splice(a, 0, o[0]); const r = { n, q, options: w, a }; if (type) r.type = type; r.lv = lv; r.cue = cue; r.explain = explain; return r; };
const mc = (instr, items) => ({ type: 'mcq', instr, items });
const P = (p) => p.join('\n\n');

/* ===================================================================
* READING · Complete the Words
* =================================================================== */
TF.reading.push({
id: 'tf10-cw1', set: 10, task: 'cw', title: 'Ocean Currents',
instr: 'Fill in the missing letters in the paragraph.',
text: `Ocean currents are large streams of seawater that flow continuously across the globe. Surface currents {ar|e} driven mainly by {wi|nd}, while deep currents {de|pend} on differences in {tem|perature} and salt content. The Gulf Stream, {fo|r} example, carries {wa|rm} water from the {tro|pics} toward Europe and {he|lps} keep winter {cli|mates} mild. Because currents move heat around the {pla|net}, scientists study them closely.`,
explain: [
`Chủ ngữ số nhiều "Surface currents" (dòng chảy bề mặt) đi với "are driven" (bị động: được tạo ra bởi).`,
`"driven mainly by wind" = chủ yếu do gió; "wind" là danh từ không đếm được đứng sau "by".`,
`"depend on" = phụ thuộc vào; chủ ngữ số nhiều "deep currents" nên động từ không thêm -s.`,
`"differences in temperature and salt content" = khác biệt về nhiệt độ và độ mặn; hai danh từ song song nối bằng "and".`,
`"for example" = ví dụ; cụm cố định đứng sau dấu phẩy để dẫn ví dụ (The Gulf Stream).`,
`"warm water" = nước ấm; tính từ đứng trước danh từ, đối lập với khí hậu mùa đông lạnh ở Châu Âu.`,
`"from the tropics" = từ vùng nhiệt đới; danh từ số nhiều đi với "the", đối lập với "toward Europe".`,
`Chủ ngữ số ít "The Gulf Stream" → "carries … and helps keep…"; cả hai động từ đều chia số ít.`,
`"winter climates" = khí hậu mùa đông; "mild" (ôn hòa) là tính từ bổ nghĩa sau động từ "keep".`,
`"around the planet" = quanh hành tinh; "Because currents move heat around the planet" giải thích vì sao các nhà khoa học nghiên cứu chúng.`,
],
});
TF.reading.push({
id: 'tf10-cw2', set: 10, task: 'cw', title: 'The History of Money',
instr: 'Fill in the missing letters in the paragraph.',
text: `Long before coins existed, people traded goods directly, a system called barter. It was often {in|convenient}, because each person had to {fi|nd} someone who {wa|nted} exactly what they offered. Around 600 B.C., the kingdom of Lydia {pro|duced} the first {sta|ndard} metal coins. Coins were {du|rable}, easy to carry, and {ac|cepted} by many people. Later, paper {mo|ney} became common in China, {wh|ere} merchants found heavy coins {ha|rd} to transport.`,
explain: [
`"inconvenient" = bất tiện; tiền tố in- mang nghĩa phủ định, vì mỗi người phải tìm đúng người cần món mình có.`,
`"had to find someone" = phải tìm ai đó; sau "had to" dùng động từ nguyên mẫu.`,
`"someone who wanted exactly…" = mệnh đề quan hệ chia quá khứ "wanted", khớp với "had to" và "offered".`,
`"produced" = đã sản xuất/phát hành; quá khứ đơn vì có mốc thời gian "Around 600 B.C.".`,
`"standard metal coins" = đồng xu kim loại theo chuẩn thống nhất; "standard" là tính từ trước danh từ.`,
`"durable" = bền; tính từ liệt kê song song với "easy to carry" (dễ mang theo).`,
`"accepted by many people" = được nhiều người chấp nhận; phân từ bị động song song với "durable".`,
`"paper money" = tiền giấy; danh từ ghép, chủ ngữ của "became common".`,
`"in China, where merchants found…" = ở Trung Quốc, nơi mà…; "where" là trạng từ quan hệ chỉ nơi chốn.`,
`"found heavy coins hard to transport" = thấy tiền xu nặng khó vận chuyển; cấu trúc found + tân ngữ + tính từ + to V.`,
],
});

/* ===================================================================
* READING · Read in Daily Life (câu 1–10)
* =================================================================== */
TF.reading.push({
id: 'tf10-dl1', set: 10, task: 'daily', title: 'Parking and Transit Update',
text: `NORTHFIELD UNIVERSITY – PARKING AND TRANSIT UPDATE\n\nBeginning September 3, Lot C behind the Engineering Annex will be reserved for faculty and staff until 5 p.m. on weekdays. Students who normally park there should use Lot F on Ridge Road, which has 300 additional spaces.\n\nA free park-and-ride bus will connect Lot F to the main quad every ten minutes from 7:30 a.m. to 6 p.m. Student permits for the fall term cost $120 and can be renewed online until August 28; after that date, a $25 late fee applies.\n\nVisitors may still pay by the hour at the pay stations near the library.`,
groups: [mc('Read the notice and answer the questions.', [
Q(1, `Who will be allowed to use Lot C before 5 p.m. on weekdays?`, [`Only faculty and staff`, `Only students with a fall permit`, `Visitors who pay by the hour`, `Students from the engineering department`], 0, `reserved for faculty and staff until 5 p.m.`, `Dạng FACTUAL. "reserved for faculty and staff until 5 p.m. on weekdays" → trước 5 giờ chiều các ngày trong tuần, bãi C chỉ dành cho giảng viên và nhân viên; sinh viên được chuyển sang bãi F.`, '', 'B1'),
Q(2, `What is stated about the park-and-ride bus?`, [`It runs frequently between Lot F and the main quad.`, `It charges students a modest fee for each trip taken.`, `It makes a scheduled stop only near the main library.`, `It continues to operate past 6 p.m. on every weekday.`], 0, `every ten minutes`, `Dạng FACTUAL. Xe buýt miễn phí ("A free park-and-ride bus") và chạy "every ten minutes" từ 7:30 sáng đến 6 giờ chiều → rất thường xuyên giữa bãi F và khu quad chính.`, '', 'B1'),
Q(3, `What can be inferred about a student who renews a permit on September 1?`, [`The student will have to pay an extra charge.`, `The student will receive a partial tuition refund.`, `The student will be permanently assigned to Lot C.`, `The student must submit an appeal in person by noon.`], 0, `a $25 late fee applies`, `Dạng INFERENCE. Gia hạn trực tuyến chỉ đến 28/8; "after that date, a $25 late fee applies" → gia hạn ngày 1/9 là quá hạn nên phải trả thêm phí trễ. Thông báo không nhắc đến hoàn tiền hay việc phải đến trực tiếp.`, '', 'B2'),
])],
});
TF.reading.push({
id: 'tf10-dl2', set: 10, task: 'daily', title: 'Email about a Scholarship Application',
text: `From: Dana Whitfield, Office of Financial Aid\nTo: Applicants for the Harbor Scholars Award\nSubject: Your application is almost complete\n\nDear applicant,\n\nThank you for applying for the Harbor Scholars Award. Our records show that we have received your essay and transcript, but we are still waiting for one recommendation letter. Applications cannot be reviewed until all materials arrive, and the deadline is Friday, March 14, at 5 p.m.\n\nIf your recommender has lost the original link, you can request a new one from your applicant portal. Please do not email the letter to us directly, because letters sent that way cannot be added to your file.\n\nWinners will be announced by April 30. The award provides $4,000 per year for up to three years.\n\nBest wishes,\nDana Whitfield`,
groups: [mc('Read the email and answer the questions.', [
Q(4, `What is the main purpose of the email?`, [`To tell an applicant that a required document is missing`, `To announce the winners of an award at the ceremony in late April`, `To ask the applicant to rewrite an essay because it was too long`, `To explain how the deadline can be changed if a student asks office`], 0, `still waiting for one recommendation letter`, `Dạng PURPOSE. Email báo đã nhận bài luận và bảng điểm nhưng "we are still waiting for one recommendation letter" → mục đích là nhắc thiếu một giấy tờ bắt buộc. Người trúng tuyển chỉ công bố sau, vào cuối tháng 4.`, '', 'B1'),
Q(5, `What should the applicant do if the recommender has lost the link?`, [`Request a new link through the applicant portal`, `Email the letter to the financial aid office`, `Submit a second transcript`, `Wait until winners are announced`], 0, `request a new one from your applicant portal`, `Dạng FACTUAL. "you can request a new one from your applicant portal" → nếu người giới thiệu mất đường dẫn, hãy xin đường dẫn mới trong cổng thông tin dành cho ứng viên.`, '', 'B1'),
Q(6, `Why does Dana advise against emailing the letter?`, [`It will not be included in the application.`, `The office's email system is too slow.`, `Letters must be printed on special paper.`, `It would delay the announcement of winners.`], 0, `cannot be added to your file`, `Dạng FACTUAL. "letters sent that way cannot be added to your file" → thư gửi qua email sẽ không được đưa vào hồ sơ, nên vô ích dù đã gửi.`, '', 'B1'),
])],
});
TF.reading.push({
id: 'tf10-dl3', set: 10, task: 'daily', title: 'Tutoring Center Fall Schedule',
text: `LINDEN TUTORING CENTER – FALL SCHEDULE\n\nMath and Statistics: Monday–Thursday, 10 a.m.–8 p.m.\nWriting Studio: Monday–Friday, 9 a.m.–5 p.m.\nChemistry Help Desk: Tuesday and Thursday, 4–7 p.m.\n\nDrop-in visits are welcome in all subjects, but writing appointments of 45 minutes can be booked through the center's website. Students may book no more than two writing appointments per week.\n\nThe center is closed on university holidays. During finals week, the Writing Studio will stay open until 8 p.m.`,
groups: [mc('Read the schedule and answer the questions.', [
Q(7, `Which service is available on Fridays?`, [`The Writing Studio`, `The Chemistry Help Desk`, `Math and Statistics tutoring`, `All three services`], 0, `Writing Studio: Monday–Friday`, `Dạng FACTUAL. Writing Studio mở "Monday–Friday" nên có cả thứ Sáu; Toán và Thống kê chỉ đến thứ Năm, còn Chemistry Help Desk chỉ thứ Ba và thứ Năm.`, '', 'B1'),
Q(8, `What is true about writing appointments?`, [`Each student can book up to two per week.`, `They last one hour.`, `They are available only during finals week.`, `They must be booked in person.`], 0, `no more than two writing appointments per week`, `Dạng FACTUAL. "Students may book no more than two writing appointments per week" → tối đa hai buổi mỗi tuần. Mỗi buổi 45 phút và đặt qua trang web, không phải đến trực tiếp.`, '', 'B1'),
])],
});
TF.reading.push({
id: 'tf10-dl4', set: 10, task: 'daily', title: 'Text Messages',
text: `Priya (8:05 a.m.): The garage by the lab is full again. I'm going to be late for my 8:30 quiz.\nOmar (8:07 a.m.): Don't circle around. Park at Lot F and ride the shuttle – I'm on it right now.\nPriya (8:09 a.m.): Good idea. Can you save me a seat? I'll hop on at the next stop.\nOmar (8:10 a.m.): Sure, but hurry – the driver doesn't wait.`,
groups: [mc('Read the messages and answer the questions.', [
Q(9, `What problem does Priya describe?`, [`She cannot find a place to park.`, `She has already missed the scheduled campus shuttle.`, `Her morning quiz was unexpectedly postponed by her prof.`, `The parking area at Lot F has been shut down today.`], 0, `garage by the lab is full`, `Dạng FACTUAL. "The garage by the lab is full again" → bãi xe cạnh phòng thí nghiệm đã đầy, Priya không có chỗ đậu và sợ trễ bài kiểm tra.`, '', 'B1'),
Q(10, `What does Omar mean when he writes "the driver doesn't wait"?`, [`Priya must reach the stop on time or the shuttle will leave without her.`, `The driver has strict orders from campus management to finish work promptly.`, `The driver has a reputation for being impatient and unfriendly to passengers.`, `Priya ought to remain inside the parking garage until another bus arrives.`], 0, `the driver doesn't wait`, `Dạng SENTENCE FUNCTION. Sau lời nhờ giữ chỗ, Omar nhắc "hurry" (nhanh lên) vì tài xế không chờ ai → nếu Priya không kịp tới trạm, xe sẽ chạy mà không có cô.`, '', 'B2'),
])],
});

/* ===================================================================
* READING · Read an Academic Passage (câu 1–20)
* =================================================================== */
TF.reading.push({
id: 'tf10-ap1', set: 10, task: 'academic', title: 'How Renaissance Painters Created Depth',
text: P([
`Before the fifteenth century, most European paintings looked flat. Figures were arranged in rows, with their size showing importance rather than distance, and backgrounds were often covered with gold. In the early 1400s, however, painters in Florence began to experiment with ways of showing three-dimensional space on a flat surface. Their efforts changed European art for centuries.`,
`The most influential invention was linear perspective. The architect Filippo Brunelleschi is credited with working out its mathematical rules, which depend on a simple observation: parallel lines, such as the edges of a road or the tiles of a floor, appear to meet at a single point on the horizon, called the vanishing point. By drawing all receding lines toward this point and making objects smaller as they move away, painters could create an illusion of depth that seemed remarkably real. Leon Battista Alberti later explained the method in a book that artists across Italy copied and studied.`,
`A second innovation concerned the paint itself. Early Italian artists mainly used tempera, a quick-drying mixture of pigment and egg yolk, which made smooth blending of colors difficult. Painters in northern Europe, such as Jan van Eyck, perfected oil paint, which dries slowly and can be applied in thin, transparent layers. Italian artists gradually adopted oil during the late fifteenth century. With it, they could soften the edges between light and shadow, a technique later called sfumato, to give faces and bodies a rounded, lifelike appearance.`,
`Artists also studied the human body directly. Leonardo da Vinci dissected corpses to understand how muscles and bones worked, and his notebooks contain hundreds of anatomical drawings. Such knowledge allowed painters to depict figures in natural poses instead of stiff ones. Not every artist agreed on priorities, however. Some Venetian painters, for example, cared less about precise drawing than about rich color, and they built their images from layers of glowing paint rather than from sharp outlines.`,
`These developments did not happen in isolation. Wealthy patrons, including banking families and the Church, paid for large paintings and encouraged competition among workshops. Because each artist wanted to impress these patrons, new techniques spread quickly from city to city. The result was a style that valued observation of the real world, a change that also influenced science and architecture.`,
]),
groups: [mc('Read the passage and answer the questions.', [
Q(1, `According to paragraph 1, how did many early European paintings show that a figure was important?`, [`By making the figure larger`, `By placing the figure near the horizon`, `By painting the figure in gold`, `By arranging the figure in the center`], 0, `their size showing importance rather than distance`, `Dạng FACTUAL. Đoạn 1: các nhân vật "with their size showing importance rather than distance" → kích thước lớn thể hiện tầm quan trọng, không phải khoảng cách. Vàng chỉ dùng cho phần nền.`, 'factual', 'B1'),
Q(2, `According to paragraph 2, what is the vanishing point?`, [`The spot on the horizon where parallel lines seem to meet`, `The precise corner where a painter signs a finished canvas`, `The smallest decorative object placed inside the foreground`, `The visible outer boundary that outlines a tiled walkway`], 0, `appear to meet at a single point on the horizon`, `Dạng FACTUAL. "parallel lines… appear to meet at a single point on the horizon, called the vanishing point" → điểm triệt tiêu là chỗ các đường song song dường như gặp nhau trên đường chân trời.`, 'factual', 'B1'),
Q(3, `The word "receding" in paragraph 2 is closest in meaning to`, [`moving away`, `growing larger`, `crossing`, `breaking`], 0, `all receding lines`, `Dạng VOCABULARY. "receding lines" là các đường lùi xa dần về phía điểm triệt tiêu, đi cùng ý "objects smaller as they move away" → "moving away".`, 'vocab', 'B2'),
Q(4, `Why does the author mention the edges of a road and the tiles of a floor in paragraph 2?`, [`To give familiar examples of parallel lines`, `To show where early painters worked`, `To explain which materials Brunelleschi used`, `To argue that perspective is hard to see`], 0, `such as the edges of a road or the tiles of a floor`, `Dạng RHETORICAL PURPOSE. Hai hình ảnh được dùng sau "parallel lines, such as…" để làm ví dụ quen thuộc về đường song song, giúp người đọc hình dung quy tắc phối cảnh.`, 'purpose', 'B2'),
Q(5, `According to paragraph 3, why was tempera less suitable for blending colors?`, [`It dried too quickly.`, `It was too transparent.`, `It was made only in northern Europe.`, `It was too expensive.`], 0, `a quick-drying mixture`, `Dạng FACTUAL. Tempera là "a quick-drying mixture of pigment and egg yolk, which made smooth blending of colors difficult" → khô nhanh nên khó pha trộn màu mượt. Sơn dầu mới khô chậm.`, 'factual', 'B1'),
Q(6, `Why does the author mention the technique called sfumato?`, [`To show one benefit of working with oil paint`, `To describe how tempera was prepared`, `To explain why Venetian painters used gold`, `To criticize northern European artists`], 0, `soften the edges between light and shadow`, `Dạng RHETORICAL PURPOSE. Câu "With it, they could soften the edges between light and shadow, a technique later called sfumato" nêu sfumato như một lợi ích mà sơn dầu mang lại.`, 'purpose', 'B2'),
Q(7, `According to paragraph 4, all of the following are true of Leonardo da Vinci EXCEPT`, [`He worked mainly for Venetian patrons.`, `He cut open bodies to study how they worked`, `He drew hundreds of anatomical studies.`, `He recorded his observations in notebooks.`], 0, `Leonardo da Vinci dissected corpses to understand how muscles and bones worked`, `Dạng NEGATIVE FACTUAL. Đoạn 4 nói Leonardo mổ xác để hiểu cơ và xương, và sổ tay có hàng trăm bản vẽ giải phẫu. Việc ông làm chủ yếu cho khách hàng xứ Venice không hề được nhắc đến → đáp án.`, 'negative', 'B2'),
Q(8, `What can be inferred from paragraph 4 about Italian painters of the Renaissance?`, [`They did not all follow a single approach to making images.`, `They refused to dissect human corpses to learn anatomical details.`, `They completely abandoned color after mastering perspective.`, `They reached a firm consensus that sharp outlines were best.`], 0, `Not every artist agreed on priorities`, `Dạng INFERENCE. "Not every artist agreed on priorities" và ví dụ họa sĩ Venice thiên về màu hơn đường nét → suy ra các họa sĩ không theo cùng một cách làm. Các phương án còn lại trái với nội dung đoạn.`, 'inference', 'B2'),
Q(9, `According to paragraph 5, why did new techniques spread quickly from city to city?`, [`Artists competed to impress wealthy patrons.`, `The Church banned older methods.`, `Painters were forbidden to work in one city.`, `Workshops shared all their secrets freely.`], 0, `each artist wanted to impress these patrons`, `Dạng FACTUAL. "Because each artist wanted to impress these patrons, new techniques spread quickly" → cạnh tranh để gây ấn tượng với nhà bảo trợ giàu có khiến kỹ thuật lan nhanh.`, 'factual', 'B1'),
Q(10, `What is the main purpose of the passage?`, [`To describe the innovations that made Renaissance paintings look more lifelike`, `To compare the chemical properties of traditional tempera paint with those of modern oils`, `To argue that artists in Florence contributed far more to Western culture than those in Venice`, `To explain how wealthy patrons evaluated and chose artists for major religious commissions`], 0, `ways of showing three-dimensional space`, `Dạng RHETORICAL PURPOSE (ý chính). Cả bài trình bày phối cảnh, sơn dầu, nghiên cứu giải phẫu và sự bảo trợ – những yếu tố giúp tranh trông có chiều sâu và sống động hơn.`, 'purpose', 'B2'),
])],
});
TF.reading.push({
id: 'tf10-ap2', set: 10, task: 'academic', title: '3D Printing in Medicine',
text: P([
`Three-dimensional printing, also called additive manufacturing, builds objects by depositing material layer by layer from a digital design. Industry first used it to make prototypes, but over the past two decades hospitals have discovered that the technology suits medicine especially well, because no two patients' bodies are exactly alike.`,
`One of the earliest medical uses was the creation of surgical models. A surgeon preparing a difficult operation can print an exact copy of a patient's damaged bone or heart from CT scan data and handle it before entering the operating room. Studies suggest that practicing on such models shortens some operations, since surgeons make fewer unexpected decisions during the procedure. Printed guides, which are plastic templates that fit over a bone and show where to cut or drill, serve a similar purpose.`,
`A second application is the production of custom implants and prosthetics. Traditional artificial hip sockets or skull plates come in a limited range of sizes, and surgeons often have to adjust them during surgery. By contrast, a printed implant can be shaped to fit one person's anatomy, and its surface can be given tiny pores that allow bone to grow into it. Prosthetic hands for children have also become affordable, because a printed hand can be made for a fraction of the price of a traditional one, and it can be replaced cheaply as the child grows.`,
`The most ambitious research is bioprinting, in which the "ink" consists of living cells mixed with a supportive gel. Scientists have printed small pieces of skin, cartilage, and blood vessel in the laboratory, and some of these have been tested in animals. However, printing a complex organ such as a kidney remains far beyond current technology. The main obstacle is that thick tissue needs a network of tiny blood vessels to deliver oxygen, and printers cannot yet create such networks at the necessary scale.`,
`Experts therefore urge caution. Printed medical devices must pass the same safety tests as conventional ones, and hospitals that run their own printers must ensure that every copy has the same quality. Even so, many doctors expect that printing will become a routine part of treatment, particularly for patients whose needs cannot be met by standard products.`,
]),
groups: [mc('Read the passage and answer the questions.', [
Q(11, `According to paragraph 1, why does 3D printing suit medicine especially well?`, [`Patients' bodies differ from one another.`, `It is cheaper than industrial manufacturing.`, `It was invented by hospital engineers.`, `It works without a digital design.`], 0, `no two patients' bodies are exactly alike`, `Dạng FACTUAL. "because no two patients' bodies are exactly alike" → cơ thể mỗi bệnh nhân khác nhau nên các vật thể in theo thiết kế riêng rất phù hợp với y học.`, 'factual', 'B1'),
Q(12, `According to paragraph 2, how do surgeons use printed models?`, [`They handle a copy of the patient's anatomy before operating.`, `They permanently place the model inside the body during surgery.`, `They explain step by step to patients how the surgery will work.`, `They completely replace standard diagnostic CT scans with models.`], 0, `handle it before entering the operating room`, `Dạng FACTUAL. Bác sĩ in bản sao xương hoặc tim từ dữ liệu CT và "handle it before entering the operating room" → cầm nắm, tập luyện trên mô hình trước khi vào phòng mổ.`, 'factual', 'B1'),
Q(13, `The word "templates" in paragraph 2 is closest in meaning to`, [`shaped patterns`, `scanned images`, `sharp tools`, `small screws`], 0, `plastic templates that fit over a bone`, `Dạng VOCABULARY. "plastic templates that fit over a bone and show where to cut or drill" là khuôn nhựa dùng làm mẫu hướng dẫn đường cắt/khoan → "shaped patterns".`, 'vocab', 'B2'),
Q(14, `Why does the author mention prosthetic hands for children in paragraph 3?`, [`To illustrate how printing can lower the cost of replacing devices as people grow`, `To show that traditional hands are no longer made as mass‑production techniques replace prosthetic devices`, `To prove that printed implants are weaker because their material is less durable than standard metal`, `To explain why children need surgery by noting that rapid growth can outpace prosthetic devices`], 0, `replaced cheaply as the child grows`, `Dạng RHETORICAL PURPOSE. Tay giả in 3D rẻ và "can be replaced cheaply as the child grows" → ví dụ cho thấy in 3D giảm chi phí thay thế thiết bị khi trẻ lớn lên.`, 'purpose', 'B2'),
Q(15, `According to paragraph 3, all of the following are advantages of printed implants EXCEPT`, [`They last longer than traditional implants.`, `They can match one person's anatomy.`, `Their surfaces can allow bone to grow into them.`, `They can be made at low cost for children's hands.`], 0, `can be shaped to fit one person's anatomy`, `Dạng NEGATIVE FACTUAL. Đoạn 3 nêu: vừa với giải phẫu từng người, bề mặt có lỗ nhỏ cho xương mọc vào, giá rẻ cho tay giả trẻ em. Việc "bền hơn" không hề được nhắc → đáp án.`, 'negative', 'B2'),
Q(16, `According to paragraph 4, why can't printers yet produce a complex organ such as a kidney?`, [`Thick tissue needs a network of tiny blood vessels that printers cannot yet make at scale.`, `Living cells become unstable and deteriorate rapidly when they are mixed directly with supportive synthetic gel.`, `Laboratory animals routinely reject foreign tissues that have been produced with additive manufacturing devices.`, `Research laboratories currently lack sufficient supplies of oxygen to support complex cellular metabolism.`], 0, `needs a network of tiny blood vessels`, `Dạng FACTUAL. "thick tissue needs a network of tiny blood vessels to deliver oxygen, and printers cannot yet create such networks at the necessary scale" → trở ngại chính là hệ mạch máu nhỏ.`, 'factual', 'B1'),
Q(17, `The word "ambitious" in paragraph 4 is closest in meaning to`, [`aiming at something difficult`, `costing a great deal of money`, `carried out in absolute secret`, `restricted strictly to animals`], 0, `The most ambitious research is bioprinting`, `Dạng VOCABULARY. Bioprinting được gọi "ambitious" vì hướng đến mục tiêu rất khó (in mô sống, thậm chí cơ quan), nên nghĩa gần nhất là "aiming at something difficult".`, 'vocab', 'B2'),
Q(18, `What can be inferred about bioprinted skin and cartilage?`, [`They are easier to produce than whole organs.`, `They are already in routine use at most hospitals.`, `They contain no living cells, made of inert polymer.`, `They have been proven safe in people, per trial data.`], 0, `printing a complex organ such as a kidney remains far beyond current technology`, `Dạng INFERENCE. Da và sụn đã in được ở phòng thí nghiệm, còn cơ quan phức tạp như thận "remains far beyond current technology" → suy ra mô đơn giản dễ in hơn. Đoạn chỉ nói đã thử trên động vật, chưa nói về người.`, 'inference', 'C1'),
Q(19, `According to paragraph 5, what must hospitals that run their own printers ensure?`, [`That every copy has the same quality`, `That each printer is used only once a day`, `That devices are cheaper than conventional ones`, `That patients design their own implants`], 0, `every copy has the same quality`, `Dạng FACTUAL. "hospitals that run their own printers must ensure that every copy has the same quality" → bệnh viện phải bảo đảm chất lượng đồng đều giữa các bản in.`, 'factual', 'B1'),
Q(20, `What is the main purpose of the passage?`, [`To survey how 3D printing is used in medicine and where its limits lie`, `To argue persuasively that surgeons no longer need extensive manual training`, `To compare industrial manufacturing printers with specialized clinical devices`, `To explain in technical detail how complex digital CT scan data are produced`], 0, `hospitals have discovered that the technology suits medicine especially well`, `Dạng RHETORICAL PURPOSE (ý chính). Bài điểm qua mô hình phẫu thuật, implant, bioprinting, rồi nêu giới hạn kỹ thuật và an toàn → khảo sát ứng dụng và hạn chế của in 3D trong y học.`, 'purpose', 'B2'),
])],
});

/* ===================================================================
* LISTENING · Listen and Choose a Response (câu 1–9)
* =================================================================== */
const RESP = [
{ s: 'A', lv: 'B1', t: `Is the tutoring center open on Friday evening?`,
options: [`No, it closes at five on Fridays.`, `My tutor is very friendly.`, `I usually go on Mondays at noon.`, `Evening classes start next week.`],
explain: `Câu hỏi Yes/No về giờ mở cửa → trả lời trực tiếp: không, thứ Sáu đóng lúc năm giờ. Các phương án khác chỉ liên quan đến từ "tutor", "evening" hay một ngày khác.` },
{ s: 'B', lv: 'A2', t: `I just found out my scholarship application was approved!`,
options: [`That's wonderful news – congratulations!`, `You should apply again next year.`, `The deadline was last Friday.`, `I didn't know they gave scholarships for science.`],
explain: `Người nói báo tin vui → phản hồi tự nhiên là chúc mừng. Các phương án còn lại bàn về việc nộp lại hồ sơ hoặc thời hạn, không phù hợp với tin đã được duyệt.` },
{ s: 'A', lv: 'B1', t: `Could you tell me how much a semester parking permit costs?`,
options: [`It's about a hundred dollars, but check the website.`, `The parking lot is behind the gym.`, `I park there every morning.`, `Permits are printed in red.`],
explain: `Câu hỏi về giá ("how much") → cần một mức tiền. "about a hundred dollars" trả lời đúng; các phương án khác nói về vị trí bãi xe, thói quen hoặc màu giấy phép.` },
{ s: 'B', lv: 'B1', t: `Do you think we should take the early train or the later one?`,
options: [`The later one – we can still get there before noon.`, `I haven't trained since last year.`, `Yes, I bought a ticket yesterday.`, `The station is closed on Sundays.`],
explain: `Câu hỏi lựa chọn "A or B" → phải chọn một: "The later one" kèm lý do. "Yes" không hợp với câu hỏi dạng "or"; "trained" là bẫy lặp âm với "train".` },
{ s: 'A', lv: 'B1', t: `I'm sorry, I didn't save you a seat in the lecture hall.`,
options: [`No problem, I'll just sit near the back.`, `The lecture starts at two.`, `Yes, the hall holds two hundred people.`, `The professor usually sits at the front.`],
explain: `Người nói xin lỗi vì không giữ chỗ → đáp lại bằng "No problem" và cách xử lý. Các phương án khác lặp từ "lecture", "hall" mà không phản hồi lời xin lỗi.` },
{ s: 'B', lv: 'B2', t: `Haven't you finished your lab report yet?`,
options: [`Almost – I only need to write the conclusion.`, `The lab is closed on Sundays.`, `Yes, I reported it yesterday.`, `I need a longer report.`],
explain: `Câu hỏi phủ định về tiến độ → "Almost" kèm phần còn thiếu là trả lời hợp lý. "reported" là bẫy lặp từ "report" với nghĩa khác.` },
{ s: 'A', lv: 'B1', t: `Would you rather present on Tuesday or Thursday?`,
options: [`Tuesday works better for me.`, `I present very quickly.`, `Thursday was last week.`, `The presentation is about ocean currents.`],
explain: `Câu hỏi chọn một trong hai ngày → "Tuesday works better for me" chọn rõ ràng. Các phương án khác nhắc đến "present", "Thursday" nhưng không đưa ra lựa chọn.` },
{ s: 'B', lv: 'B1', t: `Why is the cafeteria so crowded today?`,
options: [`There's a free lunch for new students.`, `It closes at two o'clock.`, `I ordered a chicken sandwich.`, `It's next to the student center.`],
explain: `Câu hỏi "Why" → cần một lý do: bữa trưa miễn phí cho tân sinh viên. Giờ đóng cửa, món ăn và vị trí không giải thích vì sao đông.` },
];
const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
TF.listening.push({
id: 'tf10-lr', set: 10, task: 'response', title: 'Choose a Response · Set 10',
speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'm' } },
script: respScript,
groups: [mc('Listen to each sentence and choose the best response.', RESP.map((r, i) => ({ n: i + 1, q: 'Choose the best response to sentence ' + (i + 1) + '.', options: r.options, a: 0, lv: r.lv, cue: r.t, explain: r.explain })))],
});

/* ===================================================================
* LISTENING · Listen to a Conversation (câu 1–8)
* =================================================================== */
TF.listening.push({
id: 'tf10-lc1', set: 10, task: 'conversation', title: 'At the Tutoring Center',
speakers: { S: { name: 'Student (Jordan)', accent: 'en-US', gender: 'm' }, T: { name: 'Center assistant', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to a conversation between a student and a tutoring center assistant.' }, { pause: 1 },
{ s: 'S', t: `Hi, I'd like to sign up for statistics tutoring. Midterms are in three weeks and I'm falling behind.` },
{ s: 'T', t: `Sure. Do you prefer one-on-one sessions or a small group?` },
{ s: 'S', t: `Probably one-on-one. I have a hard time asking questions in front of other people.` },
{ s: 'T', t: `That's understandable. One-on-one slots are forty-five minutes, and you can book one per week. Right now the earliest opening is next Wednesday at four.` },
{ s: 'S', t: `I have a lab until five on Wednesdays. Is there anything earlier in the day?` },
{ s: 'T', t: `Let me check. Thursday at eleven is open, but that tutor, Ms. Duarte, usually works with graduate courses. Oh, wait – it says she also covers introductory statistics. Would that work?` },
{ s: 'S', t: `Thursday at eleven is perfect. I don't have class then.` },
{ s: 'T', t: `Great. Please bring your syllabus and any homework you found difficult, so she can plan the session. And if you need to cancel, do it at least a day ahead, or the slot still counts toward your weekly limit.` },
{ s: 'S', t: `Got it. Thanks!` },
],
groups: [mc('Answer the questions about the conversation.', [
Q(1, `Why does the student want a tutor?`, [`He is worried about an upcoming exam.`, `He failed a previous course.`, `He wants to become a tutor himself.`, `His professor asked him to come.`], 0, `Midterms are in three weeks`, `Sinh viên nói "Midterms are in three weeks and I'm falling behind" → lo lắng vì kỳ thi giữa kỳ sắp tới và đang theo không kịp bài.`, '', 'B1'),
Q(2, `Why does the student turn down the first available time?`, [`He has a lab at that time.`, `He prefers a group session.`, `The tutor works only with graduate students.`, `He has an exam that day.`], 0, `I have a lab until five on Wednesdays`, `Giờ trống sớm nhất là thứ Tư lúc bốn giờ, nhưng "I have a lab until five on Wednesdays" → trùng lịch thí nghiệm nên sinh viên không nhận.`, '', 'B2'),
Q(3, `What does the assistant notice about Ms. Duarte?`, [`She also teaches introductory statistics.`, `She is the only tutor who works on Thursdays.`, `She has no openings next week.`, `She leads group sessions.`], 0, `she also covers introductory statistics`, `Lúc đầu cô nghĩ bà Duarte chỉ dạy môn sau đại học, nhưng sau đó thấy "she also covers introductory statistics" → bà cũng phụ trách thống kê nhập môn.`, '', 'B1'),
Q(4, `What will the student probably do before the session?`, [`Gather his syllabus and difficult homework`, `Cancel his lab on Wednesday`, `Book a second session for the same week`, `Email Ms. Duarte his grades`], 0, `bring your syllabus and any homework`, `Câu suy luận: trợ lý dặn "bring your syllabus and any homework you found difficult" → trước buổi học sinh viên sẽ chuẩn bị đề cương và bài tập khó. Mỗi tuần chỉ được đặt một buổi.`, '', 'B2'),
])],
});
TF.listening.push({
id: 'tf10-lc2', set: 10, task: 'conversation', title: 'A Recommendation Letter',
speakers: { S: { name: 'Student (Hana)', accent: 'en-GB', gender: 'f' }, P: { name: 'Professor Lindgren', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between a student and her professor.' }, { pause: 1 },
{ s: 'S', t: `Professor Lindgren, thanks for seeing me. I'm applying for the Meridian Scholarship, and I was hoping you could write one of my recommendation letters.` },
{ s: 'P', t: `I'd be glad to. You did excellent work in my seminar last spring. When is the deadline?` },
{ s: 'S', t: `The twenty-first, but the committee wants letters submitted directly by the recommender, through an online form.` },
{ s: 'P', t: `That's fine. Do you have a draft of your personal essay? Reading it helps me write something that supports what you say about yourself.` },
{ s: 'S', t: `I do, though it's still rough. The prompt asks me to describe a challenge I've overcome, and I wrote about moving abroad for my degree.` },
{ s: 'P', t: `That's a strong topic. One suggestion: don't only describe the difficulty. Spend more of the essay on what you did about it, because committees remember action more than hardship.` },
{ s: 'S', t: `That makes sense. I'll revise it and send it by Friday.` },
{ s: 'P', t: `Perfect. I'll need about a week with it, so send it as soon as you can, along with your résumé.` },
],
groups: [mc('Answer the questions about the conversation.', [
Q(5, `What does the student ask the professor to do?`, [`Write a recommendation letter for a scholarship`, `Read her seminar paper, focusing on the introduction.`, `Help her choose a degree, a master's versus a Ph.D.`, `Extend a deadline for her, giving her two extra weeks.`], 0, `write one of my recommendation letters`, `Hana nói "I was hoping you could write one of my recommendation letters" → nhờ thầy viết thư giới thiệu cho học bổng.`, '', 'B1'),
Q(6, `How will the letter be sent to the committee?`, [`The professor will submit it through an online form.`, `The student will upload it together with her personal essay.`, `It will be mailed directly to the scholarship committee.`, `The scholarship office will collect it from the seminar class.`], 0, `submitted directly by the recommender`, `Hội đồng muốn thư "submitted directly by the recommender, through an online form" → chính người giới thiệu (giáo sư) nộp qua mẫu trực tuyến, không phải sinh viên.`, '', 'B2'),
Q(7, `What advice does the professor give about the essay?`, [`Focus more on the actions she took than on the difficulty`, `Choose a topic unrelated to her degree`, `Shorten it so that it fits on one page`, `Describe her challenges in greater detail`], 0, `what you did about it`, `Giáo sư khuyên "Spend more of the essay on what you did about it" vì hội đồng nhớ hành động hơn khó khăn → tập trung vào việc cô đã làm.`, '', 'B2'),
Q(8, `Why does the professor ask for the essay soon?`, [`He needs about a week to prepare the letter.`, `He will be away after Friday because he has a conference.`, `The committee reads essays weeks before the deadline.`, `The deadline was shifted later due to paperwork issues.`], 0, `I'll need about a week with it`, `Giáo sư nói "I'll need about a week with it" → cần khoảng một tuần để viết thư nên muốn nhận bài luận sớm. Thời hạn vẫn là ngày hai mươi mốt.`, '', 'B1'),
])],
});

/* ===================================================================
* LISTENING · Listen to an Announcement (câu 1–6)
* =================================================================== */
TF.listening.push({
id: 'tf10-la1', set: 10, task: 'announcement', title: 'Scholarship Information Session',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
{ s: 'A', t: `Attention, students. The Office of Financial Aid will hold an information session about the Kessler Community Award this Thursday at noon in Room 210 of the Student Services building.` },
{ s: 'A', t: `The award gives twenty-five hundred dollars a year to students who show both strong grades and community service. Applicants must have completed at least thirty credits.` },
{ s: 'A', t: `At the session, a past winner will explain what made her application successful, and staff will answer questions about the essay. Pizza will be served, but seating is limited, so please arrive early. If you can't attend, a recording will be posted on the financial aid website on Friday.` },
],
groups: [mc('Answer the questions about the announcement.', [
Q(1, `What is the announcement mainly about?`, [`An information session about a scholarship`, `A change in tuition prices for out‑of‑state students`, `A new community service course offered next semester`, `A pizza party for winners of the campus quiz`], 0, `information session about the Kessler Community Award`, `Câu mở đầu: văn phòng hỗ trợ tài chính sẽ tổ chức "an information session about the Kessler Community Award" → buổi giới thiệu về một học bổng.`, '', 'B1'),
Q(2, `What must applicants have done?`, [`Completed at least thirty credits`, `Maintained their high school GPA`, `Volunteered regularly for a year`, `Secured another departmental award`], 0, `at least thirty credits`, `"Applicants must have completed at least thirty credits" → ứng viên phải hoàn thành tối thiểu ba mươi tín chỉ.`, '', 'B1'),
Q(3, `What can students who cannot attend do?`, [`Watch a recording online on Friday`, `Visit the office on Thursday afternoon`, `Ask a past winner to meet them`, `Send their essays to the session`], 0, `a recording will be posted`, `"If you can't attend, a recording will be posted on the financial aid website on Friday" → sinh viên vắng có thể xem bản ghi trực tuyến vào thứ Sáu.`, '', 'B1'),
])],
});
TF.listening.push({
id: 'tf10-la2', set: 10, task: 'announcement', title: 'Art Museum Visit Instructions',
speakers: { A: { name: 'Instructor', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to an instructor talking to an art history class.' }, { pause: 1 },
{ s: 'A', t: `Before you go, a few reminders about next week's visit to the city art museum.` },
{ s: 'A', t: `We'll meet at the main entrance at ten o'clock. The museum asks that large bags be left at the coat check, so bring only what you need.` },
{ s: 'A', t: `Your assignment is to choose one Renaissance portrait in Gallery Four and write a two-page analysis of how the artist created a sense of depth. Take notes as you look, but remember that photography with a flash is not allowed.` },
{ s: 'A', t: `Finally, admission is free with your student ID, so don't forget to bring it. Your analysis is due by Monday.` },
],
groups: [mc('Answer the questions about the announcement.', [
Q(4, `Where should students leave their large bags?`, [`At the coat check`, `On the bus`, `At the main entrance`, `In Gallery Four`], 0, `left at the coat check`, `"large bags be left at the coat check" → túi lớn gửi ở quầy gửi áo khoác của bảo tàng.`, '', 'B1'),
Q(5, `What will students write about?`, [`How one portrait creates a sense of depth`, `The life of a famous painter, his early training`, `The history of the museum, its founding`, `Different kinds of paint used in artworks`], 0, `how the artist created a sense of depth`, `Bài tập là chọn một bức chân dung thời Phục Hưng và viết "a two-page analysis of how the artist created a sense of depth" → phân tích cách tạo chiều sâu.`, '', 'B1'),
Q(6, `What do students need for free admission?`, [`Their student ID`, `A museum membership`, `A ticket from the instructor`, `A written analysis`], 0, `free with your student ID`, `"admission is free with your student ID" → vé vào cửa miễn phí khi trình thẻ sinh viên.`, '', 'B1'),
])],
});

/* ===================================================================
* LISTENING · Listen to an Academic Talk (câu 1–10)
* =================================================================== */
TF.listening.push({
id: 'tf10-lt1', set: 10, task: 'talk', title: 'Psychology: Sleep and Memory',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in a psychology class.' }, { pause: 1 },
{ s: 'P', t: `Let's turn to a question every student asks sooner or later: does it help to sleep after studying?` },
{ s: 'P', t: `Researchers divide memory formation into stages. First, information is encoded – the brain takes in what you read or hear. Then it has to be consolidated, which means the fragile new memory is stabilized so that it lasts. The surprising finding is that a large part of consolidation happens while you sleep.` },
{ s: 'P', t: `Here's a classic kind of experiment. Two groups learn a list of word pairs in the evening. One group goes to sleep; the other stays awake for the same number of hours. When both are tested the next day, the group that slept remembers noticeably more pairs.` },
{ s: 'P', t: `Why? Recordings of brain activity suggest that during deep sleep, the brain replays patterns that were active during learning, almost as if rehearsing them. Those replayed patterns seem to help move information from short-term storage in a region called the hippocampus to longer-term storage elsewhere in the brain.` },
{ s: 'P', t: `Now, I should add a caution. Sleep is not magic. If you never studied the material, sleeping won't teach it to you, and the benefit is largest for material you understood well in the first place.` },
{ s: 'P', t: `So the practical lesson: don't give up sleep for extra study time at night. In many cases, a good night's sleep is part of studying.` },
],
groups: [mc('Answer the questions about the talk.', [
Q(1, `What is the talk mainly about?`, [`How sleep helps turn new learning into lasting memory`, `How to memorize word lists quickly`, `Why some people need less sleep`, `The structure of the hippocampus`], 0, `a large part of consolidation happens while you sleep`, `Câu hỏi ý chính: bài giảng tập trung vào việc "a large part of consolidation happens while you sleep" – giấc ngủ giúp củng cố trí nhớ mới thành trí nhớ lâu dài.`, '', 'B1'),
Q(2, `According to the professor, what is consolidation?`, [`The process that stabilizes a new memory so that it lasts`, `The first step of taking in information, called encoding`, `The act of testing what has been learned, via a quiz after lecture`, `The forgetting of details in deep water, clearing space for memories`], 0, `stabilized so that it lasts`, `Giáo sư định nghĩa: "the fragile new memory is stabilized so that it lasts" → củng cố là quá trình làm ổn định ký ức mong manh. Bước tiếp nhận thông tin là "encoded".`, '', 'B1'),
Q(3, `What was the result of the experiment the professor describes?`, [`The group that slept remembered more word pairs.`, `Both groups remembered the same number of pairs.`, `The group that stayed awake learned faster.`, `Only the group tested at night improved.`], 0, `the group that slept remembers noticeably more pairs`, `"the group that slept remembers noticeably more pairs" → nhóm ngủ nhớ được nhiều cặp từ hơn nhóm thức.`, '', 'B1'),
Q(4, `According to the professor, what may happen in the brain during deep sleep?`, [`Patterns from learning are replayed.`, `The brain stops all activity.`, `New word pairs are created.`, `The hippocampus becomes larger.`], 0, `replays patterns that were active during learning`, `Giáo sư nói "during deep sleep, the brain replays patterns that were active during learning" → não phát lại các mô hình hoạt động đã xảy ra lúc học.`, '', 'B2'),
Q(5, `Why does the professor say "Sleep is not magic"?`, [`To caution that sleep cannot replace actual studying`, `To suggest that sleep is not important for memory at all`, `To explain that scientists doubt the experiment's methodology`, `To say that sleep works only for word lists, not for learning`], 0, `If you never studied the material`, `Câu hỏi hàm ý: ngay sau đó giáo sư nói "If you never studied the material, sleeping won't teach it to you" → ngủ không thay thế được việc học thật sự.`, '', 'B2'),
])],
});
TF.listening.push({
id: 'tf10-lt2', set: 10, task: 'talk', title: 'Oceanography: Upwelling and Fishing',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to part of a talk in an oceanography class.' }, { pause: 1 },
{ s: 'P', t: `Today I want to explain why a few small areas of the ocean produce a huge share of the world's fish. The answer has to do with a process called upwelling.` },
{ s: 'P', t: `Start with the problem. Sunlit surface water is where tiny plants called phytoplankton grow, but those plants use up nutrients such as nitrogen and phosphorus. When the nutrients are gone, growth stops. Meanwhile, nutrients sink with dead organisms and pile up in deep, cold water where there's no light.` },
{ s: 'P', t: `Upwelling brings that deep water back up. Along the coast of Peru, for example, steady winds blow along the shore and push the surface water away from the land. Deeper water rises to replace it. Suddenly the surface is rich in nutrients, and phytoplankton multiply quickly.` },
{ s: 'P', t: `Everything else follows from that. Small fish such as anchovies feed on the plankton, and larger fish, seabirds, and fishermen depend on the anchovies. Although these upwelling zones cover only a small fraction of the ocean, they supply a very large part of the global catch.` },
{ s: 'P', t: `One more point. Upwelling isn't constant. In some years the winds weaken, the cold water stays down, and fish populations crash. Fishing communities have to be ready for that.` },
],
groups: [mc('Answer the questions about the talk.', [
Q(6, `What is the talk mainly about?`, [`How an ocean process creates rich fishing areas`, `How scientists count phytoplankton with water samples.`, `Why Peru's coast is cold despite being near the equator.`, `How fishing boats are built with lightweight hulls and gear.`], 0, `a process called upwelling`, `Giáo sư giải thích vì sao vài vùng biển nhỏ cho nhiều cá, câu trả lời là "a process called upwelling" – nước trồi mang chất dinh dưỡng lên mặt biển.`, '', 'B1'),
Q(7, `Why does the growth of phytoplankton stop in surface water?`, [`The nutrients have been used up.`, `The water becomes too cold for algae`, `There is no sunlight in deep water`, `Fish eat all the plants during upwelling`], 0, `use up nutrients`, `"those plants use up nutrients such as nitrogen and phosphorus. When the nutrients are gone, growth stops" → chất dinh dưỡng cạn kiệt. Ánh sáng thì có ở mặt nước ("Sunlit surface water").`, '', 'B2'),
Q(8, `According to the professor, what causes deep water to rise along the coast of Peru?`, [`Winds push the surface water away from the shore.`, `Warm ocean currents circulate directly toward the land.`, `Large fishing boats actively agitate the sea with nets.`, `Decaying organic matter slowly sinks toward the seabed.`], 0, `push the surface water away from the land`, `"steady winds blow along the shore and push the surface water away from the land. Deeper water rises to replace it" → gió đẩy nước mặt ra xa bờ, nước sâu trồi lên thay thế.`, '', 'B1'),
Q(9, `Why does the professor mention anchovies?`, [`To show how the food chain depends on plankton`, `To explain why fish are hard to catch in upwelling zones`, `To describe a threat to seabirds caused by oil spills`, `To compare Peru's upwelling with other coastal nations`], 0, `feed on the plankton`, `Cá cơm "feed on the plankton", còn cá lớn, chim biển và ngư dân phụ thuộc vào cá cơm → ví dụ cho thấy cả chuỗi thức ăn bắt nguồn từ sinh vật phù du.`, '', 'B2'),
Q(10, `What does the professor imply about fishing communities?`, [`Their catch can change sharply from year to year.`, `They should stop fishing in upwelling zones to avoid collapse.`, `They always catch roughly the same fish amount each year.`, `They cause the upwelling winds to weaken, limiting nutrients.`], 0, `fish populations crash`, `Câu hàm ý: nước trồi không ổn định, có năm "the winds weaken… fish populations crash" và "Fishing communities have to be ready for that" → sản lượng đánh bắt có thể biến động mạnh theo năm.`, '', 'C1'),
])],
});

/* ===================================================================
* LISTENING · bổ sung để đủ 47 câu như bộ 1 (conversation 9–13, announcement 7–10, talk 11–16)
* =================================================================== */
TF.listening.push({
id: 'tf10-lc3', set: 10, task: 'conversation', title: 'Renting a Practice Room',
speakers: { S: { name: 'Student (Leila)', accent: 'en-US', gender: 'f' }, D: { name: 'Music office assistant', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between a student and a music department assistant.' }, { pause: 1 },
{ s: 'S', t: `Hi, I play the cello, and I heard that students can reserve the practice rooms in the music building. How does that work?` },
{ s: 'D', t: `It's pretty simple. You book through our website, and each booking lasts ninety minutes. You can hold up to three bookings a week.` },
{ s: 'S', t: `Ninety minutes is plenty. Um, my cello is pretty big, though. Do the rooms have enough space?` },
{ s: 'D', t: `The rooms on the second floor are small, built mainly for singers and violinists. For a cello, I'd recommend the basement rooms. They're larger, and they each have a piano, in case you ever need someone to play along.` },
{ s: 'S', t: `That sounds great, but I've heard the basement rooms are hard to book.` },
{ s: 'D', t: `They are, in the evenings. Honestly, mornings are much easier. Before nine, most of them are empty.` },
{ s: 'S', t: `I'm not a morning person, but I could try seven thirty. Is the building even open that early?` },
{ s: 'D', t: `It opens at seven, but you'll need to swipe your student ID at the side door. The front entrance stays locked until eight.` },
{ s: 'S', t: `Good to know. And what if I can't make it to a booking?` },
{ s: 'D', t: `Please cancel online at least two hours ahead. If you miss three bookings without canceling, your account is blocked for a week.` },
{ s: 'S', t: `Understood. I'll sign up as soon as I get home.` },
{ s: 'D', t: `One more thing. Bring your own music stand. We only have a few, and they usually disappear by noon.` },
{ s: 'S', t: `Thanks. I'll bring mine.` },
],
groups: [mc('Answer the questions about the conversation.', [
Q(9, `Why does the student talk to the assistant?`, [`She wants to learn how to reserve a practice room.`, `She wants to borrow a cello for a lesson in the next week`, `She hopes to join a music class that meets on Tuesdays`, `She needs help fixing a piano with keys before a recital`], 0, `How does that work?`, `Leila hỏi về việc đặt phòng tập ("students can reserve the practice rooms… How does that work?") → mục đích là tìm hiểu cách đặt phòng.`, '', 'B1'),
Q(10, `Why does the assistant recommend the basement rooms?`, [`They are bigger and have pianos.`, `They are quieter than the second floor.`, `They are never booked in the evening.`, `They are free for cello players.`], 0, `They're larger`, `Trợ lý nói phòng tầng hầm "larger" và có đàn piano; phòng tầng hai nhỏ. Thực tế buổi tối phòng hầm khó đặt.`, '', 'B2'),
Q(11, `What does the student mean when she says "I'm not a morning person, but I could try seven thirty"?`, [`She is willing to change her habits to get a room.`, `She strongly prefers to rehearse her cello late at night.`, `She feels the music building opens far too early for her.`, `She will likely have to cancel her current reservations.`], 0, `I could try seven thirty`, `Cô thừa nhận không quen dậy sớm nhưng vẫn "could try seven thirty" → sẵn sàng thay đổi thói quen để đặt được phòng.`, 'inference', 'B2'),
Q(12, `How can the student enter the building at seven thirty?`, [`By using her student ID at the side door`, `By asking the assistant to unlock the front entrance`, `By waiting for another student to open the door`, `By getting a key from the music office`], 0, `swipe your student ID at the side door`, `Tòa nhà mở lúc bảy giờ nhưng phải "swipe your student ID at the side door"; cửa chính đóng đến tám giờ.`, '', 'B1'),
Q(13, `What will the student probably do next?`, [`Book a basement room for an early morning`, `Buy a music stand at the office; they are few`, `Cancel her booking for tonight; basement is full`, `Move her cello to the floor, rooms are cramped`], 0, `I'll sign up as soon as I get home`, `Cô nói "I'll sign up as soon as I get home" sau khi được khuyên chọn phòng tầng hầm vào buổi sáng → nhiều khả năng cô sẽ đặt một phòng tầng hầm vào sáng sớm. Cô sẽ tự mang giá nhạc.`, 'inference', 'B2'),
])],
});
TF.listening.push({
id: 'tf10-la3', set: 10, task: 'announcement', title: 'Observatory Open Night',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
{ s: 'A', t: `Good afternoon, everyone. The Department of Physics and Astronomy invites you to Open Night at the university observatory this Friday, starting at eight o'clock.` },
{ s: 'A', t: `Visitors will have a chance to look through the main telescope at Saturn and its rings, as long as the sky is clear. If clouds roll in, the event will move indoors, where graduate students will give short presentations about the planets. Either way, admission is free, but tickets are required because space is limited. You can reserve them online until Thursday at noon.` },
{ s: 'A', t: `Please dress warmly, since the dome is not heated and the temperature drops quickly at night. Also, any flashlight should be covered with red plastic, because white light makes it harder for everyone's eyes to adjust to the dark. Parking is available behind the physics building, and the observatory is a ten-minute walk uphill from there.` },
],
groups: [mc('Answer the questions about the announcement.', [
Q(7, `What is the main purpose of the announcement?`, [`To invite the public to a night of stargazing`, `To announce that the observatory is closing`, `To recruit students for a physics course`, `To explain how a telescope works`], 0, `invites you to Open Night at the university observatory`, `Khoa Vật lý và Thiên văn "invites you to Open Night at the university observatory" → thông báo mời mọi người đến buổi tối ngắm sao.`, '', 'B1'),
Q(8, `What will happen if the sky is cloudy?`, [`Graduate students will give talks indoors.`, `The event will be postponed to Saturday.`, `Visitors will receive refunds for their tickets.`, `The telescope will be moved outside.`], 0, `the event will move indoors`, `"If clouds roll in, the event will move indoors, where graduate students will give short presentations" → trời nhiều mây thì chuyển vào trong nhà và nghe thuyết trình.`, '', 'B1'),
Q(9, `Why are visitors asked to cover their flashlights with red plastic?`, [`White light makes it harder for eyes to adjust to the dark.`, `Red light keeps the dome warm, which may affect sensitive equipment.`, `White light can damage the telescope's optics if it reaches the tube.`, `Red plastic is required for safety, mainly to preserve night vision.`], 0, `white light makes it harder`, `Người thông báo giải thích "white light makes it harder for everyone's eyes to adjust to the dark" → ánh sáng trắng làm mắt khó thích nghi với bóng tối.`, '', 'B2'),
Q(10, `How can visitors get tickets?`, [`By reserving online before Thursday noon`, `By paying at the observatory door`, `By asking a graduate student on Friday`, `By visiting the physics office on Thursday night`], 0, `reserve them online until Thursday at noon`, `Vé miễn phí nhưng cần đặt: "You can reserve them online until Thursday at noon" → đặt trực tuyến trước trưa thứ Năm.`, '', 'B1'),
])],
});
TF.listening.push({
id: 'tf10-lt3', set: 10, task: 'talk', title: 'Architecture: How Gothic Cathedrals Stand Up',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in an architecture class.' }, { pause: 1 },
{ s: 'P', t: `Last time we looked at Romanesque churches, with their thick walls and small windows. Today I want to ask how builders in twelfth-century France managed to create cathedrals that were taller, lighter, and full of colored glass. The answer lies in a few clever structural ideas.` },
{ s: 'P', t: `Let's start with the problem. A stone roof, called a vault, is extremely heavy, and it doesn't only press down. It also pushes outward on the walls. In a Romanesque church, the solution was simply to make the walls very thick, and that's why the windows had to stay small. Cut a large hole in a thick wall and you weaken it.` },
{ s: 'P', t: `Gothic builders approached the problem differently. First, they used pointed arches instead of round ones. A pointed arch directs more of the weight straight down, so the outward push is smaller. Second, they built ribbed vaults, where a skeleton of stone ribs carries the load and thin panels fill the spaces between them. That made the roof much lighter.` },
{ s: 'P', t: `But some outward force remained, and this is where the famous flying buttress comes in. A flying buttress is a stone arm that stands outside the building and reaches over the side aisles to meet the upper wall exactly where the vault pushes hardest. It carries that force across to a heavy pier on the ground. Notice what this does: the wall itself no longer has to hold the roof up alone, so it can be thin and filled with windows.` },
{ s: 'P', t: `The result was stained glass on a scale never seen before. At Chartres, for example, the walls are, in effect, almost made of colored glass. Medieval visitors, by the way, believed this light had a spiritual meaning, so the structure and the symbolism worked together.` },
{ s: 'P', t: `Now, you might ask whether the builders understood the physics. They didn't have our mathematics. They worked from experience, by trial and error, and sometimes they failed. At Beauvais, the builders raised the vault higher than anyone before, and parts of it collapsed in the thirteen hundreds. They rebuilt it, but the cathedral was never finished as planned. It's a reminder that these great buildings reached the limits of what stone could do.` },
{ s: 'P', t: `For next week, please read the chapter on Chartres and think about how light is used inside the building.` },
],
groups: [mc('Answer the questions about the talk.', [
Q(11, `What is the talk mainly about?`, [`How new structural ideas allowed taller churches with larger windows`, `Why Romanesque churches were considered more beautiful due to their massive walls`, `How stained glass was made in France during the medieval period, using pigments`, `Which cathedral is the tallest in Europe, surpassing even the famous Cologne Cathedral`], 0, `taller, lighter, and full of colored glass`, `Giáo sư hỏi làm sao thợ xây tạo ra nhà thờ "taller, lighter, and full of colored glass" và trả lời bằng các ý tưởng kết cấu mới → chủ đề là kỹ thuật cho phép nhà thờ cao hơn, nhiều cửa sổ hơn.`, '', 'B1'),
Q(12, `Why did Romanesque churches have small windows?`, [`Large openings would weaken their thick walls.`, `Masons lacked the skills needed to produce clear glass.`, `The walls were simply far too thin to hold heavy glass.`, `Smaller openings helped keep the cold winds outside.`], 0, `Cut a large hole in a thick wall and you weaken it`, `Mái vòm đẩy ra ngoài nên tường phải dày; khoét lỗ lớn trên tường "and you weaken it" → cửa sổ phải nhỏ để tránh làm yếu kết cấu.`, '', 'B2'),
Q(13, `According to the professor, how does a pointed arch help?`, [`It sends more weight straight down.`, `It makes the roof lighter than stone ribs.`, `It carries force to the ground outside.`, `It makes the windows look larger.`], 0, `directs more of the weight straight down`, `"A pointed arch directs more of the weight straight down, so the outward push is smaller" → vòm nhọn dồn nhiều trọng lượng thẳng xuống, giảm lực đẩy ngang.`, '', 'B1'),
Q(14, `Why does the professor say "the wall itself no longer has to hold the roof up alone"?`, [`To explain why Gothic walls could be thin and full of windows`, `To suggest that the walls were merely ornamental and had no structural role`, `To show that flying buttresses were decorative and did not support the roof`, `To describe a danger to the building if the roof pressed on thin walls`], 0, `so it can be thin and filled with windows`, `Câu này nằm ngay trước "so it can be thin and filled with windows" → vì trụ chống bay gánh bớt lực nên tường có thể mỏng và nhiều cửa sổ.`, '', 'C1'),
Q(15, `What does the professor imply about Gothic builders?`, [`They relied on experience rather than advanced mathematics.`, `They copied structural frameworks directly from older Romanesque churches.`, `They systematically avoided taking any unnecessary risks with daring designs.`, `They understood structural physics much better than contemporary engineers.`], 0, `trial and error`, `Giáo sư nói họ "didn't have our mathematics" và làm theo "experience, by trial and error" → thợ xây dựa vào kinh nghiệm hơn là toán học hiện đại.`, 'inference', 'B2'),
Q(16, `Why does the professor mention Beauvais?`, [`To show that stone buildings have limits`, `To give an example of a perfectly finished cathedral`, `To compare stained glass in two cities`, `To explain why pointed arches were abandoned`], 0, `reached the limits of what stone could do`, `Ở Beauvais vòm cao nhất bị sập và nhà thờ không hoàn thành; giáo sư kết luận các công trình này "reached the limits of what stone could do" → ví dụ cho giới hạn của đá.`, '', 'B2'),
])],
});

/* ===================================================================
* WRITING · Build a Sentence (câu 1–10)
* =================================================================== */
TF.writing.push({
id: 'tf10-bs', set: 10, task: 'sentence', title: 'Build a Sentence · Set 10',
instr: 'Put the words in the correct order to make a grammatical response.',
items: [
{ n: 1, prompt: 'Why did you miss the tutoring session?', chunks: ['I', 'did not', 'realize', 'that', 'the schedule', 'had changed'], end: '.', starter: 'Sorry,',
explain: `"realize that + mệnh đề": "that" mở đầu mệnh đề danh từ. "had changed" (quá khứ hoàn thành) diễn tả việc thay đổi lịch xảy ra trước thời điểm buổi học.` },
{ n: 2, prompt: 'Do you know when the scholarship results will be announced?', chunks: ['they', 'will', 'be announced', 'by', 'the end', 'of April'], end: '.', alt: ['by the end of April they will be announced'],
explain: `Bị động tương lai: "will be + V3" (sẽ được công bố). Cụm "by the end of April" (muộn nhất vào cuối tháng Tư) có thể đứng cuối hoặc đầu câu.` },
{ n: 3, prompt: 'Why are so many cars parked on the grass?', chunks: ['the main lot', 'has been', 'closed', 'since', 'last week', 'for repairs'], end: '.',
explain: `Hiện tại hoàn thành bị động "has been closed" + "since + mốc thời gian" (kể từ tuần trước); "for repairs" nêu lý do và đứng cuối câu.` },
{ n: 4, prompt: 'What should I know before visiting the museum?', chunks: ['you', 'are not', 'allowed', 'to', 'take photographs', 'inside the gallery'], end: '.',
explain: `Cấu trúc "be (not) allowed to + V" (không được phép làm gì). Cụm giới từ "inside the gallery" bổ nghĩa nơi chốn và đứng cuối câu.` },
{ n: 5, prompt: 'Did the professor explain the new grading policy?', chunks: ['she', 'asked', 'us', 'whether', 'we', 'had read the syllabus'], end: '.',
explain: `Câu tường thuật câu hỏi Yes/No: "asked + O + whether + S + V". Trong mệnh đề "whether" không đảo trợ động từ, dùng quá khứ hoàn thành "had read".` },
{ n: 6, prompt: 'Are you going to apply for the exchange program?', chunks: ['I', 'would', 'apply', 'if', 'the fee', 'were lower'], end: '.', alt: ['if the fee were lower I would apply'],
explain: `Câu điều kiện loại 2 (giả định không có thật ở hiện tại): "would + V" ở mệnh đề chính, "if + S + were/V2" ở mệnh đề điều kiện; với "the fee" dùng "were".` },
{ n: 7, prompt: 'Where did you hear about the free workshop?', chunks: ['a friend', 'who', 'works', 'at the library', 'mentioned', 'it to me'], end: '.',
explain: `Mệnh đề quan hệ xác định: "a friend who works at the library" làm chủ ngữ, động từ chính là "mentioned it to me" (nhắc với tôi).` },
{ n: 8, prompt: 'Was the museum crowded on Saturday?', chunks: ['it was', 'not', 'nearly', 'as crowded', 'as', 'I', 'had feared'], end: '.',
explain: `So sánh ngang bằng phủ định "not as … as"; "nearly" nhấn mạnh mức chênh lệch lớn (kém xa). "as I had feared" dùng quá khứ hoàn thành vì nỗi lo có trước.` },
{ n: 9, prompt: 'Where is tomorrow\'s study group meeting?', chunks: ['I', 'have no idea', 'which', 'room', 'we', 'are meeting in'], end: '.',
explain: `Câu hỏi lồng: "which room + S + V" giữ trật tự câu khẳng định (không đảo "are we"). Giới từ "in" đứng cuối mệnh đề, quy tắc thường gặp khi nói.` },
{ n: 10, prompt: 'Should I buy the textbook or borrow it?', chunks: ['it', 'is', 'not', 'necessary', 'to buy it', 'since', 'the library has copies'], end: '.', alt: ['since the library has copies it is not necessary to buy it'],
explain: `"It is not necessary to + V" (không cần làm gì) + mệnh đề lý do với "since" (vì). Mệnh đề "since" có thể đứng đầu hoặc cuối câu.` },
],
});

/* ===================================================================
* WRITING · Write an Email
* =================================================================== */
TF.writing.push({
id: 'tf10-em1', set: 10, task: 'email', title: 'Asking about a Scholarship', minutes: 7,
scenario: 'You have heard about a scholarship for students in your department. The deadline is in two weeks, and the online instructions do not explain what the essay should include or whether first-year students may apply.',
to: 'Ms. Ortega, the Scholarship Coordinator',
points: ['Introduce yourself and say which scholarship you are asking about.', 'Explain what information you could not find.', 'Ask two specific questions and request a reply before the deadline.'],
model: 'Dear Ms. Ortega,\n\nMy name is Kim Lee, and I am a first-year biology student. I am writing about the Greenfield Science Scholarship, which I would like to apply for before the deadline on the twenty-eighth.\n\nI have read the instructions on the website, but I could not find two important details. First, the page does not say how long the personal essay should be or what topic it should cover. Second, it does not say clearly whether first-year students are eligible, since the example winners were all in their second or third year.\n\nCould you please let me know the required length and topic of the essay, and tell me whether I may apply this year? I would be very grateful for a reply by next Friday so that I have enough time to write a careful essay.\n\nThank you very much for your help.\n\nSincerely,\nKim Lee',
checklist: ['Tự giới thiệu và nêu rõ học bổng muốn hỏi ngay đoạn đầu', 'Nói rõ thông tin nào bạn không tìm thấy', 'Có đúng hai câu hỏi cụ thể và đề nghị trả lời trước hạn', 'Giọng văn lịch sự: "Could you please…?", "I would be grateful…"', 'Có lời kết và ký tên', 'Khoảng 120–180 từ, không lỗi chính tả'],
tips: 'Email hỏi thông tin nên ngắn gọn và dễ trả lời: đánh số "First… Second…" cho từng câu hỏi, và nêu hạn chót để người nhận biết mức khẩn cấp.',
});
TF.writing.push({
id: 'tf10-em2', set: 10, task: 'email', title: 'A Parking Problem on Campus', minutes: 7,
scenario: 'Your university recently moved the student parking lot to the edge of campus, twenty minutes from your classes. You commute by car because you live far away and have evening classes.',
to: 'Mr. Reyes, Director of Transportation Services',
points: ['Explain what the change is and why it is a problem for you.', 'Describe how it affects other students.', 'Suggest a realistic solution.'],
model: 'Dear Mr. Reyes,\n\nI am a third-year student who commutes by car, and I am writing about the new location of the student parking lot. Since the beginning of the term, the lot has been at the far end of campus, about twenty minutes on foot from the main classroom buildings.\n\nThis change causes real difficulties. I have a class that ends at nine in the evening, and walking alone to a distant lot in the dark makes me uncomfortable. Other students who carry heavy equipment, such as music or design students, have told me that the walk is also very tiring, and several have been late to class.\n\nI understand that the old lot is being used for construction. Perhaps the university could run a shuttle between the new lot and the main buildings in the evening, or reserve a small number of closer spaces for night classes. Either option would make a big difference.\n\nThank you for considering my suggestion.\n\nSincerely,\nAlex Morgan',
checklist: ['Nêu bạn là ai và nói về thay đổi nào ngay đoạn đầu', 'Giải thích tác động cụ thể lên bạn và các sinh viên khác', 'Đề xuất giải pháp khả thi, thể hiện sự thấu hiểu nhà trường', 'Giọng điệu lịch sự, mang tính xây dựng', 'Có lời kết phù hợp ("Thank you for considering…")', 'Khoảng 120–180 từ'],
tips: 'Đưa ví dụ cụ thể (lớp học muộn, dụng cụ nặng) thay vì chỉ nói "bất tiện". Sau khi thừa nhận lý do của nhà trường ("I understand that…"), đề xuất của bạn sẽ dễ được chấp nhận hơn.',
});

/* ===================================================================
* WRITING · Write for an Academic Discussion
* =================================================================== */
TF.writing.push({
id: 'tf10-ad1', set: 10, task: 'discussion', title: 'Should Tutoring Be Free for All Students?', minutes: 10,
professor: { name: 'Dr. Okonkwo', text: 'This week we are discussing support services in higher education. Many universities offer free tutoring, but budgets are limited. Some people argue that free tutoring should be available to every student who asks for it. Others believe it should be reserved for students who are struggling or who have low incomes. What do you think: who should be able to use free tutoring, and why?' },
students: [
{ name: 'Rosa', text: 'I think it should be open to everyone. Students who already get good grades often become better by explaining ideas to a tutor, and no one should have to prove they are failing before they get help.' },
{ name: 'Daniel', text: 'I disagree. Tutors are limited, and the waiting lists are already long. If the service is for everyone, the students who need it most will wait weeks for an appointment.' },
],
model: 'Rosa and Daniel both raise important concerns, but I believe free tutoring should be open to everyone with a simple priority system. Daniel is right that tutors are limited, so students who are failing a course or have an upcoming exam should be able to book first. However, Rosa is correct that waiting until a student is failing is not effective. Many problems are easy to fix early. A fair solution would be to let all students book one session a week, while reserving a few extra slots for those in urgent need. For example, a first-year student who is confused about a statistics concept could get help in week three instead of waiting until the midterm. This way, the service stays inclusive without leaving the most vulnerable students behind.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Nhắc đến ý của ít nhất một bạn (Rosa/Daniel) và phản hồi', 'Đưa ra ý MỚI (hệ thống ưu tiên), không chỉ nhắc lại ý bạn khác', 'Có ví dụ cụ thể', 'Tối thiểu khoảng 100 từ, câu đa dạng', 'Câu kết tóm lại lập trường'],
tips: 'Khi hai bạn đối lập, hãy thừa nhận điểm đúng của mỗi bên rồi đề xuất một cơ chế dung hòa. Cụm hữu ích: "Daniel is right that…", "However, Rosa is correct that…", "A fair solution would be to…".',
});
TF.writing.push({
id: 'tf10-ad2', set: 10, task: 'discussion', title: 'Memorizing or Understanding?', minutes: 10,
professor: { name: 'Professor Haddad', text: 'In our unit on learning, we have discussed how students prepare for exams. Some teachers say that memorizing facts is still important, because understanding depends on knowing basic information. Others say schools should focus on understanding and problem solving, since facts can be searched online in seconds. Which approach do you think is more valuable for students, and why?' },
students: [
{ name: 'Mei', text: 'Facts matter. A doctor cannot look up every drug name during an emergency. You need a solid base of knowledge in your head before you can think creatively about it.' },
{ name: 'Tomas', text: 'I think understanding is more useful. I memorized formulas for a physics test and forgot them in a week. When I understood why they worked, I never forgot them.' },
],
model: 'I agree with Tomas that understanding should be the main goal, but I think Mei is right that some facts must be memorized. The most effective method is to memorize a small core of essential information and then spend most of the time using it to solve problems. For instance, a student learning chemistry should know the symbols of common elements by heart, because without them reading a reaction would be slow and confusing. Yet that same student would learn far more by explaining why the elements react as they do. In my view, memorization provides the tools, and understanding teaches us how to use them. Schools should therefore teach both, rather than choosing only one.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Mei hoặc Tomas', 'Đưa ra lập luận/ý mới (ví dụ: kết hợp ghi nhớ và hiểu)', 'Có ví dụ minh họa cụ thể', 'Dùng từ nối: For instance, Yet, In my view', 'Tối thiểu khoảng 100 từ'],
tips: 'Với đề hai phía, bạn có thể chọn một bên chính nhưng thừa nhận phần hợp lý của bên kia, sau đó thêm ví dụ riêng (môn học, nghề nghiệp) để bài viết cụ thể và thuyết phục.',
});

/* ===================================================================
* SPEAKING · Listen and Repeat
* =================================================================== */
TF.speaking.push({
id: 'tf10-rp1', set: 10, task: 'repeat', title: 'Tutoring Center Assistant', accent: 'en-US',
context: 'You are starting a job at a tutoring center. Listen to the supervisor and repeat exactly what you hear.',
sentences: [
{ t: 'Welcome to the tutoring center.', tip: 'Nối âm "Welcome to the"; nhấn "TUtoring" – âm đầu /tuː/ chứ không phải /tʃuː/.' },
{ t: 'Please sign in at the front desk.', tip: 'Chú ý âm /s/ trong "sign" và "desk"; nhấn "FRONT desk".' },
{ t: 'Each session lasts forty-five minutes.', tip: 'Đọc số "forty-five": nhấn "forTY" và "FIVE"; "lasts" kết thúc bằng cụm /sts/.' },
{ t: 'Writing appointments must be booked online.', tip: 'Bị động "must be booked"; âm cuối /t/ trong "booked" nhẹ, nối sang "online".' },
{ t: 'Students may visit the math lab without an appointment.', tip: 'Nối "visit the" và "without an" thành /wɪðaʊtən/; nhấn "MATH".' },
{ t: 'If a student arrives late, please check whether the tutor is still available.', tip: 'Câu dài – ngắt sau "late,"; "whether" và "the" đều có âm /ð/ (đầu lưỡi giữa răng, có rung).' },
{ t: 'Remind everyone that cancellations are accepted until noon the day before.', tip: 'Nhấn "RemIND" và "cancelLAtions"; "noon the day before" đọc liền mạch.' },
],
});
TF.speaking.push({
id: 'tf10-rp2', set: 10, task: 'repeat', title: 'Transit Information Desk', accent: 'en-GB',
context: 'You are working at a city transit information desk. Listen to the manager and repeat exactly what you hear.',
sentences: [
{ t: 'Good morning, how can I help you?', tip: 'Ngữ điệu lên ở cuối câu hỏi; "morning" /ˈmɔːnɪŋ/.' },
{ t: 'The next bus leaves in ten minutes.', tip: 'Nối "next bus" (âm /t/ nhẹ); "leaves" có âm /z/ cuối.' },
{ t: 'A monthly pass costs thirty pounds.', tip: 'Nhấn "MONTHly"; âm /θ/ trong "monthly" và đọc "thirty" /ˈθɜːti/.' },
{ t: 'Passengers should have their tickets ready before boarding.', tip: 'Nhấn "PASsengers"; "tickets ready" nối nhẹ; "boarding" /ˈbɔːdɪŋ/.' },
{ t: 'The station is closed for maintenance until the end of the week.', tip: 'Nhấn "MAINtenance" (3 âm tiết, nhấn âm đầu); "until the end" nối âm.' },
{ t: 'Please note that service may be delayed during the heavy rain.', tip: 'Nhấn "DelAYED"; "heavy rain" hai âm /h/ và /r/ cần rõ.' },
{ t: 'If you are travelling with a large suitcase, we recommend using the express line.', tip: 'Câu dài – ngắt sau "suitcase,"; "recommend" nhấn âm cuối /ˌrekəˈmend/.' },
],
});

/* ===================================================================
* SPEAKING · Take an Interview
* =================================================================== */
TF.speaking.push({
id: 'tf10-iv1', set: 10, task: 'interview', title: 'Learning and Memory', seconds: 45, accent: 'en-US',
context: 'A researcher is interviewing students about how they learn and remember things. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To begin, what is one thing you learned recently, and how did you learn it?',
model: 'Recently I learned how to make basic bread at home. I watched several videos first, and then I tried it myself over three weekends. My first loaf was very hard, but each time I understood a little more about why the dough needs time to rise, so the results improved.',
tip: 'Nêu cụ thể điều đã học, rồi mô tả quá trình bằng thì quá khứ. Chi tiết nhỏ (số cuối tuần, kết quả) làm câu trả lời sinh động.' },
{ q: 'Do you find it easier to remember something you read, something you hear, or something you see in a picture? Why?',
model: 'For me, pictures are the easiest. When I look at a diagram, I can remember where each part was on the page, even weeks later. Reading is harder because I forget the exact words, and I tend to lose focus when I only listen. So I often draw quick sketches while I study.',
tip: 'Chọn một phương án rõ ràng, so sánh ngắn với hai phương án còn lại và thêm một thói quen thực tế.' },
{ q: 'Some people say that taking notes by hand helps you remember more than typing. Do you agree?',
model: 'I partly agree. When I write by hand, I have to choose the key ideas because I can\'t write as fast, and that choosing helps me remember them. However, typing is better for long lectures when I need a full record. So I use handwriting for new, difficult topics and a laptop for review.',
tip: 'Đồng ý một phần là chiến lược tốt: nêu lý do cho lập trường, thừa nhận ưu điểm của bên kia, rồi nêu cách bạn kết hợp.' },
{ q: 'If your university could add one class to help students learn more effectively, what should it teach?',
model: 'I think the university should add a class on learning strategies. Many students just reread their notes, which is not very effective. A class could teach methods like testing yourself and explaining ideas to others. That could improve grades and reduce stress, especially for first-year students.',
tip: 'Đề xuất một ý cụ thể, nêu vấn đề nó giải quyết và lợi ích. Dùng "I think … should …", "That could …".' },
],
});
TF.speaking.push({
id: 'tf10-iv2', set: 10, task: 'interview', title: 'Money and Spending', seconds: 45, accent: 'en-GB',
context: 'A researcher is interviewing young adults about money and spending habits. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'How do you usually pay for things, and why do you prefer that method?',
model: 'I mostly pay with my phone, because it is quick and I never need to look for cash. I also like that it records everything I spend, so I can check my budget at the end of the month. I only use cash at small street stalls that don\'t accept cards.',
tip: 'Trả lời cả hai vế (phương thức + lý do). Thêm một ngoại lệ ngắn để câu trả lời thực tế hơn.' },
{ q: 'Do you save money regularly? Please explain how you do it.',
model: 'Yes, I try to save about twenty percent of whatever I earn. As soon as I receive my pay, I transfer that amount into a separate account, so I don\'t see it and don\'t spend it. It isn\'t always easy, but it gives me a sense of security.',
tip: 'Nêu thói quen rõ ràng kèm một con số hoặc phương pháp cụ thể, rồi kết bằng cảm nhận hoặc lợi ích.' },
{ q: 'Some people say that young people spend too much money on things they do not need. What is your opinion?',
model: 'I think that\'s partly true. Advertising on social media makes it easy to buy things on impulse, and I\'ve done it myself. However, spending on things that make life enjoyable is not always wasteful. The key is to decide in advance how much you can afford to spend on fun.',
tip: 'Với câu hỏi quan điểm, tránh trả lời tuyệt đối: nêu mặt đúng, mặt chưa đúng rồi đưa ra nhận định cân bằng.' },
{ q: 'If you suddenly received a large sum of money, how would you use it?',
model: 'First, I would pay off any debts and put part of the money into savings. Then I would use some of it to take a course in graphic design, because I want to change careers. Finally, I would treat my family to a nice dinner, since they have always supported me.',
tip: 'Câu hỏi giả định: dùng "I would…" và trình tự "First, Then, Finally" để sắp xếp ý rõ ràng.' },
],
});

/* ===================================================================
* Xoay vị trí đáp án đúng (chỉ các unit của bộ 10) (mỗi câu giữ lv riêng, đã chấm theo nội dung).
* Dữ liệu soạn với a = 0; xoay theo mẫu cố định cho từng dạng bài → A/B/C/D đều, không chuỗi dài.
* Chấm theo chỉ số nên luôn đúng.
* =================================================================== */
const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
const counter = {};
[...TF.reading, ...TF.listening].filter(u => u.set === 10).forEach(u => (u.groups || []).forEach(gr => {
if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
gr.items.forEach(it => {
const k = counter[u.task] = (counter[u.task] || 0) + 1;
const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
});
}));
})(typeof self !== 'undefined' ? self : this);
