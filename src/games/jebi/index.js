// ══════════════════════════════════════════════════════════════
//  제비뽑기 좌판 (즉석 운) — 제비 8개 중 1개. 상품 배수 평균=0.95=RTP.
//  상품은 뽑기 전 봉인(사전 확정), 어느 제비를 골라도 EV 동일.
// ══════════════════════════════════════════════════════════════

import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';
import { box } from '../voxel.js';

const PRIZES = [0, 0, 0, 0, 0, 1.9, 2.85, 2.85]; // 합 7.6 / 8 = 0.95
const WINP = PRIZES.filter((p) => p > 0).length / PRIZES.length;
const N = PRIZES.length;

let view = null;
let sticks = [];
let stickPrizes = [];
let restY = [];
let pickBox = null;
let pick = -1;
let busy = false;

function shuffle(a) {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

function buildScene() {
  const scene = view.scene;
  const tableY = view.__tableY;
  // 통
  const cup = box(2.6, 0.7, 0.7, 0x8a5c33);
  cup.position.set(0, tableY + 0.35, 0);
  scene.add(cup);
  // 제비 8개
  sticks = [];
  restY = [];
  stickPrizes = shuffle(PRIZES);
  for (let i = 0; i < N; i++) {
    const s = box(0.12, 1.4, 0.12, 0xefe6d8);
    const x = -1.05 + i * 0.3;
    const y = tableY + 1.0;
    s.position.set(x, y, 0);
    scene.add(s);
    sticks.push(s);
    restY.push(y);
  }
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = -1;
  for (let i = 0; i < N; i++) {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.textContent = i + 1;
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((c) => c.classList.remove('sel'));
      b.classList.add('sel');
      pick = i;
    };
    pickBox.appendChild(b);
  }
}

export default {
  id: 'jebi',
  name: '제비뽑기 좌판',
  sub: '제비 하나를 뽑아라. 최고 2.85배.',
  sign: '제비뽑기',
  color: '#ffd28a',
  district: 'main',
  actionLabel: '제비 뽑기',
  minBet: 500,
  kind: 'wager',
  preview() {
    return { prob: WINP, payout: 2.85 };
  },

  mount(container) {
    pickBox = document.createElement('div');
    pickBox.className = 'dogpick';
    container.appendChild(pickBox);
    buildPicks();
    const T = createTableScene(container, { bg: 0x1a160f, tableColor: 0x4a3a24, camY: 3.0, camZ: 4.8, lookY: 1.3 });
    view = T.view;
    view.__tableY = T.tableY;
    buildScene();
    view.start(() => {});
  },

  isReady() {
    return pick >= 0;
  },
  reset() {
    busy = false;
    buildScene();
    buildPicks();
  },

  async start() {
    busy = true;
    const s = sticks[pick];
    const mult = stickPrizes[pick];
    // 뽑은 제비를 위로
    for (let k = 0; k < 12; k++) {
      s.position.y += 0.06;
      await wait(16);
    }
    if (mult > 0) s.material.color.setHex(mult >= 2.85 ? 0xffc247 : 0x6cf0a8);
    else s.material.color.setHex(0x777);
    toast(mult === 0 ? '꽝!' : mult.toFixed(2) + '배 당첨!');
    await wait(800);
    busy = false;
    return { win: mult > 0, multiplier: mult };
  },

  unmount() {
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    view = null;
    sticks = [];
    pickBox = null;
    pick = -1;
    busy = false;
  },
};
