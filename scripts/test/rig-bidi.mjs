// bidi dòng bản địa nhiều phông (scripts/rig/bidi.py): câu Ả Rập có “Good name” phải vẽ phải → trái, chữ Latin giữ thứ tự trong nhóm.
// Lỗi gốc 03/11: native_line nối đoạn trái → phải nên tiêu đề ar đảo thứ tự từ (đoạn Latin ở sai phía). Chạy python3 (chỉ thư viện chuẩn).
import { execFileSync } from 'node:child_process';
const py = `
import sys; sys.path.insert(0, 'scripts/rig'); from bidi import visual, base_rtl
A, B = 'ar', 'brand'
def chk(name, runs, want, rtl=None):
    got = [a for a, _ in visual(runs, rtl)]
    assert got == want, (name, got, want); print('✓', name)
chk('ltr giữ nguyên', [('Say “Good name” ', B)], ['Say “Good name”', ' '])
chk('ar + Latin giữa câu', [('قل ', A), ('“Good name” ', B), ('بدلاً', A)], ['بدلاً', ' ', '“Good name”', ' ', 'قل'])
chk('ar: dấu ! cuối (trung tính) theo hướng gốc → bên trái', [('لا تقل', A), ('!', B)], ['!', 'لا تقل'])
chk('ar: hai đoạn Latin liền nhau giữ thứ tự', [('قل ', A), ('Good ', B), ('morning', B)], ['Good', ' ', 'morning', ' ', 'قل'])
chk('ar: số giữa hai đoạn Latin theo LTR', [('قل ', A), ('A ', B), ('2 ', B), ('B', B)], ['A', ' ', '2', ' ', 'B', ' ', 'قل'])
assert base_rtl('“Good” قل') is False and base_rtl('قل “Good”') is True and base_rtl('123') is False; print('✓ hướng gốc = ký tự mạnh đầu tiên')
`;
execFileSync('python3', ['-c', py], { stdio: 'inherit' });
console.log('rig-bidi: ok');
