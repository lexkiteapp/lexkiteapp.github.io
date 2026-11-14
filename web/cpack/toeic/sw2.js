/* TOEIC Speaking & Writing – dạng mô tả tranh (Speaking câu 3–4, Writing câu 1–5): đề luyện tự biên soạn theo cấu trúc công khai của ETS (không phải đề thật).
* Ảnh: 42 ảnh CC0/public domain của web/img/toeic (CREDITS.md). Mô tả chỉ nêu điều nhìn thấy trong ảnh.
* picture: 2 ảnh/đề, chuẩn bị 45 giây + nói 30 giây. picture-sentence: 5 ảnh/đề, mỗi ảnh 2 từ cho sẵn, 8 phút.
* checklist: [{ c: tiêu chí (tiếng Việt – app dịch theo ngôn ngữ người học), ex: ví dụ sửa câu ❌ → ✅ }] – cùng quy ước với sw1.js. */
(function (g) {
const S = g.TOEIC_SW = g.TOEIC_SW || { speaking: [], writing: [] };
const CK_PIC = [
{ c: 'Câu đầu nêu chủ thể chính và địa điểm của bức ảnh', ex: '❌ "Um… I see a picture." → ✅ "This photo shows two women talking at a table in an office."' },
{ c: 'Tả cụ thể người và vật: quần áo, màu sắc, vật đang cầm', ex: '❌ "There is a man." → ✅ "There is a man in an orange vest holding a book."' },
{ c: 'Dùng hiện tại tiếp diễn cho hành động đang diễn ra', ex: '❌ "The man hold a book." → ✅ "The man is holding a book."' },
{ c: 'Có cả phần nền phía sau và vị trí (on the left, in the background…)', ex: '❌ Chỉ tả người ở giữa → ✅ "In the background, there are tall buildings."' },
{ c: 'Nói liền mạch gần đủ 30 giây, kết bằng một nhận xét chung', ex: '❌ Dừng sau 10 giây → ✅ "Overall, it looks like a busy and friendly place."' },
];
const CK_PS = [
{ c: 'Dùng đủ CẢ HAI từ cho sẵn (được đổi dạng từ, đổi thứ tự)', ex: '❌ "The woman talks." (thiếu "while") → ✅ "The woman talks on the phone while she walks."' },
{ c: 'Mỗi ô là MỘT câu hoàn chỉnh: có chủ ngữ + động từ, kết thúc bằng một dấu chấm', ex: '❌ "A man in a blue jacket." → ✅ "A man in a blue jacket is waiting at the station."' },
{ c: 'Câu đúng với nội dung bức ảnh, không bịa chi tiết không nhìn thấy', ex: '❌ "The man is angry with his boss." → ✅ "The man is looking at a laptop."' },
{ c: 'Ngữ pháp đúng: thì, mạo từ a/the, số ít – số nhiều', ex: '❌ "The women is sit at the table." → ✅ "The women are sitting at the table."' },
{ c: 'Từ nối dùng đúng nghĩa và đủ hai vế câu', ex: '❌ "Because the man works." → ✅ "The man works carefully because the machine is heavy."' },
];
const pic = (id, title, qs) => ({ id, task: 'picture', title, accent: 'en-US', questions: qs.map(([img, model, tip]) => ({ img, prep: 45, secs: 30, model, tip })), checklist: CK_PIC });
const ps = (id, title, items) => ({ id, task: 'picture-sentence', title, minutes: 8, items: items.map(([img, words, model]) => ({ img, words, model })), model: items.map(x => x[2]).join('\n'), checklist: CK_PS });

/* ───────── SPEAKING · Describe a picture ───────── */
S.speaking.push(
pic('tsw-pic1', 'Office Conversations', [
['t1-p1-1', "This photo shows two women sitting at a small round white table in an office. They are facing each other and having a conversation. The woman on the left is smiling and moving her hands as she talks. Behind them, there is a large window with a view of tall city buildings.", 'Mở đầu bằng "This photo shows…", rồi tả người bên trái và bên phải, sau cùng là cửa sổ phía sau.'],
['t2-p1-1', "In this picture, a man in a dark vest is speaking at a meeting. He is raising both hands as if he is explaining something. Two colleagues are sitting in the foreground, and they seem to be listening. There are laptops and glasses of water on the table, and a big window is behind him.", 'Tả người chính trước, rồi người ở tiền cảnh và đồ vật trên bàn; dùng "seem to" khi chỉ đoán.']]),
pic('tsw-pic2', 'Cooking and Coffee', [
['t1-p1-3', "This photo was taken in a busy restaurant kitchen. In the foreground, a chef in a white jacket is standing with his back to the camera. Behind the counter, another cook in a white hat is working, and his arms look blurry because he is moving quickly. There are stacks of white plates and several lamps hanging above.", 'Đi từ tiền cảnh đến hậu cảnh: người gần camera, người phía sau, rồi đồ vật (đĩa, đèn).'],
['t7-p1-1', "The picture shows a close-up of a barista making a coffee. The barista is pouring milk from a metal pitcher into a white paper cup, and a pattern is forming on top of the drink. A hand is holding the cup. In the blurry background, you can see a coffee machine. It looks like a café.", 'Ảnh cận cảnh: nói rõ hành động chính (pouring milk) trước, nền mờ để cuối.']]),
pic('tsw-pic3', 'Warehouse and Port', [
['t3-p1-1', "This photo was taken inside a large warehouse. A man wearing a red helmet and an orange safety vest is driving a green forklift. Next to the forklift, there is a tall stack of boxes wrapped in plastic. Behind them, there are more boxes on high shelves. The worker looks focused on his job.", 'Nêu nơi chốn (warehouse), người và phương tiện, rồi hàng hóa và kệ phía sau.'],
['t3-p1-6', "This picture shows a shipping yard outside. Many metal containers are stacked on top of each other in the middle of the photo. A yellow machine is standing next to them, and its long arm is raised. The ground is gray with white lines, and there is a fence in the front. The sky is cloudy.", 'Ảnh không có người rõ nét: tả vật chính, màu sắc, vị trí, rồi bầu trời và mặt đất.']]),
pic('tsw-pic4', 'Getting Around the City', [
['t4-p1-1', "This photo shows a man on a subway platform. He is standing near the edge, wearing a black jacket and a backpack, and he is looking down. Behind him, a red train is coming into the station. On the wall, there is a sign with the name of the station.", 'Tả người ở tiền cảnh, đồ anh ta mang, rồi tàu và biển báo ở phía sau.'],
['t7-p1-6', "This is a picture of a very long escalator in a metro station. On the right side, a group of people is moving along the escalator, and they look blurry because they are moving. The tunnel has a curved ceiling and bright lights. There are advertising posters along the walls. It looks like a busy time of day.", 'Dùng "on the left / on the right" để chỉ vị trí; giải thích vì sao người trong ảnh bị mờ.']]),
pic('tsw-pic5', 'Hard at Work', [
['t4-p1-2', "This photo shows a construction worker on a building site. He is an older man wearing a black helmet and a bright orange safety vest. He is standing among metal scaffolding poles and looking down. In the background, there are more metal railings and some wooden boards. Safety equipment is important in this kind of job.", 'Mô tả đồ bảo hộ cụ thể (helmet, vest) và thêm một nhận xét chung ở câu cuối.'],
['t6-p1-4', "In this picture, a man is repairing a classic car in a garage. He is wearing a red sweatshirt and jeans, and he is kneeling on the floor beside the open door of the car. Tools and cables are lying around him. In the background, there is a shelf full of small bottles. It looks like a busy workshop.", 'Hành động chính dùng hiện tại tiếp diễn (is repairing, is kneeling), rồi vật xung quanh.']]),
pic('tsw-pic6', 'Stalls and Shops', [
['t4-p1-3', "This photo shows an older man at a book stall. He is holding up a book and reading its cover. In front of him, there are many tall piles of books on a table, and there are more books on the shelves behind him. A small sign on the table shows a price of two euros.", 'Có nhiều vật giống nhau: dùng "many", "piles of", "stacks of" thay vì liệt kê từng cái.'],
['t2-p1-6', "This picture was taken at a small food stall in a market. On the left, an older man is sitting quietly and looking at the camera. In front of the stall, there are trays of food with small price tags. Above them, there are lights and signs with writing in another language.", 'Nếu không đọc được chữ trên biển, chỉ nói có biển/giá, đừng đoán nội dung.']]),
pic('tsw-pic7', 'Outdoors', [
['t4-p1-6', "In this photo, a man is mowing a big lawn. He is wearing a white T-shirt and gray pants, and he is pushing the mower away from the camera. The grass is green and has long straight lines. In the background, there are many trees and a large white building. It looks like a calm day.", 'Người quay lưng: nói "from behind / with his back to the camera", rồi tả cỏ, cây và tòa nhà.'],
['t6-p1-6', "This picture shows two children walking along a path in a park. They are seen from behind and wearing dark jackets. Tall green trees are growing on both sides, and sunlight is shining through the leaves. The ground is covered with brown leaves. It looks like a peaceful place for a walk.", 'Tả cảm giác chung của khung cảnh bằng "It looks like…" để kéo dài câu trả lời tự nhiên.']]),
pic('tsw-pic8', 'People on the Street', [
['t5-p1-2', "In this photo, a woman is using an old sewing machine on a small table outside. She is wearing glasses and a red jacket, and she is looking at the man beside her. A man in a gray jacket and a cap is standing behind her and smiling. Behind them, there is a narrow street.", 'Có hai người: nói rõ ai đang làm gì (woman… man…) và dùng "behind / beside" cho vị trí.'],
['t6-p1-2', "This picture shows a delivery rider sitting on a small motorbike at the side of a road. He is wearing a blue cap and a blue jacket, and he has a large yellow box on his back. The words Food Band are written on it. In the background, there are trees, a building and a car.", 'Đọc được chữ trên hộp thì nêu ra; mô tả phương tiện và quần áo rồi mới đến nền.']]),
pic('tsw-pic9', 'Markets and Nets', [
['t7-p1-2', "This is an old-style photo of a market on a boat. In the middle, a man is leaning over a lot of wooden crates, and a woman is standing next to him. Above them, a white cover gives some shade. On the brick wall behind them, several women are standing and looking down at the boat.", 'Ảnh có nhiều lớp: nói tiền cảnh (thùng gỗ), giữa (người bán) và hậu cảnh (bức tường, người đứng trên).'],
['t6-p1-3', "In this photo, several people are working under a shelter. They are handling large fishing nets, which are white and green, and a big pile of nets covers much of the floor. A person in a red top is sitting in the middle of the pile. In the background, you can see a street with some people.", 'Dùng "several people", "a big pile of" để mô tả đám đông và vật chất đống một cách tự nhiên.']]),
pic('tsw-pic10', 'Music and Care', [
['t7-p1-5', "This photo shows members of a brass band sitting together outdoors. They are wearing light blue shirts, and there is a big drum with the words Batesville Eureka Band on it. In the front, an older woman is smiling at the camera. Behind them, there is a green lawn and a colorful structure.", 'Nêu đồng phục và chữ trên trống, rồi người nổi bật nhất ở phía trước; nền để cuối.'],
['t7-p1-4', "This picture was taken in a hospital room. A man in a dark suit is wearing a face mask and talking to some other people, who are standing on the left. In front, there is a computer monitor showing a heartbeat line, and a pair of headphones is lying on the cart. Pink curtains hang in the background.", 'Mô tả nơi chốn trước (hospital room), rồi người chính, thiết bị ở tiền cảnh, màn cửa ở nền.']]),
);

/* ───────── WRITING · Write a sentence based on a picture ───────── */
S.writing.push(
ps('tsw-ps1', 'Office Work', [
['t1-p1-1', ['talk', 'while'], 'The two women talk with each other while they sit at a round table near a large window.'],
['t2-p1-1', ['meeting', 'while'], 'The man is speaking at a meeting while two colleagues listen to him.'],
['t2-p1-5', ['laptop', 'and'], 'One man points at the laptop and the other man smiles.'],
['t1-p1-5', ['type', 'while'], 'The man in the black hat types on his laptop while he sits at a wooden desk.'],
['t3-p1-2', ['keyboard', 'while'], 'A woman uses the keyboard while a cup of coffee stands on the desk.']]),
ps('tsw-ps2', 'Food and Drink', [
['t1-p1-3', ['chef', 'while'], 'A chef in a white coat stands with his back to us while another cook works behind the counter.'],
['t1-p1-4', ['strawberries', 'while'], 'Red strawberries fill a wooden crate while dark fruit is visible in the blurry background.'],
['t2-p1-4', ['counter', 'and'], 'The man behind the counter wears a white shirt and stands near an espresso machine.'],
['t7-p1-1', ['pour', 'into'], 'The barista pours milk from a metal pitcher into a paper cup.'],
['t6-p1-1', ['flowers', 'but'], 'The flowers on display are mostly gold and purple, but a few red ones are also visible at the bottom.']]),
ps('tsw-ps3', 'Work Sites', [
['t3-p1-1', ['forklift', 'while'], 'A man wearing a red helmet drives a forklift while large stacks of boxes wait beside him.'],
['t3-p1-6', ['containers', 'near'], 'A yellow machine stands near the stacked containers.'],
['t4-p1-2', ['wear', 'while'], 'The worker wears an orange safety vest and a black helmet while he looks down from the scaffolding.'],
['t6-p1-4', ['repair', 'while'], 'A man in a red sweatshirt kneels on the floor to repair a car while tools lie around him.'],
['t5-p1-6', ['truck', 'although'], 'Although the truck looks old, it is parked neatly at the loading dock.']]),
ps('tsw-ps4', 'Streets and Transport', [
['t4-p1-1', ['platform', 'while'], 'A man with a backpack stands on the platform while a red train arrives behind him.'],
['t7-p1-6', ['escalators', 'and'], 'Many people ride the long escalators, and they look blurry in the photo.'],
['t7-p1-3', ['street', 'while'], 'A street sweeper cleans the cobblestone street while a yellow taxi waits behind it.'],
['t6-p1-2', ['courier', 'while'], 'The courier sits on his scooter while he waits at the side of the road.'],
['t2-p1-3', ['stand', 'before'], 'A man in a gray suit stands before a large building with tall columns.']]),
ps('tsw-ps5', 'Markets and Stalls', [
['t2-p1-6', ['stall', 'while'], 'An older man sits beside his market stall while skewers of food are displayed with price tags.'],
['t4-p1-3', ['book', 'and'], 'The man holds up a book and looks at it carefully.'],
['t7-p1-2', ['boat', 'while'], 'Vegetables are sold from a boat while several women stand on the wall above.'],
['t6-p1-3', ['nets', 'while'], 'The men work with large nets while one person sits among them.'],
['t3-p1-5', ['prepare', 'while'], 'Staff members prepare drinks while customers stand near the open doors of the café.']]),
ps('tsw-ps6', 'Rooms and Equipment', [
['t4-p1-4', ['bed', 'because'], 'The hotel room looks inviting because the large bed has clean white sheets and the lamps are on.'],
['t4-p1-5', ['photocopier', 'but'], 'The photocopier has a tray with paper on it, but nobody is standing next to it.'],
['t2-p1-2', ['chairs', 'because'], 'The room looks empty because no one is sitting on the chairs.'],
['t5-p1-1', ['counters', 'but'], 'The check-in counters are lit up, but there are no passengers in the hall.'],
['t5-p1-4', ['knife', 'and'], 'A cleaver and a knife lie on the dark wooden table.']]),
ps('tsw-ps7', 'Outdoor Scenes', [
['t1-p1-2', ['bicycles', 'and'], 'Bright green bicycles stand in a long row, and each one has a number on it.'],
['t1-p1-6', ['sailboat', 'while'], 'One sailboat leans on its side near the shore while several other boats float farther out.'],
['t3-p1-4', ['benches', 'because'], 'The benches look unused because yellow leaves cover them and the ground.'],
['t4-p1-6', ['mow', 'while'], 'A man mows the large lawn while a large white building stands in the distance.'],
['t6-p1-6', ['walk', 'through'], 'Two children walk through a park along a path under tall trees.']]),
ps('tsw-ps8', 'People and Places', [
['t5-p1-2', ['sew', 'while'], 'The woman sews on an old machine while a man in a cap stands behind her and smiles.'],
['t5-p1-5', ['phone', 'while'], 'A bearded man in a dark suit smiles while he talks on the phone.'],
['t7-p1-4', ['monitor', 'while'], 'A man wearing a mask speaks to other people while a monitor shows lines on its screen.'],
['t7-p1-5', ['band', 'while'], 'The members of the band sit under a tent while an older woman smiles at the camera.'],
['t6-p1-5', ['flasks', 'and'], 'Green plants grow inside the glass flasks, and the flasks stand on a metal shelf.']]),
);
})(self);
