/**
 * English translations for Weekly League (web/js/league.js)
 */
(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D.en = Object.assign(D.en || {}, {
  'Bạn đang tham gia bảng xếp hạng 30 người': 'You are currently competing in a 30-learner leaderboard',
  'Rời bảng xếp hạng': 'Leave leaderboard',
  'Rời bảng xếp hạng tuần này? Điểm XP tuần này sẽ bị xóa khỏi giải đấu.': 'Leave this week’s leaderboard? Your XP for this week will be removed from the league.',
  'Đã rời bảng xếp hạng tuần': 'Left the weekly leaderboard',
  'Không thể rời bảng xếp hạng: {msg}': 'Cannot leave leaderboard: {msg}',

  // Tiers
  'Hạng Đồng': 'Bronze League',
  'Hạng Bạc': 'Silver League',
  'Hạng Vàng': 'Gold League',
  'Hạng Ngọc bích': 'Emerald League',
  'Hạng Hồng ngọc': 'Ruby League',
  'Hạng Kim cương': 'Diamond League',

  // Time remaining
  'Đã kết thúc tuần': 'Week ended',
  'còn {d} ngày {h} giờ': '{d}d {h}h left',
  'còn {h} giờ {m} phút': '{h}h {m}m left',
  'còn {m} phút': '{m}m left',

  // Home card & status
  'Thi đua XP cùng 30 người học, thăng hạng mỗi tuần': 'Compete for XP with 30 learners, promote every week',
  'Chưa tham gia': 'Not joined',
  'Gia nhập nhóm 30 người tuần này để thi đua thăng hạng': 'Join this week’s group of 30 to compete for promotion',
  'Vùng thăng hạng': 'Promotion zone',
  'Vùng xuống hạng': 'Demotion zone',
  'Vùng an toàn': 'Safe zone',
  '{xp} XP tuần này': '{xp} XP this week',

  // Nickname modal
  'Đổi biệt danh bảng xếp hạng': 'Change leaderboard nickname',
  'Biệt danh hiển thị trên bảng 30 người tuần này (2–20 ký tự).': 'Nickname displayed on this week’s 30-person board (2–20 characters).',
  'Nhập biệt danh…': 'Enter nickname…',
  'Biệt danh phải từ 2–20 ký tự, không chứa ký tự lạ hoặc liên kết web.': 'Nickname must be 2–20 characters, without strange symbols or web links.',
  'Đã đổi biệt danh thành {nick}': 'Nickname changed to {nick}',
  'Không lưu được biệt danh: {msg}': 'Could not save nickname: {msg}',

  // Welcome / Sign-in
  'Bảng xếp hạng 30 người học cùng hạng · Cập nhật theo tuần': 'Leaderboard of 30 learners in the same tier · Updated weekly',
  'Đua top bảng xếp hạng cùng cộng đồng': 'Climb the leaderboard with the community',
  'Đăng nhập với Google để tham gia giải đấu tuần. Mỗi tuần bạn sẽ được xếp vào một nhóm 30 người học có cùng trình độ để thi đua nhận XP, leo từ Hạng Đồng lên Hạng Kim Cương!': 'Sign in with Google to join the weekly league. Each week you are placed in a group of 30 learners at your level to compete for XP, climbing from Bronze to Diamond!',
  'Thăng hạng': 'Promotion',
  'Top 7 người dẫn đầu thăng hạng vào tuần tới': 'Top 7 leaders are promoted next week',
  'Riêng tư': 'Private',
  'Chỉ hiển thị biệt danh & XP tuần, an toàn tuyệt đối': 'Only nickname & weekly XP are shown, 100% private',
  'Tích lũy XP': 'Earn XP',
  'Học từ mới, ôn thẻ, đọc bài và luyện thi đều cộng XP': 'Learning new words, reviewing cards, reading, and mock tests all earn XP',
  'Không tải được giải đấu': 'Could not load league',
  'Vui lòng kiểm tra kết nối mạng và thử lại.': 'Please check your internet connection and try again.',

  // Join form
  'Tham gia giải đấu tuần': 'Join weekly league',
  'Bắt đầu từ Hạng Đồng · Thi đua cùng 30 người học': 'Start from Bronze League · Compete with 30 learners',
  'Đặt biệt danh của bạn': 'Set your nickname',
  '2–20 ký tự': '2–20 characters',
  'Ví dụ: Alex, Hải Nam, StarGazer…': 'E.g., Alex, Jordan, StarGazer…',
  'Bảo vệ quyền riêng tư:': 'Privacy protection:',
  'Chỉ hiển thị biệt danh và XP tuần trên bảng xếp hạng. Email và thông tin cá nhân của bạn hoàn toàn bảo mật.': 'Only your nickname and weekly XP are displayed on the leaderboard. Your email and personal information remain completely private.',
  'Gia nhập bảng đấu ngay': 'Join the league now',
  'Đã tham gia giải đấu tuần! Chúc bạn thi đua vui vẻ 🎉': 'Joined the weekly league! Have fun competing 🎉',
  'Không tham gia được: {msg}': 'Could not join: {msg}',

  // Header meta & actions
  'Thời gian còn lại': 'Time remaining',
  'Đổi biệt danh': 'Change nickname',

  // Last week banner
  'Chúc mừng! Bạn đã thăng hạng!': 'Congratulations! You’ve been promoted!',
  'Tuần trước bạn đứng hạng #{rank}/{of} với {xp} XP và đã thăng hạng lên {tier}!': 'Last week you finished #{rank}/{of} with {xp} XP and were promoted to {tier}!',
  'Kết quả tuần trước': 'Last week’s result',
  'Tuần trước bạn đứng hạng #{rank}/{of} với {xp} XP và chuyển xuống {tier}. Tuần này hãy cố gắng hơn nhé!': 'Last week you finished #{rank}/{of} with {xp} XP and moved down to {tier}. Give it your best this week!',
  'Giữ vững thứ hạng!': 'Maintained your tier!',
  'Tuần trước bạn đứng hạng #{rank}/{of} với {xp} XP và tiếp tục giữ vững {tier}.': 'Last week you finished #{rank}/{of} with {xp} XP and maintained your place in {tier}.',

  // Hero status
  'Đang trong vùng thăng hạng': 'Currently in promotion zone',
  'Top 7': 'Top 7',
  'Cần thêm XP để tránh xuống hạng': 'Need more XP to avoid demotion',
  'Vị trí an toàn': 'Safe position',
  'Nhóm 30 người': 'Group of 30',
  'Hạng #{rank}': 'Rank #{rank}',

  // Board items & dividers
  'Vùng thăng hạng lên {tier}': 'Promotion zone to {tier}',
  'Hạng 1': 'Rank 1',
  'Hạng 2': 'Rank 2',
  'Hạng 3': 'Rank 3',

  // Rules
  'Quy tắc giải đấu tuần': 'Weekly league rules',
  'Nhóm thi đấu:': 'Competition group:',
  'Mỗi nhóm tối đa 30 người học có cùng bậc xếp hạng.': 'Each group has up to 30 learners in the same tier.',
  'Chu kỳ tuần:': 'Weekly cycle:',
  'Bắt đầu lúc 00:00 UTC thứ Hai và chốt kết quả lúc 23:59 UTC Chủ nhật (giờ quốc tế công bằng cho mọi múi giờ).': 'Starts Monday 00:00 UTC and ends Sunday 23:59 UTC (fair international time across all timezones).',
  'Thăng hạng:': 'Promotion:',
  'Top 7 người có XP cao nhất tuần sẽ được thăng lên bậc kế tiếp (tối đa Hạng Kim Cương).': 'Top 7 learners with the highest XP of the week are promoted to the next tier (up to Diamond League).',
  'Xuống hạng:': 'Demotion:',
  '5 người cuối bảng sẽ xuống bậc trước (áp dụng từ Hạng Bạc trở lên khi nhóm đủ người).': 'Bottom 5 learners move down one tier (applies from Silver League and up when the group is large enough).',
  'Cách kiếm XP:': 'How to earn XP:',
  'Tích lũy XP qua mọi hoạt động: ôn thẻ từ vựng FSRS (+10–15 XP), đọc bài (+10–20 XP), làm trắc nghiệm, luyện thi.': 'Earn XP through all activities: reviewing FSRS vocabulary cards (+10–15 XP), reading articles (+10–20 XP), doing quizzes, and taking mock tests.',
  'Quyền riêng tư:': 'Privacy:',
  'Chỉ hiển thị biệt danh và XP tuần. Bạn có thể đổi biệt danh bất kỳ lúc nào hoặc rời giải đấu trong mục Cài đặt.': 'Only nickname and weekly XP are displayed. You can change your nickname anytime or leave the league in Settings.',
  'Nguy cơ': 'At risk',
  'An toàn': 'Safe',
  'Còn {n} XP để thăng hạng': '{n} XP to promotion',
  'Kiếm +{n} XP để leo hạng': 'Earn +{n} XP to climb',
  'Giữ vững vị trí': 'Hold your spot',
  'Top {n} lên': 'Top {n} advance to',
  'Top {n} giữ hạng': 'Top {n} stay in',
}); })(typeof self !== 'undefined' ? self : this);
