/* IELTS General Training – Writing Task 1 (viết thư): 24 đề + bài mẫu có chú thích (tự biên soạn).
 * Cú pháp bài mẫu giống models.js: [[cụm từ|nghĩa]], {{từ nối}}, <<Nhãn>> ở đầu câu. Nạp sau models.js. */
(function (g) {
  g.GT_LETTERS = (g.GT_LETTERS || []).concat([
    /* ---------- Trang trọng (formal) ---------- */
    { id: 'gt1', tone: 'formal', topic: 'complaint', titleVi: 'Khiếu nại máy giặt mua online bị lỗi', to: 'the customer service manager',
      situation: "Two weeks ago you ordered a washing machine from an online store. Since it was delivered, it has not worked properly.",
      bullets: ['give details of your order', 'explain what is wrong with the machine', 'say what you would like the company to do'],
      open: 'Dear Sir or Madam,', close: 'Yours faithfully,' },
    { id: 'gt2', tone: 'formal', topic: 'job application', titleVi: 'Xin việc hướng dẫn viên bán thời gian ở bảo tàng', to: 'the museum',
      situation: "A local history museum is looking for part-time guides to show visitors around at weekends. You would like to apply for the position.",
      bullets: ['say where you heard about the job', 'describe your relevant skills and experience', 'explain when you would be available'],
      open: 'Dear Sir or Madam,', close: 'Yours faithfully,' },
    { id: 'gt3', tone: 'formal', topic: 'request for information', titleVi: 'Hỏi thông tin khóa học buổi tối', to: 'the college',
      situation: "You have seen an advertisement for evening courses at a community college and you are interested in one of them.",
      bullets: ['introduce yourself and say which course interests you', 'explain why you want to take it', 'ask for the information you need'],
      open: 'Dear Sir or Madam,', close: 'Yours faithfully,' },
    { id: 'gt4', tone: 'formal', topic: 'apology to a company', titleVi: 'Xin lỗi công ty cho thuê xe vì trả xe muộn và làm trầy xe', to: 'the car hire company',
      situation: "Last weekend you rented a van from a hire company. You returned it late and it had a small scratch on one side.",
      bullets: ['explain why you returned the van late', 'describe how the damage happened', 'say what you will do to put things right'],
      open: 'Dear Sir or Madam,', close: 'Yours faithfully,' },
    { id: 'gt5', tone: 'formal', topic: 'suggestion to the council', titleVi: 'Góp ý hội đồng thành phố cải tạo công viên', to: 'the local council',
      situation: "There is a public park near your home, but in recent years fewer people have been using it.",
      bullets: ['describe the park and how it is used now', 'explain what problems there are', 'suggest how the park could be improved'],
      open: 'Dear Sir or Madam,', close: 'Yours faithfully,' },
    { id: 'gt6', tone: 'formal', topic: 'complaint to a manager', titleVi: 'Phản ánh với quản lý phòng gym về lớp tập bị hủy', to: 'Mr Hall, the manager of the fitness centre',
      situation: "You are a member of a fitness centre managed by Mr Robert Hall. Recently, several of the classes you pay for have been cancelled.",
      bullets: ['explain which classes you attend', 'describe what has happened', 'say what you would like the centre to do'],
      open: 'Dear Mr Hall,', close: 'Yours sincerely,' },
    { id: 'gt7', tone: 'formal', topic: 'letter to a newspaper', titleVi: 'Gửi báo phản đối việc đóng cửa thư viện địa phương', to: 'the editor of a local newspaper',
      situation: "You have read in a local newspaper that the town library may close next year to save money. You disagree with this plan.",
      bullets: ['explain why the library is important to the community', 'describe what would happen if it closed', 'suggest another way to save money'],
      open: 'Dear Sir or Madam,', close: 'Yours faithfully,' },
    { id: 'gt8', tone: 'formal', topic: 'request for leave', titleVi: 'Xin nghỉ phép để tham gia khóa đào tạo', to: 'Ms Wells, the human resources manager',
      situation: "You would like to attend a two-week professional training course, but it takes place during working hours. The human resources manager at your company is Ms Karen Wells.",
      bullets: ['describe the course', 'explain how it would benefit your work', 'say how your duties could be covered while you are away'],
      open: 'Dear Ms Wells,', close: 'Yours sincerely,' },

    /* ---------- Bán trang trọng (semi-formal) ---------- */
    { id: 'gt9', tone: 'semi-formal', topic: 'neighbour – noise', titleVi: 'Gửi hàng xóm về tiếng ồn sửa nhà', to: 'your neighbour, Mr Wilson',
      situation: "Your neighbour, Mr Wilson, is renovating his house, and the building work has been very noisy, often early in the morning.",
      bullets: ['explain how the noise is affecting you', 'say that you understand his situation', 'suggest a solution'],
      open: 'Dear Mr Wilson,', close: 'Kind regards,' },
    { id: 'gt10', tone: 'semi-formal', topic: 'landlord – repairs', titleVi: 'Báo chủ nhà sửa hệ thống sưởi hỏng', to: 'your landlord, Mrs Clarke',
      situation: "You rent a flat from Mrs Clarke. The heating in the flat has stopped working and the weather is getting colder.",
      bullets: ['describe the problem', 'explain how it is affecting you', 'say what you would like her to do'],
      open: 'Dear Mrs Clarke,', close: 'Best regards,' },
    { id: 'gt11', tone: 'semi-formal', topic: 'colleague – favour', titleVi: 'Nhờ đồng nghiệp làm thay khi đi vắng', to: 'your colleague, Ms Rivera',
      situation: "You need to be away from work for a few days next month. You would like a colleague from another team, Ms Rivera, to help with some of your work.",
      bullets: ['explain why you will be away', 'describe the tasks you need help with', 'offer something in return'],
      open: 'Dear Ms Rivera,', close: 'Kind regards,' },
    { id: 'gt12', tone: 'semi-formal', topic: 'teacher – absence', titleVi: 'Báo cô giáo con nghỉ học một tuần', to: "your child's teacher, Mrs Bennett",
      situation: "Your child will have to miss a week of school next month because of a family event abroad. Your child's class teacher is Mrs Bennett.",
      bullets: ['explain why your child will be absent', 'say when your child will be away', 'ask how your child can keep up with schoolwork'],
      open: 'Dear Mrs Bennett,', close: 'Kind regards,' },
    { id: 'gt13', tone: 'semi-formal', topic: 'former manager – reference', titleVi: 'Nhờ sếp cũ viết thư giới thiệu', to: 'your former manager, Mr Hayes',
      situation: "You are applying for a new job and the employer has asked for a reference. You used to work for Mr Hayes a few years ago.",
      bullets: ['remind him who you are', 'describe the job you are applying for', 'explain what you would like him to mention'],
      open: 'Dear Mr Hayes,', close: 'Best regards,' },
    { id: 'gt14', tone: 'semi-formal', topic: 'neighbour – favour', titleVi: 'Nhờ hàng xóm trông nhà khi đi du lịch', to: 'your neighbour, Mrs Lawson',
      situation: "You are going on holiday for two weeks and nobody will be at home. You would like your neighbour, Mrs Lawson, to help you while you are away.",
      bullets: ['say where you are going and for how long', 'explain what you would like her to do', 'tell her how she can contact you'],
      open: 'Dear Mrs Lawson,', close: 'Kind regards,' },
    { id: 'gt15', tone: 'semi-formal', topic: 'teacher – thanks', titleVi: 'Cảm ơn thầy dạy khóa học buổi tối', to: 'your teacher, Mr Fisher',
      situation: "You have just finished an evening course in photography taught by Mr Fisher, and you want to thank him.",
      bullets: ['say what you enjoyed about the course', 'explain how it has helped you', 'tell him about your plans for the future'],
      open: 'Dear Mr Fisher,', close: 'Best regards,' },
    { id: 'gt16', tone: 'semi-formal', topic: 'club organiser – suggestion', titleVi: 'Góp ý người tổ chức câu lạc bộ chạy bộ đổi giờ tập', to: 'the club organiser, Mr Collins',
      situation: "You recently joined a local running club organised by Mr Collins. You have found it difficult to attend because of the time the club meets.",
      bullets: ['say what you like about the club', 'explain the problem with the meeting time', 'suggest a different arrangement'],
      open: 'Dear Mr Collins,', close: 'Kind regards,' },

    /* ---------- Thân mật (informal) ---------- */
    { id: 'gt17', tone: 'informal', topic: 'invitation', titleVi: 'Mời bạn dự tiệc tân gia', to: 'your friend',
      situation: "You have just moved into a new home and you are planning a small party to celebrate.",
      bullets: ['describe your new home', 'give details of the party', 'explain how your friend can get there'],
      open: 'Dear Sam,', close: 'Best wishes,' },
    { id: 'gt18', tone: 'informal', topic: 'thanks', titleVi: 'Cảm ơn bạn đã cho ở nhờ', to: 'your friend',
      situation: "You recently spent a week staying with a friend in another city.",
      bullets: ['thank your friend for having you', 'say what you enjoyed most about the visit', 'invite your friend to visit you'],
      open: 'Hi Laura,', close: 'Love,' },
    { id: 'gt19', tone: 'informal', topic: 'advice', titleVi: 'Khuyên bạn chuyển đến thành phố của mình', to: 'your friend',
      situation: "A friend is thinking about moving to the city where you live and has asked for your advice.",
      bullets: ['say whether you think it is a good idea', 'give advice about finding somewhere to live', 'suggest what your friend should do in their free time'],
      open: 'Dear Tom,', close: 'Best wishes,' },
    { id: 'gt20', tone: 'informal', topic: 'news', titleVi: 'Kể với bạn về công việc mới', to: 'your friend',
      situation: "You have recently started a new job and you want to tell an old friend about it.",
      bullets: ['describe the new job', 'explain why you decided to change jobs', 'say how you feel about it so far'],
      open: 'Hi Anna,', close: 'Lots of love,' },
    { id: 'gt21', tone: 'informal', topic: 'apology', titleVi: 'Xin lỗi bạn vì lỡ tiệc sinh nhật', to: 'your friend',
      situation: "Last weekend you missed a friend's birthday dinner, even though you had promised to come.",
      bullets: ['apologise and explain why you missed it', 'say how you feel about it', 'suggest a way to make it up to your friend'],
      open: 'Dear Kate,', close: 'Love,' },
    { id: 'gt22', tone: 'informal', topic: 'request', titleVi: 'Hỏi mượn bạn đồ cắm trại', to: 'your friend',
      situation: "You are planning a camping trip, but you do not have all the equipment you need. A friend of yours goes camping often.",
      bullets: ['tell your friend about the trip', 'say what you would like to borrow', 'explain how and when you will return it'],
      open: 'Hi Ben,', close: 'Cheers,' },
    { id: 'gt23', tone: 'informal', topic: 'congratulations', titleVi: 'Chúc mừng bạn tốt nghiệp', to: 'your friend',
      situation: "A close friend has just graduated from university after several years of hard work.",
      bullets: ['congratulate your friend', 'say why you think they deserve it', 'suggest how you could celebrate together'],
      open: 'Dear Emily,', close: 'Best wishes,' },
    { id: 'gt24', tone: 'informal', topic: 'recommendation', titleVi: 'Giới thiệu lớp học nấu ăn cho bạn', to: 'your friend',
      situation: "You recently took a cooking class and enjoyed it very much. A friend has asked you about it.",
      bullets: ['describe the class', 'say what you learnt', 'explain why your friend should join'],
      open: 'Hi Jack,', close: 'Take care,' },
  ]);

  g.MODELS = (g.MODELS || []).concat([
    { id: 'gt-gt1', task: 'gt', ref: 'gt1', band: '8.0', words: 165,
      text: `<<Lời chào>> Dear Sir or Madam,

<<Mục đích thư>> I am writing to [[express my dissatisfaction with|bày tỏ sự không hài lòng về]] a washing machine I recently purchased from your website.

<<Ý 1>> I placed the order on 3 March, and the machine, a Zenith 8 kg front-loader, was delivered five days later. The order number is ZN40217, and I paid £429 by credit card.

<<Ý 2>> {{Unfortunately}}, the machine has [[not worked properly since the day it arrived|chưa hoạt động bình thường kể từ ngày được giao]]. The drum stops spinning halfway through every cycle, {{so}} my clothes come out soaking wet. {{In addition}}, water [[leaks onto the kitchen floor|rò rỉ ra sàn bếp]] each time I use it. I have followed the instructions carefully, so I am confident that [[the fault lies with the machine itself|lỗi nằm ở chính chiếc máy]].

<<Ý 3>> I would be grateful if you could [[arrange for the machine to be collected|sắp xếp đến thu hồi chiếc máy]] and replaced with a new one [[as soon as possible|càng sớm càng tốt]]. {{Alternatively}}, I would accept [[a full refund|hoàn tiền toàn bộ]].

<<Kết thư>> Thank you for your attention to this matter. I look forward to [[hearing from you at your earliest convenience|nhận được hồi âm sớm nhất có thể]].

Yours faithfully,
Lan Nguyen` },

    { id: 'gt-gt2', task: 'gt', ref: 'gt2', band: '8.0', words: 164,
      text: `<<Lời chào>> Dear Sir or Madam,

<<Mục đích thư>> I am writing to [[apply for the position of|ứng tuyển vào vị trí]] part-time weekend guide at the City History Museum.

<<Ý 1>> I [[came across your advertisement|tình cờ thấy thông báo tuyển dụng của quý bảo tàng]] on the noticeboard at the central library last week, and I was delighted to see that you are looking for new staff.

<<Ý 2>> I am currently in my final year of a history degree, {{so}} I have [[a thorough knowledge of|kiến thức sâu rộng về]] the local area and its past. {{Moreover}}, I spent last summer working as a tour guide for a travel company, where I led groups of up to thirty people. This experience taught me how to [[speak confidently in public|nói trước đám đông một cách tự tin]] and [[deal with unexpected questions|xử lý những câu hỏi bất ngờ]]. I also speak fluent French, which might be useful for foreign visitors.

<<Ý 3>> My lectures finish on Fridays, {{so}} I would be available to work every Saturday and Sunday. I could also [[attend an interview|tham dự phỏng vấn]] on any weekday afternoon.

<<Kết thư>> I have enclosed my CV and [[look forward to hearing from you|mong nhận được hồi âm của quý vị]].

Yours faithfully,
Minh Tran` },

    { id: 'gt-gt3', task: 'gt', ref: 'gt3', band: '8.0', words: 171,
      text: `<<Lời chào>> Dear Sir or Madam,

<<Mục đích thư>> I am writing to [[enquire about|hỏi thông tin về]] the evening courses advertised in this month's community magazine.

<<Ý 1>> I am a thirty-two-year-old accountant who moved to this area six months ago, and I am particularly interested in your Beginners' Spanish course, which [[is due to start|dự kiến bắt đầu]] in October.

<<Ý 2>> My company has recently opened an office in Madrid, and I expect to [[travel there on a regular basis|đến đó thường xuyên]]. {{Although}} my colleagues there speak English, I would like to be able to [[hold basic conversations|giao tiếp cơ bản]] and understand the culture better. {{Besides}}, I have always wanted to learn a second language.

<<Ý 3>> I would be grateful if you could [[provide me with further details|cung cấp cho tôi thêm thông tin chi tiết]] about the course. In particular, I would like to know how many evenings a week the classes take place and how large the groups are. {{Furthermore}}, could you tell me [[what the total cost is|tổng chi phí là bao nhiêu]] and whether books are included? {{Finally}}, I would like to know how to [[enrol|đăng ký học]].

<<Kết thư>> Thank you in advance for your help.

Yours faithfully,
Hoa Pham` },

    { id: 'gt-gt4', task: 'gt', ref: 'gt4', band: '8.0', words: 166,
      text: `<<Lời chào>> Dear Sir or Madam,

<<Mục đích thư>> I am writing to [[offer my sincere apologies|gửi lời xin lỗi chân thành]] regarding the van I hired from your Riverside branch last weekend.

<<Ý 1>> According to the agreement, I was supposed to return the vehicle by 6 pm on Sunday. {{However}}, [[a serious accident on the motorway|một vụ tai nạn nghiêm trọng trên đường cao tốc]] caused a three-hour delay, {{and}} by the time I arrived, the office had already closed. I therefore left the keys in the drop box, [[as instructed on the sign|theo hướng dẫn trên biển báo]].

<<Ý 2>> I [[must also admit|cũng phải thừa nhận]] that the van has a small scratch on the passenger side. This happened while I was parking outside my new flat, where the street is extremely narrow, and I [[misjudged the distance|ước lượng sai khoảng cách]] to a metal post.

<<Ý 3>> I fully accept [[responsibility for the damage|trách nhiệm về thiệt hại]] and the late return. I am happy to pay the late fee and [[cover the cost of the repair|chi trả chi phí sửa chữa]], so please send me an invoice.

<<Kết thư>> Once again, I sincerely apologise for [[any inconvenience caused|mọi bất tiện đã gây ra]] and thank you for your patience.

Yours faithfully,
Duc Le` },

    { id: 'gt-gt5', task: 'gt', ref: 'gt5', band: '8.0', words: 160,
      text: `<<Lời chào>> Dear Sir or Madam,

<<Mục đích thư>> I am writing to [[draw your attention to|lưu ý quý vị về]] the condition of Elm Park, which is located next to my street.

<<Ý 1>> The park covers a large area and includes a playground, a small lake and several footpaths. Ten years ago, it was [[always full of|luôn đông đúc]] families and joggers. {{Nowadays}}, {{however}}, it is mainly used by dog walkers, and [[very few children play there|rất ít trẻ em vui chơi ở đó]].

<<Ý 2>> The main reason is that the park [[has been neglected|đã bị bỏ bê]]. The playground equipment is old and some of it is [[unsafe to use|không an toàn khi sử dụng]]. {{In addition}}, there are not enough rubbish bins, {{so}} litter is everywhere, and several streetlights are broken, which makes people [[feel uneasy|cảm thấy bất an]] in the evening.

<<Ý 3>> I would suggest replacing the playground equipment and [[installing more bins|lắp thêm thùng rác]]. Repairing the lights would also make the park safer. {{Finally}}, the council could organise community events, such as outdoor concerts, to [[attract visitors back|thu hút người dân quay lại]].

<<Kết thư>> I hope you will consider these suggestions.

Yours faithfully,
Thu Vo` },

    { id: 'gt-gt6', task: 'gt', ref: 'gt6', band: '8.0', words: 162,
      text: `<<Lời chào>> Dear Mr Hall,

<<Mục đích thư>> I am writing to [[raise a concern about|nêu lên mối lo ngại về]] the recent cancellation of classes at your fitness centre.

<<Ý 1>> I have been a member for over two years and [[have a premium membership|có gói hội viên cao cấp]], which includes group classes. I regularly attend the yoga class on Monday evenings and the cycling class on Thursday mornings.

<<Ý 2>> {{Over the past month}}, {{however}}, five of these sessions have been cancelled, often [[at very short notice|với thông báo rất gấp]]. On one occasion, I arrived at the centre only to find a note on the studio door. As I [[arrange my work schedule around|sắp xếp lịch làm việc xoay quanh]] these classes, this has been extremely frustrating.

<<Ý 3>> I would appreciate it if the centre could [[inform members by text message|thông báo cho hội viên qua tin nhắn]] whenever a class is cancelled. {{Furthermore}}, I believe it would be fair to offer [[a partial refund|hoàn lại một phần tiền]] for the sessions I have missed, or to [[extend my membership|gia hạn gói hội viên]] by one month.

<<Kết thư>> I look forward to [[your prompt reply|hồi âm nhanh chóng của ông]]. Thank you for your time.

Yours sincerely,
Quang Do` },

    { id: 'gt-gt7', task: 'gt', ref: 'gt7', band: '8.0', words: 161,
      text: `<<Lời chào>> Dear Sir or Madam,

<<Mục đích thư>> I am writing in response to your article about [[the proposed closure|kế hoạch đóng cửa]] of Westbridge Library, which I [[strongly oppose|phản đối mạnh mẽ]].

<<Ý 1>> The library is far more than a place to borrow books. It offers free internet access, homework clubs for children and reading groups for elderly residents. For many people, it is [[the only welcoming public space|không gian công cộng thân thiện duy nhất]] in the town.

<<Ý 2>> If the library closed, the most vulnerable members of the community would [[suffer the most|chịu ảnh hưởng nặng nề nhất]]. Families who cannot afford computers would [[lose access to|mất khả năng tiếp cận]] online services, {{and}} older people living alone would lose an important chance to meet others. {{Moreover}}, students would have nowhere quiet to study.

<<Ý 3>> {{Instead of}} closing it, the council could [[reduce opening hours|giảm giờ mở cửa]] on quieter days or rent out the meeting room to local businesses. Volunteers could also help with simple tasks, which would [[cut staffing costs|cắt giảm chi phí nhân sự]].

<<Kết thư>> I sincerely hope the council will [[reconsider its decision|xem xét lại quyết định]] before it is too late.

Yours faithfully,
Mai Hoang` },

    { id: 'gt-gt8', task: 'gt', ref: 'gt8', band: '8.0', words: 162,
      text: `<<Lời chào>> Dear Ms Wells,

<<Mục đích thư>> I am writing to [[request permission to|xin phép được]] attend a professional training course from 4 to 15 November.

<<Ý 1>> The course, run by the National Institute of Marketing, focuses on [[digital marketing strategies|chiến lược tiếp thị kỹ thuật số]], including social media advertising and data analysis. It consists of daily workshops and [[leads to a recognised certificate|cấp chứng chỉ được công nhận]].

<<Ý 2>> As you know, our department is [[shifting its focus towards|chuyển trọng tâm sang]] online sales. The skills I would gain would allow me to [[plan more effective campaigns|lên kế hoạch cho các chiến dịch hiệu quả hơn]] and measure their results accurately. {{In addition}}, I would be happy to share what I learn with my colleagues through a short presentation after the course.

<<Ý 3>> I have already discussed my workload with my team. My colleague, David Lee, has kindly agreed to [[take over|tiếp quản]] my daily reports, {{and}} I will finish the current project before I leave. I will also [[check my emails regularly|kiểm tra email thường xuyên]] in case any urgent issues arise.

<<Kết thư>> I would be grateful if you could [[consider my request|xem xét đề nghị của tôi]].

Yours sincerely,
Ngoc Bui` },

    { id: 'gt-gt9', task: 'gt', ref: 'gt9', band: '8.0', words: 168,
      text: `<<Lời chào>> Dear Mr Wilson,

<<Mục đích thư>> I hope you are well. I am writing about the building work at your house, which I [[would like to discuss with you|muốn trao đổi với ông]].

<<Ý 1>> {{For the past two weeks}}, drilling and hammering have often started [[as early as|từ sớm tới tận]] seven o'clock in the morning. As I work night shifts at the hospital, I usually sleep until midday, {{so}} the noise has made it [[almost impossible to get enough rest|gần như không thể nghỉ ngơi đủ]]. I have been feeling exhausted at work as a result.

<<Ý 2>> I [[completely understand|hoàn toàn hiểu]] that renovations are necessary and that the builders need to finish the job [[within a set time|trong thời hạn nhất định]]. I am sure the house will look wonderful when it is finished, and I do not want to [[cause any trouble|gây phiền phức]].

<<Ý 3>> {{However}}, I wonder whether the noisiest work could start at around ten o'clock instead. {{Alternatively}}, if you could [[let me know in advance|báo trước cho tôi]] which days will be particularly loud, I could arrange to sleep at my sister's flat.

<<Kết thư>> Thank you for [[your understanding|sự thông cảm của ông]].

Kind regards,
Linh Dang` },

    { id: 'gt-gt10', task: 'gt', ref: 'gt10', band: '8.0', words: 171,
      text: `<<Lời chào>> Dear Mrs Clarke,

<<Mục đích thư>> I am writing to let you know about [[a problem with the heating|sự cố với hệ thống sưởi]] in the flat.

<<Ý 1>> Since last Tuesday, the radiators have stayed completely cold, {{even though}} the boiler appears to be switched on. I have checked the thermostat and [[reset the system|khởi động lại hệ thống]] twice, as the manual suggests, but nothing has changed. There is also [[a strange clicking noise|một tiếng lách cách lạ]] coming from the boiler.

<<Ý 2>> As the temperature has dropped sharply this week, the flat has become [[uncomfortably cold|lạnh đến khó chịu]], especially at night. I have had to buy a small electric heater, which is [[expensive to run|tốn kém khi vận hành]], and my young son has [[caught a cold|bị cảm lạnh]]. I am also worried that damp might start to appear on the walls.

<<Ý 3>> I would be very grateful if you could [[send an engineer|cử thợ kỹ thuật đến]] to look at the boiler [[as a matter of urgency|càng gấp càng tốt]]. I work from home on Wednesdays and Fridays, {{so}} either of those days would be convenient.

<<Kết thư>> Thank you in advance, and I hope to hear from you soon.

Best regards,
Tuan Ngo` },

    { id: 'gt-gt11', task: 'gt', ref: 'gt11', band: '8.0', words: 173,
      text: `<<Lời chào>> Dear Ms Rivera,

<<Mục đích thư>> I hope you are keeping well. I am writing to ask whether you might be able to [[do me a favour|giúp tôi một việc]] next month.

<<Ý 1>> I will be away from 12 to 16 May because my brother is getting married in Da Nang, and I have agreed to help with the preparations. I [[booked the time off|đã đăng ký nghỉ]] some weeks ago, {{but}} our team is [[short-staffed|thiếu nhân sự]] at the moment.

<<Ý 2>> I would be grateful if you could [[keep an eye on|để mắt tới]] the shared customer inbox while I am away and reply to any urgent questions. {{In addition}}, the weekly sales figures need to be [[sent to head office|gửi về trụ sở chính]] on Friday morning. It usually takes about half an hour, and I will leave [[step-by-step instructions|hướng dẫn từng bước]] on my desk.

<<Ý 3>> I know how busy you are, {{so}} I would be very happy to [[return the favour|đáp lại sự giúp đỡ]]. {{For example}}, I could cover your Friday shifts in June, when you mentioned you were going on holiday.

<<Kết thư>> Please let me know if this would be possible.

Kind regards,
Hanh Truong` },

    { id: 'gt-gt12', task: 'gt', ref: 'gt12', band: '8.0', words: 170,
      text: `<<Lời chào>> Dear Mrs Bennett,

<<Mục đích thư>> I am writing to let you know that my daughter, Mia, from Class 4B, will [[be absent from school|vắng mặt ở trường]] for one week next month.

<<Ý 1>> My husband's grandmother in Vietnam is celebrating her ninetieth birthday, and the whole family [[is gathering for the occasion|sẽ tụ họp nhân dịp này]]. As she is not well enough to travel, this may be [[the last chance|cơ hội cuối cùng]] for Mia to see her.

<<Ý 2>> We will fly out on Saturday 9 November, {{so}} Mia will miss lessons from Monday 11 to Friday 15 November. She will [[return to school|đi học trở lại]] on the following Monday. I realise that [[it is not ideal|điều này không lý tưởng]] to take children out of school during term time, and I apologise for any disruption.

<<Ý 3>> I would like to make sure that Mia does not [[fall behind|bị tụt lại phía sau]]. Could you possibly let me know which topics the class will cover that week? If you could [[provide some worksheets|cung cấp một số bài tập]], I will make sure she completes them while we are away.

<<Kết thư>> Thank you for [[your help and understanding|sự giúp đỡ và thông cảm của cô]].

Kind regards,
Thao Nguyen` },

    { id: 'gt-gt13', task: 'gt', ref: 'gt13', band: '8.0', words: 163,
      text: `<<Lời chào>> Dear Mr Hayes,

<<Mục đích thư>> I hope this letter finds you well. I am writing to ask whether you would be willing to [[act as a referee|làm người giới thiệu]] for me.

<<Ý 1>> You may remember that I worked as a sales assistant in your electronics shop from 2019 to 2021. I was the one who [[set up the online ordering system|thiết lập hệ thống đặt hàng trực tuyến]] during the first lockdown, and I [[was named employee of the month|được bình chọn là nhân viên xuất sắc của tháng]] twice.

<<Ý 2>> I am now applying for the position of assistant store manager at a large department store. The role involves [[supervising a team|giám sát một nhóm]] of twelve staff, handling customer complaints and managing stock levels.

<<Ý 3>> It would be extremely helpful if you could mention my reliability and my ability to [[stay calm under pressure|giữ bình tĩnh khi chịu áp lực]], especially during busy holiday periods. {{Furthermore}}, any comments on my communication skills would [[strengthen my application|làm hồ sơ ứng tuyển của tôi thuyết phục hơn]]. The employer will contact you by email within the next two weeks.

<<Kết thư>> Thank you for considering my request. I really [[appreciate your support|trân trọng sự ủng hộ của ông]].

Best regards,
Khoa Vu` },

    { id: 'gt-gt14', task: 'gt', ref: 'gt14', band: '8.0', words: 175,
      text: `<<Lời chào>> Dear Mrs Lawson,

<<Mục đích thư>> I hope you are well. I am writing to ask if you could [[keep an eye on our house|trông chừng nhà giúp chúng tôi]] while we are away next month.

<<Ý 1>> My family and I are going to Japan for two weeks to visit my cousin, who lives in Osaka. We will [[set off|khởi hành]] on 2 August and [[be back|trở về]] on the 16th.

<<Ý 2>> I would be very grateful if you could water the plants in the front garden every two or three days, [[especially if the weather is hot|nhất là khi trời nóng]]. {{In addition}}, it would help a lot if you could [[collect our post|nhận thư từ giúp chúng tôi]] from the doorstep, {{so that}} the house does not [[look empty|trông như không có người ở]]. I will leave a spare key in an envelope under your door before we leave.

<<Ý 3>> If anything goes wrong, you can call or message me on 0912 345 678 at any time. My brother, who lives nearby, has also [[agreed to help in an emergency|đồng ý giúp khi có việc khẩn cấp]].

<<Kết thư>> Thank you so much in advance. We will [[bring you back a little gift|mang về cho bà một món quà nhỏ]] from Japan.

Kind regards,
Anh Ly` },

    { id: 'gt-gt15', task: 'gt', ref: 'gt15', band: '8.0', words: 165,
      text: `<<Lời chào>> Dear Mr Fisher,

<<Mục đích thư>> I am writing to [[thank you for|cảm ơn thầy vì]] the excellent photography course that finished last Thursday.

<<Ý 1>> I particularly enjoyed the practical sessions, especially the evening walk along the river when we practised [[night photography|chụp ảnh ban đêm]]. Your explanations were always clear, and you were [[remarkably patient with|kiên nhẫn đáng kể với]] beginners like me, who knew almost nothing about cameras at the start.

<<Ý 2>> Before the course, I only [[took pictures on automatic mode|chụp ảnh ở chế độ tự động]]. Now I understand how to control light and [[compose a shot|bố cục một khung hình]], and my photographs look far more professional. {{In fact}}, a friend has asked me to take photos at her engagement party next month, which I would never have [[had the confidence to do|đủ tự tin để làm]] before.

<<Ý 3>> I am planning to join the advanced course in spring, and I would also like to [[enter a local photography competition|tham gia một cuộc thi nhiếp ảnh địa phương]]. {{Eventually}}, I hope to sell some of my landscape photos online.

<<Kết thư>> Thank you once again for [[all your encouragement|mọi sự động viên của thầy]]. I hope to see you again soon.

Best regards,
Huong Phan` },

    { id: 'gt-gt16', task: 'gt', ref: 'gt16', band: '8.0', words: 160,
      text: `<<Lời chào>> Dear Mr Collins,

<<Mục đích thư>> I am writing to share an idea about [[the club's weekly schedule|lịch tập hằng tuần của câu lạc bộ]].

<<Ý 1>> Since joining Riverside Runners last month, I have really enjoyed the friendly atmosphere. The routes along the canal are beautiful, and the more experienced members are always willing to [[give advice to newcomers|đưa ra lời khuyên cho người mới]]. I have already [[noticed an improvement in|nhận thấy sự tiến bộ về]] my fitness.

<<Ý 2>> {{However}}, the group meets at half past five on weekday evenings, which [[clashes with|trùng với]] my working hours. I do not finish work until six, {{so}} I have only managed to attend two sessions. I have spoken to a few other members who [[are in the same position|ở cùng hoàn cảnh]], and they would also prefer a later start.

<<Ý 3>> Would it be possible to [[move one weekday session|dời một buổi tập trong tuần]] to seven o'clock? {{Alternatively}}, the club could [[add a Saturday morning run|thêm một buổi chạy sáng thứ Bảy]], which might also [[attract new members|thu hút thành viên mới]] who work full-time.

<<Kết thư>> I would be happy to help organise it. Thank you for considering my suggestion.

Kind regards,
Bao Tran` },

    { id: 'gt-gt17', task: 'gt', ref: 'gt17', band: '8.0', words: 170,
      text: `<<Lời chào>> Dear Sam,

<<Mục đích thư>> I hope you're doing well! I've got some exciting news: I've finally moved into my new place, and I'd love you to come to my [[housewarming party|tiệc tân gia]].

<<Ý 1>> It's a two-bedroom flat on the top floor of an old building, so there's [[an amazing view over|tầm nhìn tuyệt đẹp ra]] the river. The living room is [[small but cosy|nhỏ nhưng ấm cúng]], and best of all, there's a tiny balcony where I'm growing herbs and tomatoes.

<<Ý 2>> The party is on Saturday the 14th, from about seven o'clock. It'll be [[a fairly relaxed evening|một buổi tối khá thoải mái]] with a few close friends. I'm planning to [[cook a big pot of|nấu một nồi lớn]] curry, {{but}} feel free to bring some drinks or a dessert if you like.

<<Ý 3>> The easiest way to get here is by bus. Just take the number 23 from the station and [[get off at|xuống xe ở]] Mill Street. My building is opposite the bakery. If you're driving, there's [[plenty of free parking|nhiều chỗ đỗ xe miễn phí]] behind it.

<<Kết thư>> Let me know if you can make it. [[I can't wait to see you|Mình rất mong được gặp bạn]]!

Best wishes,
Nam` },

    { id: 'gt-gt18', task: 'gt', ref: 'gt18', band: '8.0', words: 176,
      text: `<<Lời chào>> Hi Laura,

<<Mục đích thư>> I just wanted to say a huge thank you for [[putting me up|cho mình ở nhờ]] last week. I had such a fantastic time!

<<Ý 1>> You really [[went out of your way|đã cất công hết mức]] to make me feel at home. The spare room was so comfortable, and I still can't believe you took two days off work to show me around. Please say thanks to your parents too for that delicious Sunday lunch.

<<Ý 2>> [[The highlight of the trip|Điểm nhấn của chuyến đi]] was definitely our boat trip around the harbour. The weather was perfect, and watching the sunset from the water was [[absolutely breathtaking|đẹp đến nghẹt thở]]. I also loved the little market near your flat. I've been [[telling everyone about|kể với mọi người về]] those amazing cheese pastries!

<<Ý 3>> Now it's my turn to [[return the favour|đáp lại tấm lòng]]. Why don't you come and stay with me in the autumn? The mountains near my town look stunning [[at that time of year|vào thời điểm đó trong năm]], and we could go hiking together. I've got plenty of space, so you're welcome to bring Mark as well.

<<Kết thư>> Let me know what you think. [[Thanks again for everything|Cảm ơn bạn lần nữa vì tất cả]]!

Love,
Vy` },

    { id: 'gt-gt19', task: 'gt', ref: 'gt19', band: '8.0', words: 168,
      text: `<<Lời chào>> Dear Tom,

<<Mục đích thư>> It was great to hear from you! I'm really excited that you're [[thinking of moving|đang tính chuyển đến]] here, so here's my advice.

<<Ý 1>> Honestly, I think it's a brilliant idea. There are lots of [[job opportunities|cơ hội việc làm]] in your field, and the city is lively without being too stressful. Of course, it's more expensive than your town, {{but}} I'm sure you'd [[settle in quickly|nhanh chóng quen với cuộc sống mới]].

<<Ý 2>> When it comes to finding a flat, I'd [[avoid the city centre|tránh khu trung tâm]], because rents there are crazy. The northern suburbs are much cheaper and only twenty minutes away by train. It's also a good idea to [[share a place with|ở ghép với]] someone at first, at least until you know the area better. Make sure you [[see the flat in person|xem tận mắt căn hộ]] before paying anything.

<<Ý 3>> In your free time, you should definitely join the five-a-side football league. It's [[a great way to meet people|một cách tuyệt vời để làm quen với mọi người]]. There are also brilliant food markets at weekends, and I'd be happy to [[show you around|dẫn bạn đi tham quan]].

<<Kết thư>> Let me know what you decide!

Best wishes,
Hung` },

    { id: 'gt-gt20', task: 'gt', ref: 'gt20', band: '8.0', words: 175,
      text: `<<Lời chào>> Hi Anna,

<<Mục đích thư>> Sorry I haven't been in touch for ages, {{but}} I've got [[some big news|một tin quan trọng]] to share: I've started a new job!

<<Ý 1>> I'm now working as a graphic designer for a small company that makes educational apps for children. I design characters and backgrounds, and I [[work closely with|làm việc chặt chẽ với]] the developers and teachers. The office is right by the sea, so I [[go for a swim|đi bơi]] at lunchtime when the weather's nice!

<<Ý 2>> As you know, I'd been working at the bank for nearly five years, and I was [[getting really bored|ngày càng thấy chán]]. The pay was good, {{but}} I spent all day looking at spreadsheets. I'd always wanted to [[do something more creative|làm điều gì đó sáng tạo hơn]], so when I saw this job advertised, I decided to [[take the plunge|liều một phen]].

<<Ý 3>> So far, I'm loving it. My colleagues are friendly and [[full of ideas|đầy ý tưởng]], and I actually look forward to Mondays now! It's [[a bit of a challenge|hơi thử thách một chút]], because there's so much to learn, but that's part of the fun.

<<Kết thư>> Anyway, tell me all your news soon!

Lots of love,
Trang` },

    { id: 'gt-gt21', task: 'gt', ref: 'gt21', band: '8.0', words: 175,
      text: `<<Lời chào>> Dear Kate,

<<Mục đích thư>> I'm so sorry I missed your birthday dinner on Saturday. I know I promised to be there, and I feel [[absolutely terrible|vô cùng áy náy]] about letting you down.

<<Ý 1>> On Saturday afternoon, my younger brother fell off his bike and hurt his arm quite badly. My parents were away, {{so}} I had to take him to hospital. We [[ended up waiting|rốt cuộc phải chờ]] for nearly six hours, and my phone [[ran out of battery|hết pin]], which is why I couldn't even call you.

<<Ý 2>> I've been [[feeling awful about it|cảm thấy rất tệ về chuyện đó]] ever since. You'd [[gone to so much trouble|đã cất công rất nhiều]] to organise everything, and I hate to think you were waiting for me. Luckily, my brother's arm wasn't broken, just badly bruised.

<<Ý 3>> I'd love to [[make it up to you|bù đắp cho bạn]]. How about I take you out for lunch next weekend at that Italian place you love? It'll be [[my treat|mình mời]], of course. {{Or}}, if you prefer, we could go to the cinema and see that new comedy.

<<Kết thư>> Once again, I'm really sorry. I hope you had [[a wonderful evening|một buổi tối tuyệt vời]] anyway!

Love,
Ha` },

    { id: 'gt-gt22', task: 'gt', ref: 'gt22', band: '8.0', words: 170,
      text: `<<Lời chào>> Hi Ben,

<<Mục đích thư>> How are things? I'm writing because I need to [[ask you a small favour|nhờ bạn một việc nhỏ]].

<<Ý 1>> Lucy and I are planning a camping trip to the Lake District at the end of next month. We're going to spend four nights there and [[go hiking in the hills|đi bộ đường dài trên đồi]] every day. It'll be our first proper camping holiday, so we're both really excited, {{but}} [[a little nervous as well|cũng hơi lo một chút]]!

<<Ý 2>> The problem is that we don't have much equipment yet. Since you're [[an experienced camper|dân cắm trại có kinh nghiệm]], I wondered if we could borrow your two-person tent and a camping stove. If you've got [[a spare sleeping bag|một túi ngủ dự phòng]], that would be brilliant too, as mine is quite thin and it can [[get pretty cold|trở nên khá lạnh]] at night.

<<Ý 3>> We could [[pick everything up|qua lấy đồ]] the day before we leave and bring it back the weekend after the trip. I promise to [[take good care of|giữ gìn cẩn thận]] it all and clean the tent properly before returning it.

<<Kết thư>> Let me know if that's OK. Drinks are [[on me|mình bao]] next time!

Cheers,
Long` },

    { id: 'gt-gt23', task: 'gt', ref: 'gt23', band: '8.0', words: 166,
      text: `<<Lời chào>> Dear Emily,

<<Mục đích thư>> [[Congratulations on your graduation|Chúc mừng bạn tốt nghiệp]]! Your mum told me the news yesterday, and I was so happy for you.

<<Ý 1>> I know how much this means to you. Getting a degree in medicine is [[an incredible achievement|một thành tích phi thường]], and I'm [[so proud of you|vô cùng tự hào về bạn]]. You must be relieved that all those exams are finally over!

<<Ý 2>> Honestly, nobody deserves this more than you. I still remember how you [[stayed up late every night|thức khuya mỗi đêm]] studying, even during the holidays. You also worked part-time at the café to pay your rent, {{and}} you never once complained. Your [[hard work and determination|sự chăm chỉ và quyết tâm]] have really paid off.

<<Ý 3>> We should definitely celebrate together! Why don't we [[go away for the weekend|đi chơi xa cuối tuần]] before you start your new job? We could rent a little cottage by the sea, like we did years ago. {{Alternatively}}, if you're too busy, let's at least have dinner at that fancy restaurant in town. It'll be [[my treat|mình mời]].

<<Kết thư>> Let me know when you're free. Well done again!

Best wishes,
Ngan` },

    { id: 'gt-gt24', task: 'gt', ref: 'gt24', band: '8.0', words: 168,
      text: `<<Lời chào>> Hi Jack,

<<Mục đích thư>> Thanks for your message! You asked about the cooking class I've been doing, so here's [[the lowdown|thông tin chi tiết]].

<<Ý 1>> It's a six-week course at a little cookery school near the market. There are only eight students, and each Tuesday evening we [[cook a three-course meal|nấu một bữa ăn ba món]] from a different country. The teacher, Marco, is a former restaurant chef, and he's [[really easy-going|rất dễ tính]].

<<Ý 2>> I've learnt [[loads of useful skills|vô số kỹ năng hữu ích]]. I can finally chop vegetables quickly without cutting my fingers, and I now know how to make fresh pasta [[from scratch|từ đầu]]. Marco also showed us how to [[plan meals on a budget|lên thực đơn tiết kiệm]], which has saved me quite a lot of money.

<<Ý 3>> I really think you'd enjoy it. You're always saying you [[live on takeaways|sống nhờ đồ ăn mang về]], and this would help you eat more healthily. {{Besides}}, it's a fun way to meet people, and you get to eat everything you cook! The next course starts in March, so you should [[sign up|đăng ký]] soon.

<<Kết thư>> Let me know if you want the website!

Take care,
Phuc` },
  ]);
})(typeof self !== 'undefined' ? self : this);
