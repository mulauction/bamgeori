// ══════════════════════════════════════════════════════════════
//  drama — 승부 전/후 연출 오버레이 (경주·닭싸움 공용)
//  · countdown: 시작 전 "3·2·1·출발!" + 삑/땅 소리로 긴장 고조
//  · celebrate: 종료 후 환호 + 색종이 + 우승 배너로 길게 마무리(중독성)
//  host = 게임 3D 뷰의 wrap 엘리먼트(position:relative) 위에 얹는다.
// ══════════════════════════════════════════════════════════════

import { audio } from '../core/audio.js';
import { wait } from '../ui/util.js';

function layer(host, cls) {
  const d = document.createElement('div');
  d.className = 'drama ' + cls;
  host.appendChild(d);
  return d;
}
function restart(node) {
  node.style.animation = 'none';
  void node.offsetWidth;
  node.style.animation = '';
}

export async function countdown(host) {
  const root = layer(host, 'drama-count');
  const num = document.createElement('div');
  num.className = 'drama-num';
  root.appendChild(num);
  for (const s of ['3', '2', '1']) {
    num.textContent = s;
    num.classList.remove('go');
    restart(num);
    audio.play('beep');
    await wait(650);
  }
  num.textContent = '출발!';
  num.classList.add('go');
  restart(num);
  audio.play('start');
  await wait(520);
  root.remove();
}

export async function celebrate(host, { title = '승부 종료', sub = '' } = {}) {
  const root = layer(host, 'drama-celebrate');
  audio.play('cheer');
  const colors = ['#ffc247', '#6cf0a8', '#ff5964', '#6fd3ff', '#e0b3ff'];
  for (let i = 0; i < 44; i++) {
    const c = document.createElement('div');
    c.className = 'drama-confetti';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = Math.random() * 0.5 + 's';
    c.style.animationDuration = 1.2 + Math.random() * 1.3 + 's';
    root.appendChild(c);
  }
  const banner = document.createElement('div');
  banner.className = 'drama-banner';
  banner.innerHTML = '<b>' + title + '</b>' + (sub ? '<span>' + sub + '</span>' : '');
  root.appendChild(banner);
  await wait(2600);
  root.remove();
}
