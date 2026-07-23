// ══════════════════════════════════════════════════════════════
//  킨오 (밤거리 복권방) — 36개 중 6개 선택, 6개 추첨. 맞힌 수만큼 배당.
//  배당표는 초기하분포 기준 EV=RTP가 되도록 스케일. 추첨 결과 사전 확정.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RTP, round2 } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

const N = 36;
const K = 6;
const D = 6;

function comb(n, r) {
  if (r < 0 || r > n) return 0;
  r = Math.min(r, n - r);
  let x = 1;
  for (let i = 0; i < r; i++) x = (x * (n - i)) / (i + 1);
  return x;
}
const BASE = { 0: 0, 1: 0, 2: 1, 3: 4, 4: 20, 5: 100, 6: 500 };
let evb = 0;
for (let m = 0; m <= K; m++) evb += ((comb(K, m) * comb(N - K, D - m)) / comb(N, D)) * BASE[m];
const SCALE = RTP / evb;
const PAY = {};
for (let m = 0; m <= K; m++) PAY[m] = round2(BASE[m] * SCALE);

let view = null;
let gridEl = null;
let legendEl = null;
let cells = [];
let sel = new Set();
let busy = false;

function buildBackdrop(container) {
  view = create3D(container, { height: 110, fov: 55, bg: 0x1a0f18 });
  view.camera.position.set(0, 1.6, 4);
  view.camera.lookAt(0, 1, 0);
  view.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
  const balls = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), new THREE.MeshLambertMaterial({ color: [0xff5964, 0xffc247, 0x6cf0a8, 0x6fd3ff, 0xe0b3ff, 0xff9ad0][i] }));
    b.position.set(-1.6 + i * 0.65, 1.0, 0);
    view.scene.add(b);
    balls.push(b);
  }
  view.start((t) => {
    balls.forEach((b, i) => (b.position.y = 1.0 + Math.abs(Math.sin(t * 0.002 + i)) * 0.4));
  });
}

function buildGrid() {
  gridEl.innerHTML = '';
  cells = [];
  sel = new Set();
  for (let i = 1; i <= N; i++) {
    const c = document.createElement('button');
    c.className = 'minecell kenocell';
    c.textContent = i;
    c.onclick = () => {
      if (busy) return;
      if (sel.has(i)) {
        sel.delete(i);
        c.classList.remove('safe');
      } else if (sel.size < K) {
        sel.add(i);
        c.classList.add('safe');
      }
    };
    gridEl.appendChild(c);
    cells.push(c);
  }
}

export default {
  id: 'keno',
  name: '밤거리 복권방',
  sub: '36개 중 6개 찍고, 6개 추첨. 많이 맞힐수록 대박.',
  sign: '복권방',
  color: '#ffd24a',
  district: 'yasijang',
  actionLabel: '추첨!',
  minBet: 500,
  kind: 'wager',
  payoutMode: 'multiplier',
  isReady() {
    return sel.size === K;
  },

  mount(container) {
    buildBackdrop(container);
    legendEl = document.createElement('div');
    legendEl.className = 'sub';
    legendEl.style.textAlign = 'center';
    legendEl.textContent =
      '배당표 — 2개 ' + PAY[2] + '배 · 3개 ' + PAY[3] + '배 · 4개 ' + PAY[4] + '배 · 5개 ' + PAY[5] + '배 · 6개 ' + PAY[6] + '배';
    container.appendChild(legendEl);
    gridEl = document.createElement('div');
    gridEl.className = 'kenogrid';
    container.appendChild(gridEl);
    buildGrid();
  },

  reset() {
    busy = false;
    buildGrid();
  },

  async start() {
    busy = true;
    cells.forEach((c) => (c.disabled = true));
    // 추첨 사전 확정
    const drawn = new Set();
    while (drawn.size < D) drawn.add(1 + Math.floor(Math.random() * N));
    let hits = 0;
    for (const n of drawn) {
      cells[n - 1].classList.add('mine');
      cells[n - 1].textContent = '●';
      if (sel.has(n)) {
        hits++;
        cells[n - 1].classList.remove('mine');
        cells[n - 1].classList.add('safe');
        cells[n - 1].textContent = '★';
      }
      await wait(180);
    }
    const mult = PAY[hits] || 0;
    toast(hits + '개 적중 · ' + mult + '배');
    await wait(700);
    busy = false;
    cells.forEach((c) => (c.disabled = false));
    return { multiplier: mult };
  },

  unmount() {
    if (view) view.dispose();
    if (gridEl) gridEl.remove();
    if (legendEl) legendEl.remove();
    view = null;
    gridEl = null;
    legendEl = null;
    cells = [];
    sel = new Set();
    busy = false;
  },
};
