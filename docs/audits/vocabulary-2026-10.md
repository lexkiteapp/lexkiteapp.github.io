# Rà soát từ vựng – 10/2026

Phạm vi: 9.588 mục từ trong `web/js/data.js` + `web/js/lib/{ngsl,ngsl2,tsl-a,tsl-b,bsl,nawl,awl,exam-vocab*,domain-*,office,topics-more,skills}.js` và gói nghĩa 13 ngôn ngữ `web/packs/*.json`.
Cách làm: script kiểm tự động (từ loại ↔ định nghĩa/nghĩa Việt, IPA giọng Anh có dạng Mỹ, ví dụ thiếu từ, trùng/lệch cấp độ & IPA giữa các bộ, định nghĩa vòng tròn) + đọc tay mục bị gắn cờ + soát mẫu gói nghĩa es/fr/de/ja/zh/ru/ko… cho từ A1–A2.

## Tóm tắt

| Loại lỗi | Số sửa | Ghi chú |
|---|---|---|
| Định nghĩa tiếng Anh sai từ loại (n/adj gắn định nghĩa động từ, v gắn định nghĩa danh từ…) | 121 | Lỗi hệ thống từ nguồn "NGSL with English definitions": định nghĩa lấy nghĩa động từ cho mục danh từ (plan, price, park, phone…). Người học không dùng tiếng Việt thấy ĐỊNH NGHĨA này làm nghĩa chính khi gói ngôn ngữ thiếu từ → ưu tiên cao. |
| Định nghĩa sai nghĩa/vòng tròn/lẫn câu | 6 | software (ô định nghĩa chứa câu), trial, conditioner, anyway, much, far |
| Nghĩa Việt / từ loại lệch | 5 | judge, secure, highlight (n), conditioner |
| Ví dụ không minh họa đúng nghĩa/từ loại | 2 | advance ("in advance"), rank (động từ) |
| IPA ô giọng Anh dùng dạng Mỹ (/oʊ/, /r/ cuối, /ɾ/, /ɑr/) | 37 | + 1 thiếu trọng âm (loser). Sửa cả `content/wordlists/{bsl,nawl}.cache.json` để lần sinh sau giữ nguyên; `scripts/gen-wordlist.mjs` nay tự chuẩn hóa oʊ→əʊ, ɾ→t, d͡ʒ→dʒ. |
| Nghĩa dịch máy sai trong gói 13 ngôn ngữ (dịch từ trần, sai từ loại/sai nghĩa) | 50 từ × 13 ngôn ngữ | Ví dụ: will→"ý chí/voluntad" (phải là trợ động từ tương lai), miss→"señorita/Fräulein/ミス", well→"ừm" (まあ/嗯/Naja), like→"như" (comme/みたいな), fine→chỉ "tiền phạt", watch (ja)→"đồng hồ", live (zh)→"直播", fall (zh/ko)→"mùa thu", store (de/ko)→"lưu", bill (ja)→"ビル" (tòa nhà), bit (ru)→"cái đục". Bảng viết tay `content/wordlists/core.gloss.json` (thắng dịch máy), áp bằng `gen-word-packs.mjs --gloss-only`. |
| Quy trình gói nghĩa | 1 | `gen-word-packs.mjs` nạp bộ cốt lõi (NGSL, TOEIC) trước: từ đa từ loại lấy từ loại cốt lõi (trước đây "fine" lấy nghĩa "tiền phạt" của bộ luật vì awl/domain xếp trước theo ABC) và `--refine` hằng đêm tinh chỉnh từ thông dụng trước. |

Không sửa (đã xét, hợp lệ): 7 từ mượn giữ nguyên trong tiếng Việt (video, album, blog, vitamin, yoga, insulin, cholesterol); 15 cặp IPA khác nhau do danh từ/động từ đổi trọng âm (import, export, permit, suspect…) hoặc kiểu ghi (r); 22 cặp lệch cấp độ do khác nghĩa chuyên ngành (will "di chúc" B2, party "bên" B2, library "thư viện phần mềm"…); 7 ví dụ thư kết bằng tên người ký (không cần dấu chấm); /r/ nối trước nguyên âm (insurance /ɪnˈʃɔːrəns/, storage…) đúng giọng Anh.

## Chi tiết từng sửa (file | từ | trường | trước | sau | lý do)

| File | Từ | Trường | Trước | Sau | Lý do |
|---|---|---|---|---|---|
| ngsl.js | much | def | a lot; large amount; a high degree of | a lot; to a large degree | định nghĩa kiểu danh từ cho trạng từ |
| ngsl.js | place | def | to put something in a certain location or position | a particular area, building or position | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | point | def | to indicate something with your finger to others | an idea or opinion in a discussion; a mark or position; a unit for counting a score | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | interest | def | to make someone want to know about something | the feeling of wanting to know more about something; money paid for borrowing money | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | question | def | to ask for or try to get information | a sentence or phrase that asks for information | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | order | def | to ask for something you want to buy (e.g., a meal) | the way things are arranged one after another; a request for goods or food | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | service | def | to maintain a piece of machinery so it runs well | help or work that a business provides to customers | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | plan | def | to decide a set of actions to do something | a set of things you have decided to do in the future | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | result | def | to be the outcome of other causes and effects | something that happens because of something else; the final score or mark | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | far | def | a long way away | at or to a great distance | định nghĩa kiểu danh từ cho trạng từ |
| ngsl.js | level | def | to make things flat or even | how high, good or advanced something is | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | process | def | to adopt a set of actions that produce a particular result | a series of actions or steps that lead to a result | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | price | def | to determine or set the cost of something | the amount of money you must pay to buy something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | care | def | to look after someone or something | the work of looking after someone or something so they stay healthy or in good condition | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | deal | def | to give out (cards, etc.) to; distribute | an agreement, especially in business | từ loại n nhưng định nghĩa sai nghĩa (chia bài) |
| ngsl.js | value | def | to say how much money something is worth | how much money something is worth; how useful or important something is | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | force | def | to use physical strength or violence to persuade | physical strength or power | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | figure | def | to understand after thinking; work out | a number, especially in official information; the shape of a person's body | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | note | def | to make mention of something; to make a remark | a short written message; something you write down to help you remember | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | sense | def | to perceive using sight, sound, taste touch or hearing | one of the five natural abilities: sight, hearing, smell, taste and touch; meaning | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | research | def | to carefully study to find and report new knowledge | careful study of a subject to discover new facts | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | human | def | a person; a man, woman or child | relating to people or their nature | từ loại adj nhưng định nghĩa danh từ |
| ngsl.js | design | def | to plan in a particular way to fulfill a purpose | the way something is planned and made, including how it looks and works | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | phone | def | to talk to someone using a telephone | a device you use to talk to people who are far away | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | practice | def | to do something many times to improve a skill | doing something regularly to get better at it | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | approach | def | to get close to reaching something or somewhere | a way of dealing with a problem or doing something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | charge | def | to ask for money as a price for a service or goods | the amount of money you must pay for a service | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | fund | def | to supply money for something | an amount of money saved or collected for a particular purpose | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | trade | def | to buy, sell and exchange goods in business | the activity of buying and selling goods, especially between countries | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | risk | def | to take the chance that you may do something dangerous | the possibility that something bad or dangerous will happen | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | demand | def | to strongly request someone to do something; insist | the need or wish of people to buy or use something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | contact | def | to get in touch with someone | communication with someone by meeting, phoning or writing | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | surprise | def | to do something that another person didn't expect | an event or feeling caused by something you did not expect | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | campaign | def | to work in an organized and active way toward a goal | a planned series of activities to achieve a goal | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | park | def | to put your car or bike in a certain place for a time | a public area of grass and trees in a town where people can walk, play and relax | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | influence | def | to affect what happens; change something (indirectly) | the power to affect how someone thinks or behaves, or how something develops | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | respect | def | to think very highly of another person because of what they do | a feeling that someone is important and should be treated well | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | attempt | def | to try to do something challenging or difficult | an act of trying to do something, especially something difficult | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | direct | def | to tell someone to do something in a straight-talking way | going straight from one place to another without stopping; honest and clear | từ loại adj nhưng định nghĩa nghĩa động từ |
| ngsl.js | lack | def | to not have, or not have enough, of something | the state of not having something, or not having enough of it | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | review | def | to carefully look at the quality of something | a report that gives an opinion about a book, film, product, etc.; a careful check | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | mark | def | to make or leave a visible sign on something; a writing symbol | a small spot or line on a surface; a number or letter that shows how good a piece of work is | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | link | def | to join or connect together | a connection; a word or picture on a web page that takes you to another page | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | interview | def | to formally ask questions about a given topic | a formal meeting where someone is asked questions, for example for a job | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | supply | def | to give or sell goods to others for their use | an amount of something that is available to use | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | score | def | to get points in a sport such as kicking a ball into a goal | the number of points that a person or team gets in a game or test | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | file | def | to submit documents to an authority (e.g., city hall) | a set of information stored on a computer; a box or folder for keeping papers | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | bar | def | to prevent entry, exit, or an action | a place where people buy and drink drinks; a long, thin piece of metal or wood | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | advance | def | to move forward in a certain direction | progress or a new development in science, technology, etc. | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | advance | ex | Please book your tickets in advance. | Recent advances in medicine have helped people live longer. | ví dụ cũ dùng thành ngữ "in advance", không minh họa nghĩa "sự tiến bộ" |
| ngsl.js | reference | def | to cite a piece of research in speech or in writing | something such as a book that you look at to find information; a mention of something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | separate | def | to divide into parts, or to make something divide into parts | different and not connected; kept apart | từ loại adj nhưng định nghĩa nghĩa động từ |
| ngsl.js | anyway | def | a word people use to change the topic of a conversation | despite something; also used to change the subject of a conversation | định nghĩa không khớp ví dụ (nghĩa "dù sao") |
| ngsl.js | profit | def | to earn money from something | money that you make when you sell something for more than it cost | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | balance | def | to make two or more things equal | a state in which different things have the right amount of importance | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | exercise | def | to work out to become stronger and healthier | a task for practising a skill; physical activity to stay healthy | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | post | def | to send a letter or package using the post office | a message or picture shared online; (UK) letters and parcels sent by mail | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | object | def | to disagree; to protest against an idea or plan | a thing that you can see and touch; an aim or purpose | từ loại n nhưng định nghĩa nghĩa động từ (phản đối) |
| ngsl.js | ring | def | to produce a sound from a bell, alarm, or telephone; a piece of jewelry worn on a finger | a round piece of jewellery worn on a finger; the sound of a bell or phone | từ loại n nhưng định nghĩa bắt đầu bằng nghĩa động từ |
| ngsl.js | track | def | to follow behind someone to see what they are doing | a path or circle for running or racing; the rails a train runs on; a mark left by someone | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | judge | def | to form an opinion after careful consideration | a person who decides cases in a court of law; a person who decides the winner of a competition | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | judge | vi | thẩm phán; đánh giá | thẩm phán; giám khảo | ví dụ (giám khảo chấm điểm) không khớp nghĩa "đánh giá" (động từ) |
| ngsl.js | survey | def | to ask people a question about a particular topic | a set of questions that you ask many people to find out their opinions or habits | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | request | def | to ask for something | the act of politely asking for something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | exchange | def | to give things of similar value to each other | the act of giving something and receiving something else; a visit between groups, e.g. students | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | block | def | to stop from going forward or making progress | a solid piece of something; a large building divided into flats or offices | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | copy | def | to make something that looks the same as the original | something made to look exactly like something else; one example of a book, document, etc. | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | trial | def | concerning or used in a trial | a test of something new to see if it works; the process of examining a case in a court of law | định nghĩa vòng tròn ("used in a trial") |
| ngsl.js | stress | def | to be in a state of mental tension due to problems | a feeling of worry caused by difficult problems or too much work | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | sample | def | to try something to see if you like it (e.g., food) | a small amount of something that shows what the rest is like | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | appeal | def | to request a judge or others change a decision | a quality that makes something attractive; a serious request for help or money | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | flow | def | to move steadily and easily in a certain direction | a steady, continuous movement of liquid, air or people | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | software | def | market for software is expected to expand | programs and instructions that run on a computer | ô định nghĩa chứa nhầm một câu ("market for software is expected to expand") |
| ngsl.js | progress | def | to move forward or toward a place or goal | the process of improving or getting closer to a goal | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | suit | def | to be appropriate for a given situation | a jacket and trousers or skirt made from the same cloth | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | heat | def | to make hot or hotter | the quality of being hot; high temperature | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | guide | def | to lead people visiting a new or unknown place | a person whose job is to show a place to visitors; a book that gives information | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | grant | def | to give or let someone do what they want | money given by a government or organisation for a particular purpose, e.g. study | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | wave | def | to move your hand or arm to say hello or goodbye | a line of raised water moving across the sea; a sudden increase in something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | labor | def | to work hard (often physically) for many hours | work, especially physical work; workers as a group | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | contrast | def | to compare; to show clear, obvious differences | a clear difference between two or more things | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | conflict | def | to have opposite ideas; to disagree; to not match | a serious disagreement or fight between people or groups | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | shift | def | to change in position or direction | a period of work in a place that is open day and night; a change in position or direction | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | transport | def | to carry things from one place to another | a system of vehicles such as buses and trains for moving people or goods | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | reform | def | to improve society by removing abuse and injustices | a change made to a law or system to improve it | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | smoke | def | to breathe in through a cigarette and then blow it out | the grey or black gas that is produced when something burns | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | schedule | def | to arrange a time to do something with others | a plan that lists what will happen and when | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | pop | def | to cause something to open or burst suddenly | modern popular music with a strong beat and simple tunes; a short, sharp sound | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | desire | def | to wish for, hope, or want something | a strong feeling of wanting something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | aid | def | to provide things useful or needed by others | help such as money, food or medicine given to people in need | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | delay | def | to cause something to happen later than planned or expected | a period of time when you have to wait longer than expected | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | award | def | to give a prize for doing something well | a prize given to someone for doing something well | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | tape | def | to stick things together using an adhesive strip | a long narrow strip with glue on one side, used to stick things; a strip used to record sound | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | secure | def | to protect something from danger or harm, keep things safe | safe, firmly fixed or protected from danger | từ loại adj nhưng định nghĩa nghĩa động từ |
| ngsl.js | secure | vi | an toàn; giành được | an toàn, chắc chắn | "giành được" là nghĩa động từ, không khớp từ loại adj |
| ngsl.js | rank | def | to place someone or something in higher or lower position relative to others | a position in a group or organisation that shows how important someone is | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | rank | ex | The university ranks among the best in the region. | She was quickly promoted to the rank of captain. | ví dụ cũ dùng động từ "ranks", không khớp từ loại n |
| ngsl.js | abuse | def | to treat someone or something in a way that is cruel, harmful, or wrong | the wrong or harmful use of something; cruel treatment of a person or animal | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | rent | def | to pay money for the use of something | money that you pay regularly to live in or use a place that belongs to someone else | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | guarantee | def | to make a formal promise that something will happen or be done. | a written promise that a product will be repaired or replaced if it breaks | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | cast | def | to send, throw, or move something or someone in a direction | all the actors in a film, play or show | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | guard | def | to keep watch over something to protect it e.g., a bank | a person whose job is to protect a place or people | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | poll | def | to get information by asking many people questions about a particular subject | a survey in which people are asked their opinions about something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | protest | def | to express opposition through action or words | a public event where people show they strongly disagree with something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | command | def | to give an order; have control over others | an instruction to do something, given by someone in authority | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | joke | def | to say or do things that are meant to be funny | something you say or do to make people laugh | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | reward | def | to give something to someone because of their good work | something given to someone because they have done something good | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | remark | def | to say an opinion or make a comment about something | something that you say or write that gives an opinion | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | smell | def | to use your nose to sense something | the quality of something that you notice with your nose | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | crash | def | to hit something hard enough to cause serious damage | an accident in which a vehicle hits something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | highlight | pos | v | n | định nghĩa, ví dụ đều là danh từ ("the highlight of our trip"); awl.js đã có động từ |
| ngsl.js | highlight | vi | làm nổi bật | điểm nổi bật, phần hay nhất | khớp danh từ |
| ngsl.js | excuse | def | to give a reason to explain why you did something | a reason you give to explain why you did something wrong | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | trace | def | to find, describe or discover by investigation | a sign or mark that shows that someone or something has been somewhere | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | crack | def | to almost break something | a thin line on the surface of something where it is starting to break | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | input | def | to put in information, advice, or opinions | ideas, advice or work that you give to help a project; information put into a computer | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | anger | def | to make someone mad, upset, or annoyed | a strong feeling of being upset or annoyed | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | harm | def | to hurt, damage, or cause problems | physical or other damage | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | strip | def | to take something away from (someone) | a long, narrow piece of paper, cloth, land, etc. | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | sponsor | def | to help someone or something succeed by giving them money | a company or person that pays for an event or activity, often to advertise | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl.js | stroke | def | to touch someone or something repeatedly in a caring way | a sudden illness when blood cannot reach part of the brain; a hit or movement | từ loại n nhưng định nghĩa nghĩa động từ (vuốt ve) |
| ngsl.js | pump | def | to make water or any other liquid move using a machine | a machine that pushes liquid or air into or out of something | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl2.js | boom | def | to make a deep hollow resonant sound | a sudden period of fast growth or success | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl2.js | craft | def | to make by hand and with much skill | the skill of making things by hand; an object made this way | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl2.js | trick | def | to make someone believe something that is not true | a clever action to entertain people or to deceive someone | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl2.js | cluster | def | to come together to form a group of people, animals, or things | a group of similar things that are close together | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl2.js | stain | def | to mark or change the color of something so it looks dirty | a dirty mark on something that is difficult to remove | từ loại n nhưng định nghĩa nghĩa động từ |
| ngsl2.js | gaze | def | a long continuous look at someone or something | to look at someone or something for a long time | từ loại v nhưng định nghĩa danh từ |
| ngsl2.js | solar | def | to do with the sun, like sunlight or the heat from the sun | relating to the sun or using its energy | định nghĩa dạng "to do with" dễ đọc nhầm là động từ |
| tsl-a.js | leak | def | to let liquid or gas escape through a hole | a small hole or crack that lets liquid or gas escape | từ loại n nhưng định nghĩa nghĩa động từ |
| tsl-a.js | conditioner | def | a device or product that improves something; short for air conditioner | a liquid you put on your hair after washing it; short for air conditioner | định nghĩa mơ hồ, sai trọng tâm |
| tsl-a.js | conditioner | vi | máy điều hòa, dầu xả | dầu xả; máy điều hòa | thứ tự nghĩa theo định nghĩa |
| tsl-a.js | notify | ipa | /ˈnoʊtɪfaɪ/ | /ˈnəʊtɪfaɪ/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| tsl-a.js | coworker | ipa | /ˌkəʊˈwɜːkər/ | /ˈkəʊwɜːkə/ | /r/ cuối kiểu Mỹ; trọng âm đầu |
| tsl-a.js | poster | ipa | /ˈpoʊstə/ | /ˈpəʊstə/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| tsl-a.js | showroom | ipa | /ˈʃoʊˌrum/ | /ˈʃəʊruːm/ | IPA Mỹ (/oʊ/, /u/) trong ô giọng Anh |
| tsl-a.js | postcard | ipa | /ˈpoʊstˌkɑrd/ | /ˈpəʊstkɑːd/ | IPA Mỹ (/oʊ/, /ɑr/) trong ô giọng Anh |
| tsl-a.js | realtor | ipa | /ˈriəltər/ | /ˈriːəltə/ | /r/ cuối kiểu Mỹ trong ô giọng Anh |
| tsl-a.js | spokesperson | ipa | /ˈspəʊkspɜːrsən/ | /ˈspəʊkspɜːsn/ | /ɜːr/ kiểu Mỹ trong ô giọng Anh |
| tsl-a.js | turnover | ipa | /ˈtɜːnoʊvə/ | /ˈtɜːnəʊvə/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| tsl-b.js | yoga | ipa | /ˈjoʊɡə/ | /ˈjəʊɡə/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| tsl-b.js | founder | ipa | /ˈfaʊndər/ | /ˈfaʊndə/ | /r/ cuối kiểu Mỹ trong ô giọng Anh |
| tsl-b.js | toner | ipa | /ˈtoʊnə/ | /ˈtəʊnə/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| tsl-b.js | homeless | ipa | /ˈhoʊmlɪs/ | /ˈhəʊmləs/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| tsl-b.js | hardworking | ipa | /ˈhɑːrdˌwɜːrkɪŋ/ | /ˌhɑːdˈwɜːkɪŋ/ | /ɑːr/, /ɜːr/ kiểu Mỹ trong ô giọng Anh |
| bsl.js | outsider | ipa | /ˌaʊtˈsaɪdər/ | /ˌaʊtˈsaɪdə/ | /r/ cuối kiểu Mỹ trong ô giọng Anh |
| bsl.js | slowdown | ipa | /ˈsloʊˌdaʊn/ | /ˈsləʊdaʊn/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| bsl.js | macroeconomics | ipa | /ˌmækroʊˌiːkəˈnɒmɪks/ | /ˌmækrəʊˌiːkəˈnɒmɪks/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| bsl.js | loser | ipa | /luːzə(r)/ | /ˈluːzə/ | thiếu dấu trọng âm |
| bsl.js | protester | ipa | /prəˈtestər/ | /prəˈtestə/ | /r/ cuối kiểu Mỹ trong ô giọng Anh |
| bsl.js | openly | ipa | /ˈoʊpənli/ | /ˈəʊpənli/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| nawl.js | socially | ipa | /ˈsoʊʃəli/ | /ˈsəʊʃəli/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| nawl.js | genetically | ipa | /d͡ʒəˈneɾɪkli/ | /dʒəˈnetɪkli/ | IPA Mỹ (âm vỗ /ɾ/, d͡ʒ) trong ô giọng Anh |
| nawl.js | rotation | ipa | /roʊˈteɪʃən/ | /rəʊˈteɪʃn/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| nawl.js | socialize | ipa | /ˈsoʊʃəlaɪz/ | /ˈsəʊʃəlaɪz/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| nawl.js | notation | ipa | /noʊˈteɪʃən/ | /nəʊˈteɪʃn/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-a.js | turnover | ipa | /ˈtɜːnoʊvə/ | /ˈtɜːnəʊvə/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-a.js | wholesale | ipa | /ˈhoʊlseɪl/ | /ˈhəʊlseɪl/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-a.js | thermodynamics | ipa | /ˌθɜːmoʊdaɪˈnæmɪks/ | /ˌθɜːməʊdaɪˈnæmɪks/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-a.js | prosecutor | ipa | /ˈprɑsəˌkjuːˌtər/ | /ˈprɒsɪkjuːtə/ | IPA Mỹ (/ɑ/, /r/ cuối) trong ô giọng Anh |
| domain-a.js | notary | ipa | /ˈnoʊtəri/ | /ˈnəʊtəri/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-b.js | spokesperson | ipa | /ˈspəʊkspɜːrsən/ | /ˈspəʊkspɜːsn/ | /ɜːr/ kiểu Mỹ trong ô giọng Anh |
| domain-b.js | Net Promoter Score | ipa | /net prəˈmoʊtə skɔː/ | /net prəˈməʊtə skɔː/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-b.js | biodegradable | ipa | /ˌbaɪoʊdəˈɡreɪdəbl/ | /ˌbaɪəʊdɪˈɡreɪdəbl/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-b.js | no-show | ipa | /ˈnoʊ ˌʃoʊ/ | /ˌnəʊ ˈʃəʊ/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-b.js | homestay | ipa | /ˈhoʊmˌsteɪ/ | /ˈhəʊmsteɪ/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-b.js | invigilator | ipa | /ɪnˈvɪdʒɪleɪtər/ | /ɪnˈvɪdʒɪleɪtə/ | /r/ cuối kiểu Mỹ trong ô giọng Anh |
| domain-b.js | notify party | ipa | /ˈnoʊtɪfaɪ ˈpɑːti/ | /ˈnəʊtɪfaɪ ˈpɑːti/ | IPA Mỹ /oʊ/ trong ô giọng Anh |
| domain-b.js | backorder | ipa | /ˈbækˌordər/ | /ˈbækɔːdə/ | IPA Mỹ (/or/, /ər/) trong ô giọng Anh |
| ngsl.js | number | ipa | /ˈnʌmbər/ | /ˈnʌmbə(r)/ | /r/ cuối kiểu Mỹ trong ô giọng Anh (từ A1) |

## Gói nghĩa 13 ngôn ngữ

Toàn bộ 50 từ × 13 ngôn ngữ nằm ở `content/wordlists/core.gloss.json` (bản cũ = dịch máy trong `web/packs/<lang>.json`, xem diff của commit).

## Lượt 2 (20/10/2026)

| Loại sửa | Số | Ví dụ (trước → sau) |
|---|---|---|
| Định nghĩa NGSL bộ 3–10 sai nghĩa hiếm/sai từ loại/lủng củng (đọc tay toàn bộ ~2.250 mục) | 176 từ (ngsl.js 155, ngsl2.js 21) | firm n "fairly hard or solid" → "a business or company"; patient n "not getting annoyed…" → "a person who is receiving medical treatment"; star "a bright planet of gas" → "a large ball of burning gas in space…; a famous performer"; miss "too late to ride on something" → "to feel sad because someone… is not there; to fail to catch, hit or see"; fan "thing you wave…" → "a person who likes a sport, team… ; a machine that moves air"; whereas "taking into consideration the fact that" → "used to compare two facts…"; hence "from now" → "for this reason; therefore"; submit "accept a superior force" → "to give a document… so that they can consider it"; monthly "occurring twelve times a year" → "happening… once a month"; capital n "main, or major" → "the city where a country's government is; money…"; television "device that broadcasts" → "equipment with a screen that shows programmes" |
| Nghĩa Việt lệch từ loại (bộ 3–10) | 10 | fit v "vừa vặn; khỏe mạnh" → "vừa vặn, vừa với"; patient n bỏ "kiên nhẫn"; firm n bỏ "chắc chắn"; pretty adv bỏ "xinh đẹp"; stick v bỏ "cây gậy"; monitor v bỏ "màn hình"; fat adj bỏ "chất béo" |
| Ví dụ minh họa sai từ loại | 3 | variable n ("very variable" là tính từ) → "Temperature is an important variable…"; interior adj ("The interior of…" là danh từ); fat adj ("low in fat" là danh từ) |
| IPA còn thiếu – thêm cả giọng Anh (ô 2) và giọng Mỹ (ô 11 mới `ipaUS`) | 248 từ/cụm (254 dòng): domain-a 40, domain-b 85, office 27, skills 27, tsl-a 25, tsl-b 42, ngsl 8 | "I hope this email finds you well" /aɪ ˌhəʊp ðɪs ˈiːmeɪl ˌfaɪndz ju ˈwel/ · US /…ˌhoʊp…/; force majeure /ˌfɔːs mæˈʒɜː/ · /ˌfɔːrs mæˈʒɜːr/; chance /tʃɑːns/ · /tʃæns/; viết tắt đọc từng chữ (API /ˌeɪ piː ˈaɪ/, DNA, B2B), MOOC /muːk/. Quy ước: UK không r cuối, əʊ, ɒ; US r, oʊ, ɑː. Không còn mục nào thiếu IPA. `data.js` đọc `r[10]` → `ipaUS` (app hiện 🇬🇧/🇺🇸 khi khác). |
| IPA NAWL/BSL còn dấu nối t͡ʃ/d͡ʒ (file sinh trước khi gen-wordlist chuẩn hóa) | 79 (nawl 38, bsl 41) | /ˈd͡ʒen(ə)rəlaɪz/ → /ˈdʒen(ə)rəlaɪz/ – sinh lại bằng `gen-wordlist.mjs <id> --max 0` |
| Cấp độ CEFR theo danh sách công khai Oxford 3000/5000 (khớp từ + từ loại) | 2.081 dòng: ngsl 817, ngsl2 98, bsl 243, awl 233, tsl-a 218, tsl-b 184, nawl 76, exam-vocab* 102, topics-more 49, data.js 33, skills 16, office 12 | B1→B2 383 (promotion, income, register); B1→A2 376 (pollution, device, colleague, salary); B2→C1 340 (tuition, literacy, heritage); B1→C1 261 (coalition, breach); A2→A1 196 (area, create, project); C1→B2 179 (entrepreneur, infrastructure); NAWL gán cứng C1 cho mọi từ → snake/dictionary/classroom C1→A1, clever/monkey/pronounce C1→A2. Không đổi: bộ chuyên ngành domain-a/b (nghĩa chuyên môn, vd. bill "dự luật", party "bên"), 16 mục lệch từ loại so với Oxford, từ ngoài Oxford 5000. `gen-wordlist.mjs` nay đọc `content/wordlists/cefr-oxford.json` (1.116 từ NAWL/BSL) nên lần sinh sau giữ cấp mới (đã kiểm: sinh lại khớp 100% cấp độ). |
| Bảng nghĩa viết tay 13 ngôn ngữ (`core.gloss.json`) | 50 → 181 từ (+131 × 13 = 1.703 nghĩa) | Dịch máy sai từ loại/nghĩa đã thay: hope/promise/trust v → "esperanza/promesa/confianza" (danh từ); bear → "oso/クマ/熊" (con gấu); may → "mayo/Mai" (tháng 5); cross → "cruz/十字/Kreuz"; tie → "corbata/ネクタイ"; over → "終わった/结束/vorbei" (đã xong); fair → "feria" (hội chợ); lead → "plomo/铅" (chì); rather (zh) → "相反"; race (zh) → "种族"; break (ja/de) → "休憩/Pause"; net (es) → "neto"; dear (de) → "Liebling"; own (de/zh) → động từ "besitzen/拥有"; sure (zh/ru) → "当然/конечно". Mỗi từ ghi 1–3 nghĩa đúng từ loại của mục từ trong app; gói `web/packs/*.json` đổi đúng 131 khóa/ngôn ngữ. |

Nguồn cấp độ: oxfordlearnersdictionaries.com/wordlists/oxford3000-5000 (chỉ dùng cấp độ công khai theo từ + từ loại; không chép định nghĩa). Kiểm: smoke "ERRORS none", tsc, vi-lint, i18n-missing/i18n-qa --strict, unit, content-check, size-budget (web/js 17,8/18,2 MB).

## Còn lại

- ~6.200 mục/ngôn ngữ trong gói nghĩa vẫn là dịch máy từ trần (chưa tinh chỉnh); CI `word-packs.yml` tinh chỉnh 450 từ/đêm, nay ưu tiên bộ cốt lõi. Gói vẫn khóa theo TỪ (không theo nghĩa) → từ đa nghĩa chuyên ngành (bill "dự luật", party "bên") hiện nghĩa thông dụng.
- ~~IPA thiếu; CEFR chưa đối chiếu Oxford; định nghĩa ngsl3–10~~ → xong ở Lượt 2. Còn: `ipaUS` mới có cho 254 mục bổ sung (mục cũ lấy giọng Mỹ lúc tra từ điển); định nghĩa các bộ ngoài NGSL (tsl, awl, exam-vocab) chưa đọc tay toàn bộ; từ chuyên ngành ngoài Oxford 5000 giữ cấp độ biên soạn.
- Bảng nghĩa tay mới 181 từ; còn ~120 từ A1–A2 đa nghĩa nên viết tay tiếp (vd. power, account, board, course, company) – soát gói bằng cách so nghĩa với từ loại của mục.
