// GET /api/drive/callback – Google OAuth trả về (state ký + cookie phiên) → lưu refresh token mã hoá → về /admin#drive. Logic: functions/api/drive.js
import { handleCallback } from '../drive.js';
export const onRequestGet = ({ request, env }) => handleCallback(request, env);
