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
