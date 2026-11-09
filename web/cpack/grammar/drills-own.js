/* ✍️ Nhiệm vụ TỰ ĐẶT CÂU cuối bài (drill t: 'own') – đầu ra tự do theo Swain 1985 (docs/specs/learnability.md tiêu chí j).
 * Người học viết câu thật về bản thân; grammar.js chấm bằng mẫu nhận diện cấu trúc của bài (GRAMMAR_CHECK, grammar/check.js) + VBStruct,
 * sai thì hiện công thức + gợi ý (hint) + câu mẫu (a[0]). a = câu mẫu (test learnability.mjs: mọi câu mẫu phải khớp GRAMMAR_CHECK của bài). */
(function (g) {
const OWN = {
// Chương nền A1 (starter.js)
'be-am-is-are': [
{ t: 'own', q: "Introduce yourself: your name, age and where you are from.", hint: "I am … I'm from …", a: ["I am Lan and I am twenty years old.", "I'm from Da Nang."], ex: "Chủ ngữ I đi với am (I am, I'm) → I am Lan; he/she/it đi với is, you/we/they đi với are." },
{ t: 'own', q: "Describe a friend or a family member.", hint: "My friend is … He/She is …", a: ["My friend is very funny.", "My parents are teachers."], ex: "Một người (my friend) dùng is, hai người trở lên (my parents) dùng are → My parents are teachers." },
],
'a-an-plurals': [
{ t: 'own', q: "Write about one thing and many things in your bag.", hint: "I have a/an … and two …", a: ["I have an apple and two books in my bag.", "There is a pen and three pencils in my bag."], ex: "Dùng an trước âm nguyên âm (an apple), a trước phụ âm (a pen); số nhiều thêm -s → two books." },
{ t: 'own', q: "Write about the people in your family.", hint: "I have two brothers / many cousins …", a: ["I have two brothers and a sister.", "I have many cousins in Hanoi."], ex: "Sau two/many dùng danh từ số nhiều (brothers, cousins); một người dùng a + danh từ số ít → a sister." },
],
'prepositions-time-place-basic': [
{ t: 'own', q: "When do you get up and go to school or work?", hint: "I get up at … on weekdays.", a: ["I get up at 6:30 on weekdays.", "I go to work at 8 in the morning."], ex: "Giờ cụ thể dùng at (at 6:30), thứ dùng on (on weekdays), buổi dùng in → in the morning." },
{ t: 'own', q: "Where is your phone or your bag now?", hint: "My phone is on/in/under the …", a: ["My phone is on the table.", "My bag is next to my desk."], ex: "Vị trí dùng on (trên mặt), in (bên trong), under (bên dưới), next to (bên cạnh) + the/my + danh từ → on the table." },
],
'present-simple': [
{ t: 'own', q: "Write one true sentence about your daily routine.", hint: "I usually … every morning.", a: ["I usually drink tea every morning.", "My mother walks to work every day."], ex: "Thói quen hằng ngày dùng hiện tại đơn: I/you/we/they + V, he/she/it + V-s/es (walks, watches)." },
{ t: 'own', q: "Write a fact about your city or country.", hint: "It rains a lot in …", a: ["It rains a lot in my city in summer.", "Rice grows well in the Mekong Delta."], ex: "Sự thật chung về nơi bạn sống dùng hiện tại đơn; chủ ngữ số ít thì động từ thêm -s/es." },
],
'present-continuous': [
{ t: 'own', q: "What are you doing at the moment? Write one sentence.", hint: "I am … right now.", a: ["I am studying English right now.", "I am sitting on the bus at the moment."], ex: "Việc đang diễn ra lúc nói dùng am/is/are + V-ing (I am studying, she is reading)." },
{ t: 'own', q: "Describe a change that is happening in your life these days.", hint: "These days I am …", a: ["These days I am learning to cook.", "My little brother is growing very fast this year."], ex: "Việc tạm thời, đang thay đổi quanh thời điểm hiện tại cũng dùng am/is/are + V-ing." },
],
'present-perfect': [
{ t: 'own', q: "Write about something you have never done.", hint: "I have never …", a: ["I have never seen snow.", "I have never eaten sushi."], ex: "Trải nghiệm trong đời (không nói thời điểm) dùng have/has + V3; never đứng giữa have và V3." },
{ t: 'own', q: "How long have you lived in your home? Use for or since.", hint: "I have lived here for/since …", a: ["I have lived in this house since 2015.", "We have lived here for ten years."], ex: "Việc bắt đầu trong quá khứ và vẫn còn đến nay dùng have/has + V3 với for (khoảng) hoặc since (mốc)." },
],
'present-perfect-continuous': [
{ t: 'own', q: "Write about an activity you started in the past and are still doing.", hint: "I have been … for …", a: ["I have been learning English for three years.", "I have been working at this company since 2020."], ex: "Hành động kéo dài từ quá khứ đến hiện tại, nhấn mạnh quá trình, dùng have/has been + V-ing." },
{ t: 'own', q: "Explain why you are tired, hungry or happy today.", hint: "I'm tired because I have been …", a: ["I'm tired because I have been studying all day.", "My eyes hurt because I have been looking at a screen for hours."], ex: "Giải thích kết quả hiện tại bằng một quá trình vừa diễn ra → have/has been + V-ing." },
],
'past-simple': [
{ t: 'own', q: "What did you do last weekend? Write one sentence.", hint: "Last weekend I …", a: ["Last weekend I visited my grandparents.", "I watched a film with my friends last Saturday."], ex: "Việc đã xong ở thời điểm xác định trong quá khứ (last weekend, yesterday) dùng quá khứ đơn V2/V-ed." },
{ t: 'own', q: "Write about a special day from your childhood.", hint: "When I was a child, I …", a: ["When I was ten, I won a drawing competition.", "I went to the beach for the first time in 2010."], ex: "Kể chuyện đã kết thúc trong quá khứ dùng V2/V-ed; nhớ động từ bất quy tắc (win → won, go → went)." },
],
'past-continuous': [
{ t: 'own', q: "What were you doing at eight o'clock last night?", hint: "At 8 pm last night I was …", a: ["At eight o'clock last night I was cooking dinner.", "I was watching TV at eight last night."], ex: "Việc đang diễn ra tại một thời điểm trong quá khứ dùng was/were + V-ing." },
{ t: 'own', q: "Write about something that happened while you were doing something else.", hint: "I was … when …", a: ["I was walking home when it started to rain.", "While I was reading, my phone rang."], ex: "Hành động dài đang diễn ra dùng was/were + V-ing; hành động ngắn xen vào dùng quá khứ đơn." },
],
'past-perfect': [
{ t: 'own', q: "Write about a time you arrived somewhere too late.", hint: "When I arrived, the … had already …", a: ["When I arrived at the station, the train had already left.", "The film had started before we got to the cinema."], ex: "Việc xảy ra trước một việc khác trong quá khứ dùng had + V3; việc sau dùng quá khứ đơn." },
{ t: 'own', q: "Write about something you had never done before a certain year.", hint: "Before …, I had never …", a: ["Before 2020, I had never travelled by plane.", "I had never cooked a meal before I moved out."], ex: "Trải nghiệm tính đến một mốc trong quá khứ dùng had (never) + V3." },
],
'past-perfect-continuous': [
{ t: 'own', q: "Write about something you had been doing for a long time before a change happened.", hint: "I had been … for … before …", a: ["I had been working there for five years before I changed jobs.", "We had been waiting for an hour when the bus finally came."], ex: "Quá trình kéo dài đến trước một mốc trong quá khứ dùng had been + V-ing." },
],
'future-forms': [
{ t: 'own', q: "What are your plans for next weekend?", hint: "Next weekend I'm going to …", a: ["Next weekend I am going to visit my aunt.", "I'm meeting my friends on Saturday evening."], ex: "Kế hoạch đã định dùng be going to + V; lịch hẹn cụ thể dùng hiện tại tiếp diễn (I'm meeting…)." },
{ t: 'own', q: "Make a prediction about your life in ten years.", hint: "In ten years I think I will …", a: ["In ten years I think I will live in a big city.", "I think robots will do most housework in the future."], ex: "Dự đoán hoặc ý kiến về tương lai (I think…) dùng will + V nguyên mẫu." },
],
'future-continuous-perfect': [
{ t: 'own', q: "What will you be doing at this time tomorrow?", hint: "At this time tomorrow I will be …", a: ["At this time tomorrow I will be sitting in class.", "This time next week I will be travelling to Da Nang."], ex: "Việc đang diễn ra tại một thời điểm trong tương lai dùng will be + V-ing." },
{ t: 'own', q: "What will you have finished by the end of this year?", hint: "By the end of this year I will have …", a: ["By the end of this year I will have finished my degree.", "By December I will have saved enough money for a laptop."], ex: "Việc sẽ hoàn thành trước một mốc tương lai (by + mốc) dùng will have + V3." },
],
'used-to-would': [
{ t: 'own', q: "Write about a habit you had as a child but don't have now.", hint: "I used to … when I was young.", a: ["I used to play football every afternoon when I was young.", "My father used to smoke, but he stopped."], ex: "Thói quen trong quá khứ nay không còn dùng used to + V nguyên mẫu." },
{ t: 'own', q: "Write about something that was difficult at first but is normal for you now.", hint: "I'm used to … now.", a: ["I am used to getting up early now.", "I got used to living alone after a few months."], ex: "Đã quen với việc gì dùng be/get used to + V-ing (khác used to + V)." },
],
'stative-dynamic': [
{ t: 'own', q: "Write about something you own or know well.", hint: "I own … / I know …", a: ["I own an old bicycle.", "I know my neighbours very well."], ex: "Động từ trạng thái (own, know, believe, like) dùng thì đơn, không dùng V-ing: I know, không I am knowing." },
{ t: 'own', q: "Write about what you think of your favourite food.", hint: "I love … because it tastes …", a: ["I love pho because it tastes fresh.", "I prefer tea because coffee seems too strong for me."], ex: "love, prefer, taste (có vị), seem là động từ trạng thái nên dùng hiện tại đơn." },
],
'tenses-ielts': [
{ t: 'own', q: "Describe a change in your town: one past fact and one prediction.", hint: "In 2010 … ; by 2030 it is expected to …", a: ["In 2010 my town had only one school, and the number is expected to rise to five by 2030.", "The population has grown since 2015 and will probably keep rising."], ex: "Số liệu đã qua dùng quá khứ đơn; xu hướng đến nay dùng hiện tại hoàn thành; dự đoán dùng will/is expected to." },
],
'modals-ability-permission': [
{ t: 'own', q: "Write about something you can do well and something you couldn't do as a child.", hint: "I can … but when I was five I couldn't …", a: ["I can swim well, but when I was five I couldn't.", "I can speak a little English."], ex: "Khả năng ở hiện tại dùng can + V; khả năng trong quá khứ dùng could/couldn't + V." },
{ t: 'own', q: "Write about a rule at your school or workplace.", hint: "We are (not) allowed to …", a: ["We are not allowed to use phones in class.", "Students may leave early on Fridays."], ex: "Sự cho phép dùng may + V hoặc be (not) allowed to + V." },
],
'modals-obligation-advice': [
{ t: 'own', q: "Give advice to a friend who wants to learn English.", hint: "You should …", a: ["You should watch films in English every day.", "You ought to practise speaking with a partner."], ex: "Lời khuyên dùng should/ought to + V nguyên mẫu." },
{ t: 'own', q: "Write about one thing you have to do and one thing you don't have to do this week.", hint: "I have to … but I don't have to …", a: ["I have to finish a report, but I don't have to work on Sunday.", "Students must wear a uniform at my school."], ex: "Bắt buộc dùng must/have to; không cần thiết dùng don't have to (khác mustn't = cấm)." },
],
'modals-deduction': [
{ t: 'own', q: "Your friend didn't answer your messages yesterday. Guess why.", hint: "She must have … / She might have …", a: ["She might have been busy at work.", "He must have forgotten his phone at home."], ex: "Suy đoán về quá khứ dùng must/might/can't + have + V3 (chắc chắn → có thể → không thể)." },
],
'passive-voice': [
{ t: 'own', q: "Write about something that is made or grown in your country.", hint: "… is grown/made in …", a: ["Coffee is grown in the Central Highlands.", "Many phones are made in Vietnam."], ex: "Bị động dùng be + V3 khi người làm không quan trọng: Coffee is grown…" },
{ t: 'own', q: "Write about a famous building or book and who made it.", hint: "… was built/written by …", a: ["The One Pillar Pagoda was built in 1049.", "Harry Potter was written by J. K. Rowling."], ex: "Bị động quá khứ dùng was/were + V3; người thực hiện đi sau by." },
],
'passive-reporting-causative': [
{ t: 'own', q: "Write about a service you pay someone to do for you.", hint: "I have my … cut/repaired …", a: ["I have my hair cut every month.", "We got our car repaired last week."], ex: "Nhờ/thuê người khác làm dùng have/get + sth + V3 (cấu trúc sai khiến)." },
],
'conditionals-0-1': [
{ t: 'own', q: "What will you do if it rains this weekend?", hint: "If it rains, I will …", a: ["If it rains this weekend, I will stay at home.", "If I have time tomorrow, I will call my grandmother."], ex: "Điều kiện có thể xảy ra → If + hiện tại đơn, S + will + V." },
{ t: 'own', q: "Write a general truth about your body or nature.", hint: "If you … , you …", a: ["If I drink coffee at night, I can't sleep.", "If you heat ice, it melts."], ex: "Sự thật luôn đúng (câu điều kiện 0) → If + hiện tại đơn, hiện tại đơn." },
],
'conditionals-2-3': [
{ t: 'own', q: "What would you do if you had a lot of money?", hint: "If I had …, I would …", a: ["If I had a lot of money, I would travel around the world.", "If I were rich, I would buy a house for my parents."], ex: "Giả định không có thật ở hiện tại → If + V2 (were), S + would + V." },
{ t: 'own', q: "Write about a past mistake and a different result.", hint: "If I had …, I would have …", a: ["If I had studied harder, I would have passed the exam.", "If we had left earlier, we would have caught the train."], ex: "Giả định trái với quá khứ → If + had + V3, S + would have + V3." },
],
'mixed-conditionals-wish': [
{ t: 'own', q: "Write a wish about your present life.", hint: "I wish I …", a: ["I wish I had more free time.", "I wish I could speak French."], ex: "Ước điều trái với hiện tại → I wish + V2/could + V (lùi một thì)." },
],
'reported-speech': [
{ t: 'own', q: "Report something a teacher or friend told you recently.", hint: "My teacher said that …", a: ["My teacher said that the test would be difficult.", "My friend told me that she was moving to Hanoi."], ex: "Câu tường thuật: said/told sb (that) + lùi thì (will → would, is → was)." },
{ t: 'own', q: "Report a question someone asked you.", hint: "He asked me if …", a: ["My boss asked me if I could work on Saturday.", "She asked me where I lived."], ex: "Tường thuật câu hỏi → asked (me) if/whether hoặc từ để hỏi + S + V (không đảo trợ động từ)." },
],
'gerund-infinitive': [
{ t: 'own', q: "Write about an activity you enjoy and one you avoid.", hint: "I enjoy … but I avoid …", a: ["I enjoy reading but I avoid watching horror films.", "My sister enjoys cooking for the family."], ex: "Dùng enjoy, avoid, finish, mind + V-ing." },
{ t: 'own', q: "Write about something you have decided or want to do this year.", hint: "I want to … / I've decided to …", a: ["I want to learn the guitar this year.", "I have decided to save more money."], ex: "Dùng want, decide, hope, plan + to + V nguyên mẫu." },
],
'articles': [
{ t: 'own', q: "Describe one thing in your bedroom.", hint: "There is a … The … is …", a: ["There is a desk in my bedroom, and the desk is next to the window.", "I have an old guitar on the wall."], ex: "Nhắc lần đầu dùng a/an; nhắc lại vật đã biết dùng the. an trước âm nguyên âm (an old guitar)." },
{ t: 'own', q: "Write about your favourite place in your town.", hint: "My favourite place is the …", a: ["My favourite place is the park near my house.", "I often go to the market in the morning."], ex: "Dùng the khi người nghe biết rõ đó là nơi nào (the park near my house)." },
],
'countable-uncountable': [
{ t: 'own', q: "Write about what is in your fridge now.", hint: "There is a little … and a few …", a: ["There is a little milk and a few eggs in my fridge.", "I don't have much food at home."], ex: "Dùng a little/much + danh từ không đếm được (milk, food); a few/many + danh từ đếm được số nhiều (eggs)." },
{ t: 'own', q: "Write about how many friends or how much free time you have.", hint: "I have many … / I don't have much …", a: ["I have many friends at school.", "I don't have much free time on weekdays."], ex: "Dùng many + danh từ số nhiều (friends); much + danh từ không đếm được (time), thường trong câu phủ định." },
],
'adjectives-adverbs': [
{ t: 'own', q: "Describe how someone in your family does something.", hint: "My … drives/speaks/cooks …ly.", a: ["My father drives carefully.", "My mother speaks quickly when she is angry."], ex: "Trạng từ (-ly) bổ nghĩa cho động từ nên nói drives carefully, không nói drives careful." },
{ t: 'own', q: "Describe your best friend with an adjective and an adverb.", hint: "He is a … person and he … ly.", a: ["She is a quiet person and she works hard.", "He is a good singer and he sings beautifully."], ex: "Tính từ đứng trước danh từ (a quiet person); trạng từ đứng sau động từ khi bổ nghĩa cho hành động (sings beautifully)." },
],
'comparatives-superlatives': [
{ t: 'own', q: "Compare two cities, foods or seasons you know.", hint: "… is bigger/more … than …", a: ["Hanoi is colder than Ho Chi Minh City in winter.", "Summer is more tiring than spring for me."], ex: "So sánh hơn → tính từ ngắn + -er + than; tính từ dài: more + adj + than." },
{ t: 'own', q: "Write about the best or most interesting thing you have ever done.", hint: "The best … I have ever …", a: ["The best trip I have ever taken was to Ha Long Bay.", "This is the most interesting book I have read this year."], ex: "So sánh nhất → the + adj-est / the most + adj, thường đi với I have ever + V3." },
],
'prepositions': [
{ t: 'own', q: "Write about when and where you were born.", hint: "I was born in/on … in …", a: ["I was born on 5 May in a small town.", "My brother was born in 2008 in Hue."], ex: "Dùng on + ngày cụ thể, in + năm/tháng/thành phố, at + giờ hoặc địa điểm cụ thể." },
{ t: 'own', q: "Write about something you do at a certain time each day.", hint: "I … at … o'clock in the …", a: ["I have lunch at noon in the canteen.", "We usually meet at the café on Sunday mornings."], ex: "Dùng at + giờ (at noon), on + ngày trong tuần (on Sunday mornings), in + buổi (in the morning)." },
],
'subject-verb-agreement': [
{ t: 'own', q: "Write about everyone or each person in your class or family.", hint: "Everyone in my … has/likes …", a: ["Everyone in my family likes noodles.", "Each student in my class has a laptop."], ex: "Dùng everyone, each, every + động từ số ít (likes, has)." },
{ t: 'own', q: "Write about the number of people who do something in your town.", hint: "The number of … is …", a: ["The number of cars in my city is growing quickly.", "A number of my friends are studying abroad."], ex: "Dùng the number of + N số nhiều + V số ít (is growing); a number of + N + V số nhiều (are)." },
],
'relative-clauses': [
{ t: 'own', q: "Describe a person who is important to you.", hint: "… is a person who …", a: ["My grandmother is a person who always helps others.", "I have a friend who lives in Japan."], ex: "Mệnh đề quan hệ chỉ người dùng who; chỉ vật dùng which/that." },
{ t: 'own', q: "Describe a place that you like to visit.", hint: "… is a place where …", a: ["Da Lat is a place where I can relax.", "The library is the place which I visit most often."], ex: "Chỉ nơi chốn dùng where + mệnh đề đủ (S + V); which/that khi đóng vai tân ngữ." },
],
'noun-clauses': [
{ t: 'own', q: "Write about something you don't know or wonder about.", hint: "I wonder whether/what …", a: ["I wonder whether I will pass the exam.", "I don't know what my brother wants for his birthday."], ex: "Mệnh đề danh từ → know/wonder + what/whether/how + S + V (trật tự câu khẳng định)." },
],
'adverbial-clauses': [
{ t: 'own', q: "Write about what you do when you feel stressed.", hint: "When I feel stressed, I …", a: ["When I feel stressed, I listen to music.", "Because I live far from school, I get up early."], ex: "Mệnh đề trạng ngữ (When/Because/Although + mệnh đề) đứng trước thì có dấu phẩy." },
{ t: 'own', q: "Write about something you do even though it is difficult.", hint: "Although …, I …", a: ["Although I am busy, I always find time to exercise.", "Although English is hard, I enjoy learning it."], ex: "Although + mệnh đề, mệnh đề chính: nêu hai ý tương phản, không dùng thêm but." },
],
'complex-sentences': [
{ t: 'own', q: "Write one long sentence about your city, with two linked clauses.", hint: "Although …, …, which …", a: ["Although my city is crowded, it has many parks, which makes it pleasant to live in.", "Although I moved here last year, I still don't know anyone who speaks English."], ex: "Câu phức Band 7+ → kết hợp ≥ 2 mệnh đề phụ (although…, which…/who…) để thể hiện đa dạng ngữ pháp." },
],
'inversion-cleft': [
{ t: 'own', q: "Write about a rare experience using an inversion.", hint: "Never have I … / Rarely do I …", a: ["Never have I seen such a beautiful sunset.", "Rarely do I eat breakfast on weekdays."], ex: "Đảo ngữ → Never/Rarely/Seldom + trợ động từ + S + V để nhấn mạnh." },
],
'parts-of-speech-patterns': [
{ t: 'own', q: "Describe something you can see now with a determiner, adjective and noun.", hint: "I can see a really beautiful …", a: ["I can see a really beautiful tree from my window.", "There is a comfortable chair in my room."], ex: "Trật tự cụm danh từ → từ hạn định (a/the/my) + (trạng từ) + tính từ + danh từ." },
{ t: 'own', q: "Write about your favourite thing to wear.", hint: "I have a really expensive/useful …", a: ["I have a really expensive jacket.", "I always wear a comfortable pair of jeans."], ex: "Tính từ (thường có đuôi -ful, -ive, -able) đứng trước danh từ; trạng từ chỉ mức độ (very, really) đứng trước tính từ nên nói a really expensive jacket." },
],
'word-formation': [
{ t: 'own', q: "Write about something that makes you unhappy or an improvement you want.", hint: "… is unfair / I need more motivation …", a: ["I am unhappy with the slow internet at home.", "I need more motivation to study in the evening."], ex: "Tạo từ bằng tiền tố (un-, re-) và hậu tố (-tion, -ment, -ness): happy → unhappy, motivate → motivation." },
{ t: 'own', q: "Write about an achievement you are proud of.", hint: "My biggest achievement is …", a: ["My biggest achievement is my graduation from university.", "Winning the competition was a great achievement for my team."], ex: "Hậu tố -ment/-tion biến động từ thành danh từ: achieve → achievement, graduate → graduation." },
],
'pronouns': [
{ t: 'own', q: "Write about something you did by yourself.", hint: "I … it myself.", a: ["I painted my room myself.", "My sister taught herself to play the piano."], ex: "Đại từ phản thân (myself, herself) khi chủ ngữ và tân ngữ là một người." },
{ t: 'own', q: "Write about two people who help each other.", hint: "My friend and I help each other …", a: ["My best friend and I help each other with homework.", "That bag is mine, not yours."], ex: "each other là lẫn nhau; đại từ sở hữu (mine, yours) đứng một mình thay cho danh từ." },
],
'determiners': [
{ t: 'own', q: "Write about each or every day of your week.", hint: "Every … I …", a: ["Every morning I drink a glass of water.", "Each student in my group has a different hobby."], ex: "Dùng each/every + danh từ số ít + động từ số ít." },
{ t: 'own', q: "Write about having a few or few friends, or another chance.", hint: "I have a few … / I want another …", a: ["I have a few close friends at university.", "I would like another chance to take the test."], ex: "a few là một vài (tích cực), few là rất ít; another + danh từ số ít để nói một cái khác." },
],
'there-is-empty-it': [
{ t: 'own', q: "Describe what there is near your home.", hint: "There is/are … near my home.", a: ["There is a big supermarket near my home.", "There are two schools on my street."], ex: "Dùng There is + N số ít, There are + N số nhiều để nói có cái gì ở đâu." },
{ t: 'own', q: "Give your opinion about learning English.", hint: "It is … to …", a: ["It is important to practise every day.", "It is easy to forget new words."], ex: "It làm chủ ngữ giả: It is + adj + to V (It is important to practise)." },
],
'questions': [
{ t: 'own', q: "Write a question you want to ask a new classmate.", hint: "Where/What/How … do you …?", a: ["Where do you live?", "What do you usually do at the weekend?"], ex: "Câu hỏi → từ để hỏi + trợ động từ (do/does/did) + S + V nguyên mẫu?" },
{ t: 'own', q: "Write a yes/no question about someone's past holiday.", hint: "Did you …?", a: ["Did you visit any museums in Hue?", "Have you ever been to Singapore?"], ex: "Câu hỏi Yes/No → đưa trợ động từ (did/have) lên trước chủ ngữ." },
],
'question-tags-short-answers': [
{ t: 'own', q: "Write a sentence about the weather with a question tag.", hint: "It's …, isn't it?", a: ["It's very hot today, isn't it?", "It isn't raining now, is it?"], ex: "Câu hỏi đuôi: khẳng định → đuôi phủ định (isn't it?), phủ định → đuôi khẳng định (is it?)." },
{ t: 'own', q: "Check a fact about a friend with a question tag.", hint: "You like …, don't you?", a: ["You like spicy food, don't you?", "Your brother works in a bank, doesn't he?"], ex: "Câu hiện tại đơn dùng do/does cho đuôi: You like…, don't you? He works…, doesn't he?" },
],
'imperatives-suggestions': [
{ t: 'own', q: "Suggest an activity to do with friends this weekend.", hint: "Let's … / Why don't we …?", a: ["Let's go to the cinema on Saturday.", "Why don't we have a picnic in the park?"], ex: "Khi rủ hoặc gợi ý, dùng Let's + V; Why don't we + V?; How about + V-ing?" },
{ t: 'own', q: "Give a short instruction to a new student in your class.", hint: "Don't … / Please …", a: ["Don't forget to bring your notebook.", "Please turn off your phone in class."], ex: "Câu mệnh lệnh bắt đầu bằng V nguyên mẫu; phủ định dùng Don't + V." },
],
'numbers-data-language': [
{ t: 'own', q: "Write a sentence with a percentage about people you know.", hint: "About …% of my …", a: ["About 60% of my classmates go to school by motorbike.", "Just over a quarter of my friends live abroad."], ex: "Ngôn ngữ số liệu → approximately/about + %, just over/under a quarter/half để nói con số gần đúng." },
{ t: 'own', q: "Write about how much something costs or how many people live in your town.", hint: "Roughly … people …", a: ["Roughly 200,000 people live in my town.", "Nearly half of the students passed the test."], ex: "roughly, nearly, almost, just over + số liệu khi không cần con số chính xác." },
],
'ing-ed-adjectives-prepositions': [
{ t: 'own', q: "Write about something you find boring or interesting.", hint: "I find … boring / I'm interested in …", a: ["I am interested in history, but maths lessons are boring.", "I was surprised by the exciting ending of the film."], ex: "Dùng -ed cho cảm giác của người (interested, surprised), -ing cho tính chất gây ra cảm giác (boring, exciting)." },
{ t: 'own', q: "Write about something you are good at or afraid of.", hint: "I'm good at … / I'm afraid of …", a: ["I am good at drawing but frightened of dogs.", "My mum is worried about my exams."], ex: "Tính từ + giới từ cố định → good at, afraid of, worried about, interested in." },
],
'so-such-too-enough': [
{ t: 'own', q: "Write about a day that was so busy or tiring that something happened.", hint: "I was so … that …", a: ["I was so tired that I fell asleep on the sofa.", "It was such a hot day that we stayed inside."], ex: "Dùng so + adj + that; such + (a/an) + adj + N + that để nói kết quả." },
{ t: 'own', q: "Write about something you are too young/old or old enough to do.", hint: "I'm too … to … / I'm old enough to …", a: ["My brother is too young to drive.", "I am old enough to vote."], ex: "Dùng too + adj + to V (quá… không thể); adj + enough + to V (đủ… để)." },
],
'adverbs-position': [
{ t: 'own', q: "Write about how often you do sport.", hint: "I usually/rarely …", a: ["I usually go jogging on Sunday mornings.", "I rarely play football these days."], ex: "Trạng từ tần suất đứng trước động từ thường nhưng sau to be: I usually go → I am always late." },
{ t: 'own', q: "Give your opinion with a sentence adverb.", hint: "Personally, … / Fortunately, …", a: ["Personally, I think online classes are useful.", "Fortunately, I passed my driving test last year."], ex: "Trạng từ bình luận (personally, fortunately) thường đứng đầu câu, sau đó là dấu phẩy." },
],
'participle-clauses': [
{ t: 'own', q: "Write about two things you did one after another, using a participle clause.", hint: "Having finished …, I …", a: ["Having finished my homework, I went out with my friends.", "Walking along the beach, we saw a beautiful sunset."], ex: "Mệnh đề phân từ rút gọn chủ ngữ chung → V-ing/V3/Having V3 …, S + V." },
],
'subjunctive': [
{ t: 'own', q: "Recommend something to improve your school or town.", hint: "I suggest that the city …", a: ["I suggest that the city build more parks.", "It is essential that every student have access to the internet."], ex: "Thức giả định → suggest/recommend/essential + (that) + S + V nguyên mẫu (không chia -s)." },
],
'preference-advice': [
{ t: 'own', q: "Write about what you would rather do this evening.", hint: "I would rather … than …", a: ["I would rather stay at home than go out tonight.", "I'd rather read a book than watch TV."], ex: "Dùng would rather + V nguyên mẫu + than + V nguyên mẫu để nói điều thích hơn." },
{ t: 'own', q: "Give strong advice to a friend who is always late.", hint: "You had better … / It's time …", a: ["You had better leave home earlier.", "It's high time you bought an alarm clock."], ex: "Dùng had better + V nguyên mẫu (lời khuyên mạnh); It's (high) time + S + V2." },
],
'phrasal-verbs-grammar': [
{ t: 'own', q: "Write about something you need to look up, give up or put off.", hint: "I want to give up … / I often put off …", a: ["I want to give up sugar this year.", "I often look up new words in a dictionary."], ex: "Cụm động từ = V + tiểu từ → give up (từ bỏ), look up (tra), put off (hoãn)." },
{ t: 'own', q: "Write about a plan you will carry out or a problem you need to work out.", hint: "We are going to carry out …", a: ["Our class is going to carry out a survey next week.", "I need to work out how to save more money."], ex: "carry out (tiến hành), work out (tìm ra cách giải) là cụm động từ hay dùng trong bài nói và viết." },
],
'dependent-prepositions': [
{ t: 'own', q: "Write about something your success depends on.", hint: "My success depends on …", a: ["My success depends on hard work.", "I am interested in learning about other cultures."], ex: "Động từ/tính từ + giới từ đi kèm → depend on, interested in, good at, responsible for." },
],
'reference-substitution': [
{ t: 'own', q: "Write two sentences about a problem; refer back to it with this or such.", hint: "… This problem …", a: ["Many people drive to work. This causes traffic jams every morning.", "Plastic bags are cheap. However, such bags pollute the sea."], ex: "Dùng this/these/such + N để nhắc lại ý trước, tránh lặp từ và giúp đoạn văn liên kết." },
{ t: 'own', q: "Compare two options and refer to them as the former and the latter.", hint: "… the former … the latter …", a: ["I like tea and coffee, but the former is healthier.", "Buses and trains are both cheap; the latter is faster."], ex: "the former là cái được nhắc trước, the latter là cái được nhắc sau." },
],
'hedging': [
{ t: 'own', q: "Make a careful claim about how technology affects young people.", hint: "Technology may … / It is likely that …", a: ["Social media may make some teenagers feel lonely.", "It is likely that online learning will become more common."], ex: "Ngôn ngữ rào đón → may/might, tend to, it is likely that để tránh khẳng định tuyệt đối." },
],
'nominalisation': [
{ t: 'own', q: "Write about a change in your town using a noun phrase.", hint: "The development of … has …", a: ["The development of new roads has reduced travel time.", "The introduction of buses has helped many students."], ex: "Danh từ hóa → the + N (-tion/-ment) + of … thay cho mệnh đề động từ, văn phong học thuật." },
],
'parallel-structure': [
{ t: 'own', q: "Write about two things you like doing, keeping the same form.", hint: "I like both … and …", a: ["I like both reading novels and watching documentaries.", "My job is not only interesting but also well paid."], ex: "Cấu trúc song song → both … and / not only … but also nối hai thành phần cùng dạng (V-ing và V-ing)." },
{ t: 'own', q: "Describe how you spend your evenings with three activities in the same form.", hint: "I spend my evenings cooking, … and …", a: ["I spend my evenings cooking, reading and studying.", "On Sundays I enjoy swimming, cycling and walking."], ex: "Liệt kê ba ý cùng dạng từ khi nói về hoạt động: V-ing, V-ing và V-ing (cooking, reading and studying)." },
],
'punctuation': [
{ t: 'own', q: "Write two related ideas joined by a semicolon.", hint: "…; …", a: ["I wanted to go out; however, it was raining.", "My sister loves cats; my brother prefers dogs."], ex: "Dấu chấm phẩy (;) nối hai mệnh đề độc lập có liên quan; trước however dùng ; và sau đó dùng dấu phẩy." },
{ t: 'own', q: "Write about something that belongs to a family member.", hint: "My brother's …", a: ["My brother's car is very old.", "My parents' house has a small garden."], ex: "Sở hữu cách → danh từ số ít + 's (brother's); số nhiều có -s chỉ thêm ' (parents')." },
],
'future-in-past': [
{ t: 'own', q: "Write about a plan you had that didn't happen.", hint: "I was going to … but …", a: ["I was going to visit my friend, but I got sick.", "We were going to travel abroad, but the trip was cancelled."], ex: "Dự định trong quá khứ (có thể không thành) dùng was/were going to + V." },
{ t: 'own', q: "Write about something you were about to do when something happened.", hint: "I was about to … when …", a: ["I was about to leave when my phone rang.", "She was about to cry when her friend arrived."], ex: "Dùng was/were about to + V khi sắp sửa làm gì thì có việc khác xảy ra." },
],
'alternatives-to-if': [
{ t: 'own', q: "Give a condition for doing something this weekend.", hint: "I will go … as long as / unless …", a: ["I will go hiking as long as the weather is good.", "I won't go out unless I finish my work."], ex: "as long as/provided that = miễn là; unless = trừ khi (= if … not)." },
],
'emphasis-variety': [
{ t: 'own', q: "Emphasise what you really need or like.", hint: "What I really need is …", a: ["What I really need is a long holiday.", "I do like your new haircut."], ex: "Nhấn mạnh: What … is … (câu chẻ) hoặc trợ động từ do/does trước động từ (I do like…)." },
],
'sequence-of-tenses': [
{ t: 'own', q: "Write about what you will do after you finish this lesson.", hint: "After I finish …, I will …", a: ["After I finish this lesson, I will have dinner.", "When I get home, I will call my mother."], ex: "Mệnh đề thời gian (when/after/as soon as) dùng hiện tại đơn, mệnh đề chính dùng will." },
{ t: 'own', q: "Report what a friend said about their plans.", hint: "My friend said that he would …", a: ["My friend said that he would study abroad.", "She said she was tired."], ex: "Tường thuật với said → lùi thì: will → would, am → was." },
],
'quantity-advanced': [
{ t: 'own', q: "Write about the people in your class or office using an advanced quantifier.", hint: "The vast majority of … / A handful of …", a: ["The vast majority of my classmates use smartphones.", "Only a handful of people in my office walk to work."], ex: "Dùng the vast majority of, a handful of, a great deal of thay many/few để văn phong học thuật." },
{ t: 'own', q: "Write about the amount of time or money you spend on something.", hint: "I spend a great deal of …", a: ["I spend a great deal of time on homework.", "A large amount of my money goes on food."], ex: "Dùng a great deal of / a large amount of + danh từ không đếm được (time, money)." },
],
'paraphrase-structures': [
{ t: 'own', q: "Write about something that is too difficult for you, then say it another way.", hint: "This … is too … for me to …", a: ["This book is too difficult for me to understand.", "The box is too heavy for me to carry."], ex: "too + adj + (for sb) + to V tương đương not + adj + enough to V; dùng để viết lại câu." },
{ t: 'own', q: "Write about someone who is old or strong enough to do something.", hint: "… is … enough to …", a: ["My son is tall enough to reach the shelf.", "My English is good enough to watch films without subtitles."], ex: "Dùng adj + enough + to V để nói đủ … để làm gì." },
],
'paraphrase-ielts': [
{ t: 'own', q: "Describe a trend in your town using a noun instead of a verb.", hint: "There has been a rise in …", a: ["There has been a rise in the number of cafés in my town.", "There was a sharp fall in rice prices last year."], ex: "Đổi động từ sang danh từ khi paraphrase: rose → a rise in, fell → a fall in." },
],
'nouns': [
{ t: 'own', q: "Write about a group such as your family, team or class.", hint: "My family/team …", a: ["My team has eleven players.", "My family lives in a small apartment."], ex: "Danh từ tập hợp (family, team, class) thường đi với động từ số ít khi nói cả nhóm." },
{ t: 'own', q: "Write about the children or people in your neighbourhood.", hint: "Many children/people in my street …", a: ["Many children play football in my street.", "The people in my village are very friendly."], ex: "Danh từ số nhiều bất quy tắc: child → children, person → people; đi với động từ số nhiều (play, are)." },
],
'verb-types': [
{ t: 'own', q: "Write about how you or someone seems or became.", hint: "He seems … / She became …", a: ["My teacher seems tired today.", "My cousin became a doctor last year."], ex: "Sau động từ nối (seem, become, look) dùng tính từ/danh từ, không dùng trạng từ." },
{ t: 'own', q: "Write about a gift you gave someone.", hint: "I gave my … a …", a: ["I gave my mother a scarf for her birthday.", "My friend sent me a postcard from Paris."], ex: "Động từ hai tân ngữ → give/send + người + vật (gave my mother a scarf)." },
],
'conjunctions': [
{ t: 'own', q: "Write two ideas about your weekend joined by but or so.", hint: "I wanted to … , but …", a: ["I wanted to go swimming, but it was too cold.", "I was hungry, so I made some noodles."], ex: "but nối hai ý tương phản, so nối kết quả; dùng dấu phẩy trước but/so." },
{ t: 'own', q: "Write about a choice using either … or.", hint: "I will either … or …", a: ["I will either study medicine or become a teacher.", "Both my parents and my sister speak English."], ex: "Liên từ tương quan → either … or (hoặc … hoặc), both … and (cả … và)." },
],
'reported-advanced': [
{ t: 'own', q: "Report advice or a warning someone gave you.", hint: "My doctor advised me to …", a: ["My doctor advised me to sleep more.", "My teacher warned us not to cheat in the exam."], ex: "Dùng advise/warn/tell + O + (not) to V để tường thuật lời khuyên, lời cảnh báo." },
{ t: 'own', q: "Report an accusation or apology.", hint: "He accused me of … / She apologised for …", a: ["My brother accused me of breaking his phone.", "She apologised for being late."], ex: "accuse sb of V-ing, apologise for V-ing: sau giới từ dùng V-ing." },
],
'sentence-types': [
{ t: 'own', q: "Write a compound sentence about your hobbies.", hint: "I like …, and I also …", a: ["I like music, and I also enjoy painting.", "I wanted to join the club, but it was full."], ex: "Câu ghép → hai mệnh đề độc lập nối bằng and/but/so, có dấu phẩy trước liên từ." },
{ t: 'own', q: "Write a complex sentence about your morning.", hint: "Before I …, I …", a: ["Before I leave home, I always check the weather.", "I drink coffee because it helps me wake up."], ex: "Câu phức: mệnh đề chính + mệnh đề phụ bắt đầu bằng before/because/when." },
],
'noun-plurals': [
{ t: 'own', q: "Write about some people or animals you saw recently.", hint: "I saw some children/sheep …", a: ["I saw some children playing in the park.", "There were many sheep on the farm."], ex: "Danh từ số nhiều bất quy tắc: child → children, sheep → sheep, man → men." },
{ t: 'own', q: "Write about things in your kitchen with -ies, -ves or -es plurals.", hint: "There are … knives / … boxes …", a: ["There are three knives in the drawer.", "We keep the boxes on the top shelf."], ex: "Danh từ đổi đuôi khi thành số nhiều: knife → knives (-f → -ves), box → boxes (-x → -es), city → cities (-y → -ies)." },
],
'possessive-case': [
{ t: 'own', q: "Write about something that belongs to a friend.", hint: "My friend's …", a: ["My friend's house is near the river.", "Tom's sister works in a hospital."], ex: "Sở hữu cách với người → N's + N (my friend's house)." },
{ t: 'own', q: "Write about a part of a thing or place.", hint: "The … of the …", a: ["The roof of the school is red.", "The end of the film was very sad."], ex: "Sở hữu với vật/ý trừu tượng thường dùng the N of the N (the roof of the school)." },
],
'adjectives-special': [
{ t: 'own', q: "Write about a group of people who need help in society.", hint: "The elderly / the poor …", a: ["The elderly need more support from their families.", "The government should help the poor."], ex: "Dùng the + tính từ để chỉ nhóm người (the elderly, the poor), đi với động từ số nhiều." },
{ t: 'own', q: "Write about something new or interesting you did recently.", hint: "I did something … / I learned something …", a: ["I learned something interesting about space yesterday.", "I want to try something different this summer."], ex: "Tính từ đứng sau đại từ bất định → something interesting, nothing new." },
],
'comparison-special': [
{ t: 'own', q: "Write a 'the more …, the more …' sentence about learning.", hint: "The more I …, the more …", a: ["The more I practise, the more confident I feel.", "The earlier I sleep, the better I feel in the morning."], ex: "So sánh kép → The + so sánh hơn + S + V, the + so sánh hơn + S + V (càng … càng …)." },
{ t: 'own', q: "Compare two things using twice as … as.", hint: "… is twice as … as …", a: ["My new phone is twice as fast as my old one.", "This flat is twice as big as my last one."], ex: "Gấp bao nhiêu lần → twice/three times + as + adj + as." },
],
'ed-s-endings': [
{ t: 'own', q: "Write about two things you did yesterday with regular -ed verbs.", hint: "Yesterday I cleaned … and watched …", a: ["Yesterday I cleaned my room and watched a film.", "I played tennis and visited my aunt last week."], ex: "Quá khứ có quy tắc thêm -ed: clean → cleaned, play → played; đọc /t/, /d/ hoặc /ɪd/." },
{ t: 'own', q: "Write about what your friend does every week (third person -s/-es).", hint: "He watches … and goes …", a: ["He watches football and goes swimming every week.", "She fixes old radios on Sundays."], ex: "Ngôi thứ ba số ít thêm -s/-es: watch → watches, go → goes, fix → fixes." },
],
'purpose-result': [
{ t: 'own', q: "Explain why you are learning English.", hint: "I'm learning English in order to / so that …", a: ["I am learning English in order to get a better job.", "I study every day so that I can pass IELTS."], ex: "Chỉ mục đích → in order to + V; so that + S + can/will + V." },
{ t: 'own', q: "Write about a cause and its result in your life.", hint: "… As a result, …", a: ["I missed the bus. As a result, I was late for school.", "It rained heavily, so the match was cancelled."], ex: "Chỉ kết quả → as a result, so, therefore nối nguyên nhân và kết quả." },
],
'reason-contrast': [
{ t: 'own', q: "Write about a plan that changed because of the weather or traffic.", hint: "Because of …, we …", a: ["Because of the heavy rain, we stayed at home.", "The flight was delayed due to the storm."], ex: "because of / due to + danh từ (cụm danh từ); because + mệnh đề." },
{ t: 'own', q: "Write about two people or places that are different.", hint: "… whereas … / Despite …, …", a: ["My sister loves sport, whereas I prefer reading.", "Despite the cold weather, we went to the beach."], ex: "Tương phản → whereas + mệnh đề; despite + danh từ/V-ing (không + mệnh đề)." },
],
'as-if-unreal-past': [
{ t: 'own', q: "Describe someone who acts as if something were true.", hint: "He talks as if he …", a: ["My cousin talks as if he knew everything.", "She looks as if she hasn't slept for days."], ex: "as if + quá khứ (knew, were) cho điều không có thật; as if + hiện tại khi có thể đúng." },
{ t: 'own', q: "Tell someone it is time to do something.", hint: "It's time you …", a: ["It's time you went to bed.", "I'd rather you didn't use my phone."], ex: "It's time + S + V2 và would rather + S + V2 dùng quá khứ để nói về hiện tại." },
],
'idioms-style': [
{ t: 'own', q: "Use an idiom to describe a busy or easy day.", hint: "It was a piece of cake / I felt under the weather …", a: ["The test was a piece of cake.", "I felt under the weather last week, so I stayed home."], ex: "Thành ngữ thân mật (a piece of cake = rất dễ, under the weather = hơi ốm) hợp văn nói; tránh dùng trong bài viết học thuật." },
],
};
(g.GRAMMAR || []).forEach(l => { if (OWN[l.id]) l.drills = (l.drills || []).concat(OWN[l.id]); });
})(typeof self !== 'undefined' ? self : this);
