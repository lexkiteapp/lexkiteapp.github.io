// Điểm (x,y) có nằm ngoài góc bo của hộp (l,t,w,h,bán kính r) không? Hộp chữ tròn (huy hiệu "A", avatar "AN") có 4 góc là NỀN TRANG, không phải nền chữ – đo tương phản không được tính chúng.
export const outsideRound = (x, y, l, t, w, h, r) => {
  r = Math.min(r || 0, w / 2, h / 2); if (r < 1) return false;
  const cx = x < l + r ? l + r : x > l + w - r ? l + w - r : x, cy = y < t + r ? t + r : y > t + h - r ? t + h - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 > r * r;
};
