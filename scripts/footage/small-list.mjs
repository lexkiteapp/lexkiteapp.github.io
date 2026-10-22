// In (NUL-ngăn) các file KHÔNG lưu Kho Drive = file nhỏ/không-media ở lại git (cho rsync --files-from=- --from0 trong footage-backup.sh).
import { DEFAULT_ROOT, walk, isArchivable } from './lib.mjs';
const root = process.argv[2] || DEFAULT_ROOT;
process.stdout.write(walk(root).filter(f => !isArchivable(f.rel, f.size)).map(f => f.rel).join('\0'));
