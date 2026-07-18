// 토스트 메시지 (하단 슬라이드)
const el = () => document.getElementById('toast');

let timer = null;

export function toast(msg) {
  const t = el();
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => t.classList.remove('show'), 2200);
}
