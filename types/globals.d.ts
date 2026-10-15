// Khai báo biến toàn cục dùng chung giữa các script (web/add-on) – để TypeScript kiểm tra kiểu ở chế độ JSDoc (không đổi mã nguồn)
declare var chrome: any;
declare function t(key: string, vars?: Record<string, any>): string;
interface Window { t: typeof t; [key: string]: any }
declare var I18N: any;
declare var firebase: any, Core: any, UI: any, VBNative: any, IELTS_DATA: any, Game: any, FIREBASE_CONFIG: any; // module toàn cục nạp bằng <script>
