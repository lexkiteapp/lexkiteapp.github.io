/* Cấu hình Firebase Web (khóa API web của Firebase là công khai theo thiết kế; dữ liệu được bảo vệ bằng Security Rules). */
self.FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAPqVo0Fs0HUb5spUaLYZqhFxw1y6zmLnQ',
  authDomain: 'lexkite-app.firebaseapp.com',
  projectId: 'lexkite-app',
  storageBucket: 'lexkite-app.firebasestorage.app',
  messagingSenderId: '616952943069',
  appId: '1:616952943069:web:ef7e4739914d523802a634',
};
self.LK_AUTH = { apple: false }; // Sign in with Apple: chỉ bật khi đã cấu hình Apple trong Firebase (docs/STORE-READINESS.md)
// Đồng bộ local-first qua Google Drive appDataFolder của chính người học (docs/SYNC-DRIVE.md). drive: bật cho web; native: thêm app gốc.
// mode: 'auto' | 'd1' (công tắc từ xa: chỉ D1) | 'off' (chỉ lưu trên máy). every = gom lượt ghi Drive (ms), cap = trần đơn vị Drive API/máy/ngày,
// d1Every = gom lượt ghi D1 (ms; trước 180000 → nay 600000: lượt đẩy D1 typical 9 → 5/ngày, đẩy ngay khi rời trang vẫn giữ). drive:false → mọi máy dùng D1.
self.LK_SYNC = { mode: 'auto', drive: true, native: false, every: 600000, cap: 1200, d1Every: 600000 };
