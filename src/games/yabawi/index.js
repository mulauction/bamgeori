// ══════════════════════════════════════════════════════════════
//  야바위 — 3컵 중 구슬이 든 컵 맞히기 (1층: 순수 운)
//  공통 인터페이스: mount / start / reset / unmount
//  정산은 하지 않는다(economy가 일괄 처리). start는 {win, multiplier} 반환.
// ══════════════════════════════════════════════════════════════

import { CONFIG } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';

const CFG = CONFIG.yabawi;

let wrap = null; // 컵이 놓이는 컨테이너
let ball = 0; // 구슬이 든 슬롯
let slots = []; // 각 컵 엘리먼트가 현재 위치한 슬롯 인덱스
let pickResolve = null; // 플레이어 선택을 기다리는 resolver
let pickable = false;

function slotX(i) {
  const w = wrap.clientWidth;
  const cw = Math.min(w * 0.26, 92);
  return w / 2 - cw * 1.5 - 12 + i * (cw + 12);
}

function buildCups() {
  wrap.innerHTML = '';
  slots = [];
  for (let i = 0; i < CFG.cups; i++) {
    const c = document.createElement('div');
    c.className = 'cup';
    c.dataset.idx = i;
    c.innerHTML = '<div class="ball"></div><div class="cupbody"></div>';
    c.style.left = slotX(i) + 'px';
    c.onclick = () => pick(i);
    wrap.appendChild(c);
    slots[i] = i;
  }
}

async function pick(idx) {
  if (!pickable) return;
  pickable = false;
  const cups = [...wrap.children];
  const picked = cups[idx];
  picked.classList.add('lift');
  const hit = +idx === ball;
  if (hit) picked.querySelector('.ball').classList.add('show');
  await wait(700);
  if (!hit) {
    cups[ball].classList.add('lift');
    cups[ball].querySelector('.ball').classList.add('show');
    await wait(600);
  }
  pickResolve?.({ win: hit, multiplier: CFG.multiplier });
  pickResolve = null;
}

export default {
  id: 'yabawi',
  name: '야바위 포장마차',
  sub: '구슬이 든 컵을 끝까지 쫓아가세요. 맞히면 2배.',
  actionLabel: '구슬 넣고 섞기',
  minBet: 500,
  kind: 'wager',

  mount(container /* , ctx */) {
    container.className = 'yabawi-wrap';
    wrap = container;
    buildCups();
  },

  reset() {
    pickable = false;
    pickResolve = null;
    buildCups();
  },

  // 판돈은 이미 economy.takeBet에서 차감됨. 여기서는 연출 + 결과 판정만.
  async start(/* bet */) {
    buildCups();
    ball = Math.floor(Math.random() * CFG.cups);

    // 구슬을 보여준 뒤 감춘다
    const bc = wrap.children[ball];
    bc.querySelector('.ball').classList.add('show');
    bc.classList.add('lift');
    await wait(900);
    bc.classList.remove('lift');
    await wait(400);
    bc.querySelector('.ball').classList.remove('show');

    // 셔플
    for (let s = 0; s < CFG.shuffleTimes; s++) {
      const a = Math.floor(Math.random() * CFG.cups);
      let b = Math.floor(Math.random() * CFG.cups);
      if (b === a) b = (a + 1) % CFG.cups;
      const ca = [...wrap.children].find((c) => slots[c.dataset.idx] === a);
      const cb = [...wrap.children].find((c) => slots[c.dataset.idx] === b);
      slots[ca.dataset.idx] = b;
      slots[cb.dataset.idx] = a;
      const speed = Math.max(120, 300 - s * 25);
      ca.style.transition = 'left ' + speed + 'ms steps(5)';
      cb.style.transition = 'left ' + speed + 'ms steps(5)';
      ca.style.left = slotX(b) + 'px';
      cb.style.left = slotX(a) + 'px';
      await wait(speed + 40);
    }

    // 플레이어가 컵을 고를 때까지 대기
    pickable = true;
    toast('구슬이 든 컵을 고르세요');
    return new Promise((resolve) => {
      pickResolve = resolve;
    });
  },

  unmount() {
    if (wrap) wrap.innerHTML = '';
    wrap = null;
    pickResolve = null;
    pickable = false;
  },
};
