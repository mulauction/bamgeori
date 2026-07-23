// ══════════════════════════════════════════════════════════════
//  하이로우 (소주뚜껑 높낮이) — 뚜껑 숫자(1~50)보다 다음이 높/낮을지.
//  배당 = payoutFor(해당 확률) → EV=RTP. 연승·캐시아웃. 다음 숫자 사전 확정.
// ══════════════════════════════════════════════════════════════

import { RTP } from '../../core/economy.js';
import { wait } from '../../ui/util.js';

// 공정 배율(1/확률). RTP는 시작 배수에 한 번만 반영 → 어느 시점 캐시아웃도 EV=RTP.
const fair = (p) => 1 / p;
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';
import { box } from '../voxel.js';

const MAXN = 50;

let view = null;
let numEl = null;
let curEl = null;
let pickBox = null;
let cashBtn = null;
let C = 25;
let mult = 1;
let active = false;
let busy = false;
let roundResolve = null;

function probHigh(c) {
  return (MAXN - c) / (MAXN - 1);
}
function probLow(c) {
  return (c - 1) / (MAXN - 1);
}

function buildScene(container) {
  const T = createTableScene(container, { height: 200, bg: 0x10160f, tableColor: 0x3a4a2a, camY: 2.6, camZ: 3.8, lookY: 1.2 });
  view = T.view;
  [-1.2, 1.2].forEach((x) => {
    const bottle = box(0.35, 1.4, 0.35, 0x2a7a3a);
    bottle.position.set(x, T.tableY + 0.7, -0.5);
    view.scene.add(bottle);
  });
  view.start(() => {});
}

function updateButtons() {
  const ph = probHigh(C);
  const pl = probLow(C);
  const bH = pickBox.children[0];
  const bL = pickBox.children[1];
  bH.disabled = ph <= 0;
  bL.disabled = pl <= 0;
  bH.textContent = ph > 0 ? '⬆ 높음 ×' + fair(ph).toFixed(2) : '⬆ 불가';
  bL.textContent = pl > 0 ? '⬇ 낮음 ×' + fair(pl).toFixed(2) : '⬇ 불가';
}

function setPicksEnabled(on) {
  pickBox.querySelectorAll('.dogbtn').forEach((b) => (b.disabled = !on));
  if (on) updateButtons();
}

function showNum() {
  curEl.textContent = '현재 뚜껑: ' + C;
  numEl.textContent = mult.toFixed(2) + '×';
}

function settle(win, m) {
  if (!roundResolve) return;
  active = false;
  setPicksEnabled(false);
  if (cashBtn) cashBtn.style.display = 'none';
  const r = roundResolve;
  roundResolve = null;
  r({ win, multiplier: win ? m : 0 });
}

async function guess(side) {
  if (!active || busy) return;
  busy = true;
  setPicksEnabled(false);
  cashBtn.disabled = true;
  const prob = side === 'high' ? probHigh(C) : probLow(C);
  const pay = fair(prob);
  let next = C;
  while (next === C) next = 1 + Math.floor(Math.random() * MAXN); // ≠ 현재, 사전 확정
  await wait(300);
  const correct = side === 'high' ? next > C : next < C;
  toast('다음 뚜껑: ' + next + (correct ? ' — 적중!' : ' — 꽝'));
  C = next;
  if (correct) {
    mult *= pay;
    showNum();
    cashBtn.disabled = false;
    cashBtn.textContent = '💰 캐시아웃 ' + mult.toFixed(2) + '배';
    busy = false;
    setPicksEnabled(true);
  } else {
    busy = false;
    settle(false, 0);
  }
}

export default {
  id: 'hilo',
  name: '소주뚜껑 하이로우',
  sub: '다음 뚜껑 숫자가 높을까 낮을까. 연승할수록 배수↑.',
  sign: '하이로우',
  color: '#8affc1',
  district: 'yasijang',
  actionLabel: '뚜껑 까기',
  minBet: 500,
  kind: 'wager',

  mount(container) {
    curEl = document.createElement('div');
    curEl.className = 'sub';
    curEl.style.textAlign = 'center';
    container.appendChild(curEl);
    pickBox = document.createElement('div');
    pickBox.className = 'pick2';
    container.appendChild(pickBox);
    ['high', 'low'].forEach((side) => {
      const b = document.createElement('button');
      b.className = 'dogbtn';
      b.onclick = () => guess(side);
      pickBox.appendChild(b);
    });
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    view.wrap.appendChild(numEl);
    cashBtn = document.createElement('button');
    cashBtn.className = 'stopbtn';
    cashBtn.style.display = 'none';
    cashBtn.onclick = () => {
      if (active && mult > 1) settle(true, mult);
    };
    container.appendChild(cashBtn);
    C = 25;
    mult = RTP;
    showNum();
    setPicksEnabled(false);
  },

  reset() {
    active = false;
    busy = false;
    mult = RTP;
    C = 1 + Math.floor(Math.random() * MAXN);
    showNum();
    if (cashBtn) cashBtn.style.display = 'none';
    setPicksEnabled(false);
  },

  start() {
    C = 1 + Math.floor(Math.random() * MAXN);
    mult = RTP;
    active = true;
    busy = false;
    showNum();
    setPicksEnabled(true);
    cashBtn.style.display = 'block';
    cashBtn.disabled = true;
    cashBtn.textContent = '💰 캐시아웃 (맞혀서 배수를 쌓아라)';
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  unmount() {
    active = false;
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    if (cashBtn) cashBtn.remove();
    if (curEl) curEl.remove();
    if (roundResolve) {
      const r = roundResolve;
      roundResolve = null;
      r({ win: false, multiplier: 0, aborted: true });
    }
    view = null;
    numEl = null;
    pickBox = null;
    cashBtn = null;
    curEl = null;
  },
};
