#!/usr/bin/env bash
# Cài trình duyệt Playwright trên runner, có trần + thử lại (dùng chung cho mọi workflow – thay `timeout 600 npx playwright install …`).
# Vì sao: `playwright install --with-deps` đôi khi treo ở apt (05–06/11: webkit 20 phút, run 42059013822; stitch-web hết 600 s, #780) →
# một lượt treo làm cả job đỏ. Ở đây mỗi lượt ≤ 10 phút, tối đa 3 lượt, giữa các lượt giết apt treo; log lượt lỗi được in để biết treo ở đâu.
# Dùng: bash scripts/ci/pw-install.sh [--with-deps] chromium [webkit …]   (tham số chuyển nguyên cho `npx playwright install`)
set -u
log=$(mktemp)
# macOS (job webkit của teacher-motion chạy macos-latest) không có `timeout` → trần thời gian di động: timeout → gtimeout → perl alarm (alarm sống qua exec).
lim() { if command -v timeout >/dev/null 2>&1; then timeout "$@"; elif command -v gtimeout >/dev/null 2>&1; then gtimeout "$@"; else perl -e 'alarm shift; exec @ARGV or die' "$@"; fi; }
# 11/11: mirror apt của Azure lỗi (Ign:/Err: azure.archive.ubuntu.com) làm đỏ hàng loạt job. Lượt 1–2: có --with-deps, apt tự thử lại 5 lần (Acquire::Retries);
# lượt 3 (chỉ khi chỉ cài chromium – webkit/firefox cần thư viện hệ thống từ apt): BỎ --with-deps (chỉ tải trình duyệt từ CDN Playwright; thư viện hệ thống của ubuntu-latest thường đã có) → không phụ thuộc apt.
# 18/11 (log run 44183778…: webkit kéo 181 gói/125 MB từ mirror ec2, lượt nào cũng đứng giữa chừng 4 phút): Timeout 20 s/kết nối (đứt → apt thử lại thay vì treo),
# không pipeline (lỗi kinh điển của mirror treo), lượt 2+ đổi sang archive.ubuntu.com (mirror gốc) thay vì mirror ec2 tự chọn.
sudo sh -c 'printf "Acquire::Retries \"5\";\nAcquire::http::Timeout \"20\";\nAcquire::http::Pipeline-Depth \"0\";\nAcquire::https::Timeout \"20\";\n" > /etc/apt/apt.conf.d/80-retries' >/dev/null 2>&1 || true
# 17/11: gói .deb của --with-deps nằm trong cache apt của action playwright-cache (PW_APT_CACHE) → lượt sau không tải lại từ mirror.
if [ -n "${PW_APT_CACHE:-}" ] && [ "$(uname)" = Linux ]; then
  mkdir -p "$PW_APT_CACHE/partial" 2>/dev/null || true
  sudo sh -c "echo 'Dir::Cache::Archives \"$PW_APT_CACHE\";' > /etc/apt/apt.conf.d/81-pw-cache" >/dev/null 2>&1 || true
  trap 'sudo rm -f "$PW_APT_CACHE/lock"; sudo chown -R "$(id -u):$(id -g)" "$PW_APT_CACHE" 2>/dev/null || true' EXIT
fi
# 18/11 (log job 134692774871, sau #1574): cache .deb chạy tốt (tải xong nhanh) nhưng bước "Setting up" 181 gói (dpkg giải nén/cấu hình 364 MB) dài hơn 4 phút →
# trần 240 s giết dpkg GIỮA CHỪNG → lượt 2–3 chết ngay "E: dpkg was interrupted". Sửa: trần lượt 1 = 600 s (đủ cho dpkg), và sau mỗi lượt lỗi chạy `dpkg --configure -a` để dọn trạng thái dở.
LIM=600
for i in 1 2 3; do
  if [ "$i" -ge 2 ] && [ "$(uname)" = Linux ]; then sudo sed -i 's#mirror+file:/etc/apt/apt-mirrors.txt#http://archive.ubuntu.com/ubuntu/#' /etc/apt/sources.list.d/ubuntu.sources /etc/apt/sources.list 2>/dev/null || true; sudo rm -rf /var/lib/apt/lists/partial 2>/dev/null || true; fi
  args=("$@"); if [ "$i" = 3 ] && ! printf '%s\n' "$@" | grep -qE '^(webkit|firefox)$'; then args=(); for a in "$@"; do [ "$a" = "--with-deps" ] || args+=("$a"); done; fi
  if lim "$LIM" npx playwright install "${args[@]}" >"$log" 2>&1; then echo "✓ playwright install ${args[*]} (lượt $i)"; exit 0; fi
  echo "::warning::playwright install ${args[*]} lượt $i lỗi/treo quá $((LIM / 60)) phút – thử lại"; tail -25 "$log"
  sudo pkill -f apt-get >/dev/null 2>&1 || true; sudo pkill -f dpkg >/dev/null 2>&1 || true; sleep 3
  [ "$(uname)" = Linux ] && { sudo rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock /var/cache/apt/archives/lock 2>/dev/null; lim 300 sudo dpkg --configure -a >/dev/null 2>&1 || true; }
  sleep $((i * 10))
done
echo "::error::playwright install $* thất bại 3 lượt"; exit 1
