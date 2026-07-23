// ══════════════════════════════════════════════════════════════
//  치킨로드 (닭싸움장 탈출 소동) — 닭이 차선을 건넌다. 한 칸 건널수록 배수↑.
//  칸 생존확률 p, 배율 1/p(공정), RTP는 시작에 한 번만 → 어느 칸 캐시아웃도 EV=RTP.
//  죽는 차선은 시작 시 사전 확정(니어미스 없음). 캐시아웃형.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RTP } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

const LANES = 8;
const LANEW = 1.3;
const PMAP = { 1: 0.9, 2: 0.78, 3: 0.6 };

let view = null;
let chicken = null;
let cars = [];
let advBtn = null;
let cashBtn = null;
let numEl = null;
let chickenX = 0;
let targetX = 0;
let p = 0.78;
let deathLane = 99;
let lane = 0;
let mult = RTP;
let busy = false;
let active = false;
let roundResolve = null;

function buildScene(container) {
  view = create3D(container, { height: 230, fov: 55, bg: 0x0e0b16 });
  view.camera.position.set(4, 4.5, 7);
  view.camera.lookAt(4, 0, 0);
  view.scene.add(new THREE.AmbientLight(0x6a6488, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 0.5);
  key.position.set(2, 8, 4);
  view.scene.add(key);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(LANES * LANEW + 4, 6), new THREE.MeshLambertMaterial({ color: 0x14101f }));
  road.rotation.x = -Math.PI / 2;
  road.position.set((LANES * LANEW) / 2, 0, 0);
  view.scene.add(road);
  // 차선 선 + 차
  cars = [];
  for (let i = 1; i <= LANES; i++) {
    const line = box(0.06, 0.02, 5.6, 0xffffff);
    line.position.set(i * LANEW - LANEW / 2, 0.02, 0);
    view.scene.add(line);
    const car = box(0.7, 0.5, 1.1, [0xff5964, 0x6fd3ff, 0xffc247, 0x6cf0a8][i % 4]);
    car.position.set(i * LANEW, 0.35, (Math.random() - 0.5) * 4);
    car.userData.sp = 0.02 + Math.random() * 0.02;
    view.scene.add(car);
    cars.push(car);
  }
  // 닭
  chicken = box(0.5, 0.6, 0.5, 0xffffff);
  const comb = box(0.14, 0.2, 0.3, 0xff5964);
  comb.position.y = 0.42;
  chicken.add(comb);
  chicken.position.set(0, 0.4, 0);
  view.scene.add(chicken);
}

function onFrame(_t, dt) {
  // 차 스크롤
  cars.forEach((c) => {
    c.position.z += c.userData.sp * dt;
    if (c.position.z > 3) c.position.z = -3;
  });
  // 닭 이동 보간
  chickenX += (targetX - chickenX) * Math.min(1, dt * 0.012);
  chicken.position.x = chickenX;
  view.camera.position.x = 4 + chickenX * 0.5;
  view.camera.lookAt(chickenX + 1, 0, 0);
}

function endRound(win, m) {
  active = false;
  advBtn.style.display = 'none';
  cashBtn.style.display = 'none';
  const r = roundResolve;
  roundResolve = null;
  r?.({ win, multiplier: win ? m : 0 });
}

async function advance() {
  if (!active || busy) return;
  busy = true;
  advBtn.disabled = true;
  cashBtn.disabled = true;
  lane++;
  targetX = lane * LANEW;
  await wait(420);
  if (lane === deathLane) {
    // 차에 치임
    toast('꼬끼오…! 차에 치였다');
    chicken.rotation.z = Math.PI / 2;
    await wait(500);
    endRound(false, 0);
    return;
  }
  mult *= 1 / p;
  numEl.textContent = mult.toFixed(2) + '×';
  cashBtn.disabled = false;
  cashBtn.textContent = '💰 캐시아웃 ' + mult.toFixed(2) + '배';
  busy = false;
  if (lane >= LANES) {
    endRound(true, mult); // 완전 탈출
    return;
  }
  advBtn.disabled = false;
  advBtn.textContent = '🐔 다음 차선 (' + (1 / p).toFixed(2) + '배)';
}

export default {
  id: 'chickenroad',
  name: '치킨로드',
  sub: '차선을 건널수록 배수↑. 차에 치이기 전에 챙겨라.',
  sign: '치킨로드',
  color: '#ffe07a',
  district: 'backalley',
  actionLabel: '길 건너기 시작',
  minBet: 500,
  kind: 'wager',
  betUI: {
    risk: { label: '위험도', min: 1, max: 3, step: 1, default: 2, format: (v) => ['', '낮음', '중간', '높음'][v] },
  },
  preview({ risk }) {
    const pp = PMAP[risk] || 0.78;
    return { prob: pp, payout: RTP / pp };
  },

  mount(container) {
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    numEl.textContent = '1.00×';
    view.wrap.appendChild(numEl);
    advBtn = document.createElement('button');
    advBtn.className = 'advbtn';
    advBtn.style.display = 'none';
    advBtn.onclick = advance;
    container.appendChild(advBtn);
    cashBtn = document.createElement('button');
    cashBtn.className = 'stopbtn';
    cashBtn.style.display = 'none';
    cashBtn.onclick = () => {
      if (active && lane > 0) endRound(true, mult);
    };
    container.appendChild(cashBtn);
    view.start(onFrame);
  },

  reset() {
    active = false;
    busy = false;
    lane = 0;
    mult = RTP;
    chickenX = 0;
    targetX = 0;
    if (chicken) {
      chicken.rotation.z = 0;
      chicken.position.x = 0;
    }
    if (numEl) numEl.textContent = '1.00×';
    if (advBtn) advBtn.style.display = 'none';
    if (cashBtn) cashBtn.style.display = 'none';
  },

  start(bet, opts) {
    p = PMAP[(opts && opts.risk) || 2];
    lane = 0;
    mult = RTP;
    chickenX = 0;
    targetX = 0;
    if (chicken) {
      chicken.rotation.z = 0;
    }
    // 죽는 차선 사전 확정(기하분포)
    deathLane = 1;
    while (Math.random() < p) deathLane++;
    active = true;
    busy = false;
    numEl.textContent = '1.00×';
    advBtn.style.display = 'block';
    advBtn.disabled = false;
    advBtn.textContent = '🐔 다음 차선 (' + (1 / p).toFixed(2) + '배)';
    cashBtn.style.display = 'block';
    cashBtn.disabled = true;
    cashBtn.textContent = '💰 캐시아웃 (건너서 배수를 쌓아라)';
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  unmount() {
    active = false;
    if (view) view.dispose();
    if (advBtn) advBtn.remove();
    if (cashBtn) cashBtn.remove();
    if (roundResolve) {
      const r = roundResolve;
      roundResolve = null;
      r({ win: false, multiplier: 0, aborted: true });
    }
    view = null;
    chicken = null;
    cars = [];
    numEl = null;
    advBtn = null;
    cashBtn = null;
  },
};
