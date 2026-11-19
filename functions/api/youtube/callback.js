// GET /api/youtube/callback – Google OAuth returns here (signed state + session cookie) → encrypted refresh token in D1 → /admin#video. Logic: functions/api/youtube.js
import { handleCallback } from '../youtube.js';
export const onRequestGet = ({ request, env }) => handleCallback(request, env);
