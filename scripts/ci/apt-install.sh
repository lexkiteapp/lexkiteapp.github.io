#!/usr/bin/env bash
# MỘT cách cài gói apt trên runner (thay mọi `sudo [timeout 600] apt-get install -y -qq … >/dev/null || true` tự viết trong workflow).
# Gốc lỗi 10/11 (#983 ux1 (0)/(2)): `apt-get install imagemagick fonts-noto-*` không trần, không log → treo mirror 10+ phút, cả job hết
# timeout 14 phút "Cài". Ở đây: gói đã có thì bỏ qua · --no-install-recommends · mỗi lượt có trần APT_INSTALL_TIMEOUT (420 s) ·
# lượt lỗi: giết apt treo, apt-get update rồi thử lại · lượt cuối đổi mirror azure → archive.ubuntu.com · hết lượt → đỏ rõ + log.
# Cache .deb giữa các lượt chạy: APT_CACHE_DIR (composite .github/actions/apt gắn actions/cache theo khoá danh sách gói + ảnh runner).
#   bash scripts/ci/apt-install.sh imagemagick fonts-noto-core …          (trong bước run nhiều lệnh)
#   - uses: ./.github/actions/apt  with: { packages: imagemagick fonts-noto-core }   (ưu tiên: có cache)
# Biến: APT_INSTALL_TIMEOUT (420) · APT_INSTALL_TRIES (3) · APT_CACHE_DIR · APT_SUDO (sudo) · APT_GET (apt-get) – 2 biến cuối cho test.
# Test: scripts/test/apt-install.mjs (treo → thử lại → update → đổi mirror; gói có sẵn bỏ qua; máy gác: workflow không tự gọi apt-get install).
set -u
[ $# -gt 0 ] || { echo "::error::dùng: apt-install.sh <gói…>"; exit 2; }
TO=${APT_INSTALL_TIMEOUT:-420}; TRIES=${APT_INSTALL_TRIES:-3}; CACHE=${APT_CACHE_DIR:-}; SUDO=${APT_SUDO-sudo}; APT=${APT_GET:-apt-get}
need=(); for p in "$@"; do dpkg-query -W -f='${Status}' "$p" 2>/dev/null | grep -q "install ok installed" || need+=("$p"); done
[ ${#need[@]} -gt 0 ] || { echo "✓ apt: đã có sẵn $*"; exit 0; }
# 19/11: fonts-noto-* đi đường .deb trực tiếp (scripts/ci/fonts-install.sh: nhiều mirror, trần chậm, cache, ghim SHA) – apt treo 3 lượt/762 s trên teach-video; phần chưa xử lý được quay lại apt bên dưới
if [ "${APT_FONTS_DIRECT:-1}" = 1 ] && printf '%s\n' "${need[@]}" | grep -q '^fonts-noto-'; then
  left=$(bash "$(dirname "$0")/fonts-install.sh" "${need[@]}"); need=(); for p in $left; do need+=("$p"); done
  [ ${#need[@]} -gt 0 ] || { echo "✓ apt: $* (fonts qua .deb trực tiếp)"; exit 0; }
fi
O=(-y -qq --no-install-recommends -o Acquire::Retries=3 -o Acquire::http::Timeout=20 -o Acquire::https::Timeout=20 -o Acquire::http::Pipeline-Depth=0 -o DPkg::Lock::Timeout=120 -o Dpkg::Use-Pty=0)
[ -n "$CACHE" ] && { mkdir -p "$CACHE/partial"; O+=(-o "Dir::Cache::Archives=$CACHE"); }
export DEBIAN_FRONTEND=noninteractive
log=$(mktemp "${TMPDIR:-/tmp}/apt-install.XXXXXX"); t0=$SECONDS
mirror() { for f in /etc/apt/sources.list /etc/apt/sources.list.d/*.sources /etc/apt/sources.list.d/*.list; do
  [ -f "$f" ] && $SUDO sed -i -e 's#http://azure\.archive\.ubuntu\.com#http://archive.ubuntu.com#g' -e 's#http://[a-z0-9-]*\.ec2\.archive\.ubuntu\.com#http://archive.ubuntu.com#g' -e 's#mirror+file:/etc/apt/apt-mirrors\.txt#http://archive.ubuntu.com/ubuntu/#g' "$f"; done; $SUDO rm -rf /var/lib/apt/lists/partial 2>/dev/null; echo "apt: đổi mirror → archive.ubuntu.com"; }
# chỉ mục apt trống/cũ (runner mới) → update trước, không phí 1 lượt "Unable to locate package"
apt-cache show "${need[0]}" >/dev/null 2>&1 || $SUDO timeout "$TO" "$APT" update -qq -o Acquire::Retries=3 >"$log" 2>&1 || { echo "::warning::apt-get update lỗi"; tail -5 "$log"; }
# 19/11: tải trước .deb (cả phụ thuộc) qua nhiều mirror có trần chậm vào cache – apt install bên dưới không phải chạm mirror mặc định (xem apt-prefetch.sh)
[ -z "$CACHE" ] || [ "${APT_PREFETCH:-1}" != 1 ] || APT_CACHE_DIR="$CACHE" APT_SUDO="$SUDO" APT_GET="$APT" bash "$(dirname "$0")/apt-prefetch.sh" "${need[@]}"
for i in $(seq 1 "$TRIES"); do
  if $SUDO timeout "$TO" "$APT" install "${O[@]}" "${need[@]}" >"$log" 2>&1; then
    [ -z "$CACHE" ] || { $SUDO chown -R "$(id -u):$(id -g)" "$CACHE" 2>/dev/null; rm -f "$CACHE/lock"; }   # actions/cache lưu được
    echo "✓ apt: ${need[*]} (lượt $i, $((SECONDS - t0)) s)"; exit 0
  fi
  echo "::warning::apt: cài ${need[*]} lượt $i/$TRIES lỗi/treo quá ${TO}s"; tail -15 "$log"
  [ "$i" -lt "$TRIES" ] || break
  $SUDO pkill -f "$APT" >/dev/null 2>&1; $SUDO pkill -f dpkg >/dev/null 2>&1; sleep 2; $SUDO rm -f /var/lib/dpkg/lock-frontend /var/lib/dpkg/lock 2>/dev/null; $SUDO timeout 300 dpkg --configure -a >/dev/null 2>&1   # dpkg bị giết giữa chừng → 'dpkg was interrupted' ở lượt sau (#1590)
  mirror   # 18/11: đổi mirror từ lượt 2 (mirror ec2 tự chọn treo cả 3 lượt – log ux1 #1354, webkit #1550), không đợi lượt cuối
  $SUDO timeout "$TO" "$APT" update -qq -o Acquire::Retries=3 >"$log" 2>&1 || { echo "::warning::apt-get update lỗi"; tail -5 "$log"; }
done
echo "::error::apt: không cài được ${need[*]} sau $TRIES lượt ($((SECONDS - t0)) s)"; exit 1
