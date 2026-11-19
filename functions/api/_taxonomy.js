/* ONE source for the library taxonomy (topic → sub-topic, skills, exams, content types). Derived from the content bank (shorts scenes / areas) and the background topics;
 * add new topics / scenes here only. Used by _clip_logic.js (filters), admin-clips.js (facets) and the Channels manager (rules). */
export const TYPES = [['short', 'Shorts', '≤ 60 s · 9:16'], ['long', 'Video dài', '> 60 s'], ['podcast', 'Podcast', 'audio-first · chapters']];
export const SHORT_MAX_SEC = 60;
export const TOPICS = [
  { id: 'travel', vi: 'Du lịch', en: 'Travel', sub: [{ id: 'airport', vi: 'Sân bay', en: 'Airport' }, { id: 'hotel', vi: 'Khách sạn', en: 'Hotel' }] },
  { id: 'food', vi: 'Ăn uống', en: 'Food & drink', sub: [{ id: 'cafe', vi: 'Quán cà phê', en: 'Café' }, { id: 'restaurant', vi: 'Nhà hàng', en: 'Restaurant' }] },
  { id: 'work', vi: 'Công sở', en: 'Work', sub: [{ id: 'interview', vi: 'Phỏng vấn', en: 'Interview' }, { id: 'email', vi: 'Email', en: 'Email' }, { id: 'meeting', vi: 'Họp', en: 'Meetings' }] },
  { id: 'grammar', vi: 'Ngữ pháp', en: 'Grammar', sub: [{ id: 'tenses', vi: 'Thì', en: 'Tenses' }, { id: 'prepositions', vi: 'Giới từ', en: 'Prepositions' }, { id: 'articles', vi: 'Mạo từ', en: 'Articles' }] },
  { id: 'exam', vi: 'Thi cử', en: 'Exams', sub: [{ id: 'ielts', vi: 'IELTS', en: 'IELTS' }, { id: 'toeic', vi: 'TOEIC', en: 'TOEIC' }, { id: 'toefl', vi: 'TOEFL', en: 'TOEFL' }] },
  { id: 'news', vi: 'Tin tức', en: 'News', sub: [{ id: 'anchor', vi: 'Bản tin', en: 'News desk' }] },
  { id: 'daily', vi: 'Đời sống', en: 'Daily life', sub: [{ id: 'shopping', vi: 'Mua sắm', en: 'Shopping' }, { id: 'health', vi: 'Sức khỏe', en: 'Health' }] },
];
export const SKILLS = [['listening', 'Nghe', 'Listening'], ['speaking', 'Nói', 'Speaking'], ['vocab', 'Từ vựng', 'Vocabulary'], ['grammar', 'Ngữ pháp', 'Grammar'], ['pronunciation', 'Phát âm', 'Pronunciation']];
export const EXAMS = ['ielts', 'toeic', 'toefl'];
export const CEFR = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
/** manifest `scene` → [topic, sub-topic]; `area` → skill. */
export const SCENE_TOPIC = { airport: ['travel', 'airport'], hotel: ['travel', 'hotel'], cafe: ['food', 'cafe'], restaurant: ['food', 'restaurant'], news: ['news', 'anchor'], anchor: ['news', 'anchor'] };
export const AREA_SKILL = { listening: 'listening', speaking: 'speaking', roleplay: 'speaking', phrases: 'speaking', pronunciation: 'pronunciation', 'vocab-review': 'vocab', 'word-usage': 'vocab', grammar: 'grammar', 'grammar-check': 'grammar', paraphrase: 'grammar' };
const TOPIC_IDS = new Set(TOPICS.flatMap(t => [t.id, ...t.sub.map(s => t.id + '/' + s.id)]));
export const validTopic = v => TOPIC_IDS.has(v);
