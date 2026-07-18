// 픽셀 스프라이트 드로잉 유틸 (개경주·닭싸움 공용)
// rows: 문자 배열, pal: {문자: 색} 팔레트, '.'/' '는 투명.

export function drawSprite(ctx, rows, pal, x, y, px, flip) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (!col) continue;
      const cx = flip ? x + (row.length - 1 - c) * px : x + c * px;
      ctx.fillStyle = col;
      ctx.fillRect(cx, y + r * px, px, px);
    }
  }
}
