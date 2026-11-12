// GET /api/drive/dl?f=&x=&s= – tải file Kho Drive qua link ký 5 phút (stream, hỗ trợ Range, không lộ token). Logic: functions/api/drive.js
import { handleDownload } from '../drive.js';
export const onRequestGet = ({ request, env }) => handleDownload(request, env);
