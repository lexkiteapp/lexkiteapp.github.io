// GET /api/drive/thumb?d=&f=&v=&x=&s= – ảnh thu nhỏ Kho Drive qua proxy (link ký, cache, không lộ token/thumbnailLink). Logic: functions/api/_drive_files.js
import { handleThumb } from '../drive.js';
export const onRequestGet = ({ request, env }) => handleThumb(request, env);
