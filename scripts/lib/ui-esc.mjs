// UI.esc THẬT (cắt từ web/js/ui.js) cho test chạy riêng một tệp mà không nạp ui.js – cùng bản app dùng, không chép lại bảng thoát.
import fs from 'node:fs';
export const uiEsc = new Function('return ' + fs.readFileSync('web/js/ui.js', 'utf8').match(/^\s*const esc = (.*);\s*$/m)[1])();
