// Luật i18n dùng chung: scripts/i18n-qa.mjs (giao diện) + scripts/video/teach2d/native-qa.mjs (chữ bản địa trên clip L1 / bài đăng).
export const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chỉ chữ riêng của tiếng Việt (â ê ô cũng có trong tiếng Pháp/Bồ Đào Nha)
export const BAD = /\b(Currículo|Currículum|Lebenslauf|CV)\b|简历|이력서|बायोडाटा|Резюме|Mirar hacia arriba|Olhe para cima|Schau nach oben|抬头看|見上げ|올려다|ऊपर देखो|Посмотрите вверх|Yukarıya bak|Lihatlah ke atas|มองขึ้น/;

// Giọng xưng hô (quy ước app, docs/I18N-PIPELINE.md §3b): de = Sie, fr = vous (khớp chữ native đã phát hành). Dấu hiệu "du/tu" lọt vào → lỗi (trừ khóa nợ cũ trong scripts/i18n-register-legacy.json).
export const INFORMAL = { de: /\b(du|dein|deine|deinen|deinem|deiner|deines|dich|dir)\b/i, fr: /\b(tu|toi|tes|ton|ta)\b(?!\s*(?:de|du)\b)/i };
