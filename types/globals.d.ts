// Khai báo biến toàn cục dùng chung giữa các script (web/add-on) – để TypeScript kiểm tra kiểu ở chế độ JSDoc (không đổi mã nguồn)
declare var chrome: any;
declare function t(key: string, vars?: Record<string, any>): string;
interface Window { t: typeof t; [key: string]: any }
declare var I18N: any;
