// ══════════════════════════════════════════════════════════════
//  플립 (동전 연승) — 앞/뒤 맞히면 배수 ×1.9, 연승하거나 캐시아웃. 틀리면 꽝.
//  판당 p=0.5, 배당 1.9 = payoutFor(0.5) → EV=RTP. 각 던지기 사전 확정.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RTP } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';

const STEP = 2; // 공정 배율(앞/뒤 0.5). RTP는 시작 배수에 한 번만 반영 → 첫 승 캐시아웃 1.9배

let view = null;
let coin = null;
let numEl = null;
let pickBox = null;
let cashBtn = null;
let mult = 1;
let active = false;
let flipping = false;
let roundResolve = null;

function buildScene(container) {
  const T = createTableScene(container, { height: 220, bg: 0x14140f, tableColor: 0x3a3a24, camY: 2.8, camZ: 4.2, lookY: 1.2 });
  view = T.view;
  coin = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 22), new THREE.MeshLambertMaterial({ color: 0xffc247 }));
  coin.rotation.x = Math.PI / 2;
  coin.position.set(0, T.tableY + 0.7, 0);
  view.scene.add(coin);
  // 앞면 표식
  const mark = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), new THREE.MeshLambertMaterial({ color: 0x8a6410 }));
  mark.position.y = 0.07;
  coin.add(mark);
}

function buildPicks() {
  pickBox.innerHTML = '';
  [
    ['앞', '🪙 앞'],
    ['뒤', '⚪ 뒤'],
  ].forEach(([side, label]) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.textContent = label;
    b.onclick = () => doFlip(side);
    pickBox.appendChild(b);
  });
}

function setPicksEnabled(on) {
  pickBox.querySelectorAll('.dogbtn').forEach((b) => (b.disabled = !on));
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

async function doFlip(side) {
  if (!active || flipping) return;
  flipping = true;
  setPicksEnabled(false);
  cashBtn.disabled = true;
  const res = Math.random() < 0.5 ? '앞' : '뒤'; // 사전 확정 50:50
  for (let i = 0; i < 22; i++) {
    coin.rotation.x += 0.62;
    await wait(20);
  }
  coin.rotation.x = res === '앞' ? Math.PI / 2 : -Math.PI / 2;
  await wait(200);
  if (res === side) {
    mult *= STEP;
    numEl.textContent = mult.toFixed(2) + '×';
    toast(res + '! 적중 · ' + mult.toFixed(2) + '배');
    cashBtn.disabled = false;
    cashBtn.textContent = '💰 캐시아웃 ' + mult.toFixed(2) + '배';
    setPicksEnabled(true);
    flipping = false;
  } else {
    toast('꽝 — ' + res);
    flipping = false;
    settle(false, 0);
  }
}

export default {
  id: 'coinflip',
  name: '동전 연승',
  sub: '앞/뒤 맞힐 때마다 1.9배씩. 욕심낼까, 챙길까?',
  sign: '동전연승',
  color: '#ffe07a',
  district: 'main',
  actionLabel: '동전 꺼내기',
  minBet: 500,
  kind: 'wager',
  preview() {
    return { prob: 0.5, payout: RTP * STEP };
  },

  mount(container) {
    pickBox = document.createElement('div');
    pickBox.className = 'pick2';
    container.appendChild(pickBox);
    buildPicks();
    setPicksEnabled(false);
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    numEl.textContent = '1.00×';
    view.wrap.appendChild(numEl);
    cashBtn = document.createElement('button');
    cashBtn.className = 'stopbtn';
    cashBtn.style.display = 'none';
    cashBtn.onclick = () => {
      if (active && mult > 1) settle(true, mult);
    };
    container.appendChild(cashBtn);
    view.start(() => {});
  },

  reset() {
    active = false;
    flipping = false;
    mult = RTP;
    if (numEl) numEl.textContent = '1.00×';
    if (cashBtn) cashBtn.style.display = 'none';
    setPicksEnabled(false);
  },

  start() {
    mult = RTP;
    active = true;
    flipping = false;
    numEl.textContent = '1.00×';
    setPicksEnabled(true);
    cashBtn.style.display = 'block';
    cashBtn.disabled = true;
    cashBtn.textContent = '💰 캐시아웃 (앞/뒤를 맞혀라)';
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  unmount() {
    active = false;
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    if (cashBtn) cashBtn.remove();
    if (roundResolve) {
      const r = roundResolve;
      roundResolve = null;
      r({ win: false, multiplier: 0, aborted: true });
    }
    view = null;
    coin = null;
    numEl = null;
    pickBox = null;
    cashBtn = null;
  },
};
