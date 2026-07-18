// ══════════════════════════════════════════════════════════════
//  marqueeBanner — 거리 상단 전광판
//  잭팟 연출이 marquee 큐에 예약한 문구를 거리 상단에서 흘려보낸다.
//  street가 활성일 때만 pump()로 다음 문구를 재생한다.
// ══════════════════════════════════════════════════════════════

import { marquee } from '../fx/marquee.js';

export function initMarquee() {
  const wrap = document.getElementById('streetwrap');
  const bar = document.createElement('div');
  bar.id = 'marquee';
  const span = document.createElement('span');
  bar.appendChild(span);
  wrap.appendChild(bar);

  let showing = false;
  function show(msg) {
    showing = true;
    span.textContent = msg;
    bar.classList.add('on');
    // 애니메이션 재시작
    span.style.animation = 'none';
    void span.offsetWidth;
    span.style.animation = '';
  }
  span.addEventListener('animationend', () => {
    showing = false;
    bar.classList.remove('on');
  });

  return {
    pump() {
      if (showing) return;
      if (marquee.hasNext()) show(marquee.consume());
    },
  };
}
