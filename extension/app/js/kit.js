/* Linh vật Kit – chú én Lexkite (SVG thuần, ~3 KB). Kit.svg(cảm xúc, cỡ, hoạt cảnh): happy | win | cheer | think | sad | sleep */
(function (g) {
  const kit = (m = 'happy', s = 120, anim = true) => {
    const NAVY = '#0F3D3E', NAVY2 = '#17595A', RED = '#E5502F', CREAM = '#FFF7EA';
    // Mắt to long lanh trên nền đầu xanh than: tròng trắng + con ngươi + 2 điểm sáng
    const E = (x, y) => `<g class="${anim ? 'blink' : ''}"><ellipse cx="${x}" cy="${y}" rx="10" ry="11" fill="#fff"/><ellipse cx="${x + 1}" cy="${y + 1.5}" rx="7" ry="8" fill="#0F3D3E"/><circle cx="${x + 3.4}" cy="${y - 2.4}" r="2.4" fill="#fff"/><circle cx="${x - 1.4}" cy="${y + 3.8}" r="1.2" fill="#fff" opacity=".85"/></g>`;
    const arc = (x, y, up) => `<path d="M${x - 7} ${y} q7 ${up ? -9 : 7} 14 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    const eyes = {
      happy: E(45, 54) + E(75, 54), think: E(47, 51) + E(77, 51), cheer: E(45, 54) + arc(75, 55, true), win: arc(45, 56, true) + arc(75, 56, true),
      sad: E(45, 56) + E(75, 56) + '<path d="M35 43 q7 -2 13 3 M85 43 q-7 -2 -13 3" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M84 66 q4 7 0 10 q-4 -3 0 -10 Z" fill="#7cd0ee"/>',
      sleep: arc(45, 55, false) + arc(75, 55, false),
    }[m];
    const beak = m === 'sad' ? '<path d="M56 67 q4 -2.5 8 0" stroke="#0F3D3E" stroke-width="3" fill="none" stroke-linecap="round"/>'
      : m === 'win' || m === 'cheer' ? '<path d="M54.5 63 q5.5 8 11 0 Z" fill="#0F3D3E"/><path d="M56 63.5 q4 2 8 0" stroke="#FFD36A" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
      : '<path d="M55.5 62 q4.5 -2 9 0 q-2.2 4.5 -4.5 5.5 q-2.3 -1 -4.5 -5.5 Z" fill="#0F3D3E"/><path d="M56 62.3 q4 -1.2 8 0" stroke="#FFD36A" stroke-width="1.6" fill="none" stroke-linecap="round"/>';
    const up = m === 'win' || m === 'cheer';
    // Cánh dài, nhọn hình lưỡi liềm
    const wingL = up ? `<path d="M30 66 C18 60 8 50 2 38 C14 42 26 50 36 60 Z" fill="${NAVY2}"/>` : `<path d="M30 66 C18 70 8 82 0 100 C14 90 26 84 38 78 Z" fill="${NAVY2}"/>`;
    const wingR = up ? `<path d="M90 66 C102 60 112 50 118 38 C106 42 94 50 84 60 Z" fill="${NAVY2}"/>` : `<path d="M90 66 C102 70 112 82 120 100 C106 90 94 84 82 78 Z" fill="${NAVY2}"/>`;
    const extra = {
      think: '<text x="98" y="28" font-size="22" font-weight="800" fill="#E5502F" font-family="Bricolage Grotesque, sans-serif">?</text>',
      sleep: '<text x="92" y="26" font-size="15" font-weight="800" fill="#7fa8a2" font-family="Figtree, sans-serif">z</text><text x="102" y="16" font-size="11" font-weight="800" fill="#7fa8a2">z</text>',
      win: '<circle cx="10" cy="30" r="4" fill="#FFC94A"/><circle cx="110" cy="24" r="3.5" fill="#E5502F"/><rect x="104" y="44" width="7" height="7" rx="2" fill="#2FBF71" transform="rotate(20 107 47)"/><path d="M14 6 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-4 3 l1 -5 l-4 -3 l5 -1 Z" fill="#FFC94A"/>',
    }[m] || '';
    return `<svg width="${s}" height="${s}" viewBox="0 0 120 120" role="img" aria-label="Kit – chú én">
      ${extra}
      <!-- đuôi én: hai dải dài chẻ sâu -->
      <path d="M55 92 C50 104 40 113 26 119 C40 118 52 111 60 100 C68 111 80 118 94 119 C80 113 70 104 65 92 Z" fill="${NAVY2}"/>
      <g class="${anim ? 'flap-l' : ''}">${wingL}</g><g class="${anim ? 'flap-r' : ''}">${wingR}</g>
      <!-- thân -->
      <path d="M60 22 C82 22 94 40 94 60 C94 82 79 98 60 98 C41 98 26 82 26 60 C26 40 38 22 60 22 Z" fill="${NAVY}"/>
      <ellipse cx="46" cy="32" rx="9" ry="5" fill="#fff" opacity=".22" transform="rotate(-25 46 32)"/>
      <!-- bụng trắng kem -->
      <path d="M60 70 C76 70 86 78 86 86 C84 93 74 98 60 98 C46 98 36 93 34 86 C34 78 44 70 60 70 Z" fill="${CREAM}"/>
      <!-- trán & cổ đỏ gạch -->
      <path d="M52 36 C55 33 65 33 68 36 C66 40 54 40 52 36 Z" fill="${RED}"/>
      <path d="M47 64 C51 60 69 60 73 64 C73 72 67 77 60 77 C53 77 47 72 47 64 Z" fill="${RED}"/>
      ${eyes}${beak}
      ${m === 'sleep' ? '' : '<ellipse cx="32" cy="67" rx="7" ry="4.5" fill="#FF8FA3" opacity=".75"/><ellipse cx="88" cy="67" rx="7" ry="4.5" fill="#FF8FA3" opacity=".75"/>'}
    </svg>`;
  };
  g.Kit = { svg: (m, s, anim = true) => kit(m, s, anim) };
})(typeof self !== 'undefined' ? self : this);
