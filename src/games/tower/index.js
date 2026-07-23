// ══════════════════════════════════════════════════════════════
//  타워 (달동네 계단 오르기) — 매 층 3칸 중 안전칸 밟으면 한 층↑, 밟을수록 배수↑.
//  층 배율 = 칸수/안전칸 (공정), RTP는 시작에 한 번만 → 어느 층 캐시아웃도 EV=RTP.
//  함정 위치는 시작 시 사전 확정. 캐시아웃형.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RTP } from '../../core/economy.js';
import { toast } from '../../ui/toast.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

const COLS = 3;
const ROWS = 8;

let view = null;
let gridEl = null;
let cashBtn = null;
let rows = []; // rows[r] = [cell,...]
let traps = []; // traps[r] = Set(col)
let curRow = 0;
let trapsPerRow = 1;
let mult = RTP;
let active = false;
let roundResolve = null;

function stepMult() {
  return COLS / (COLS - trapsPerRow);
}

function buildBackdrop(container) {
  view = create3D(container, { height: 120, fov: 55, bg: 0x0f0d18 });
  view.camera.position.set(2.5, 2.5, 5);
  view.camera.lookAt(1, 1, 0);
  view.scene.add(new THREE.AmbientLight(0x8a86a0, 1.6));
  for (let i = 0; i < 5; i++) {
    const step = box(1.4, 0.4, 1.2, i % 2 ? 0x3a3550 : 0x4a4560);
    step.position.set(i * 0.5, i * 0.4 + 0.2, -i * 0.4);
    view.scene.add(step);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.02), new THREE.MeshBasicMaterial({ color: 0xffdc8c }));
    win.position.set(i * 0.5 - 0.3, i * 0.4 + 0.5, -i * 0.4 + 0.62);
    view.scene.add(win);
  }
  view.start(() => {});
}

function endRound(win, m) {
  active = false;
  rows.forEach((row) => row.forEach((c) => (c.disabled = true)));
  cashBtn.style.display = 'none';
  const r = roundResolve;
  roundResolve = null;
  r?.({ win, multiplier: win ? m : 0 });
}

function pick(r, col) {
  if (!active || r !== curRow) return;
  if (traps[r].has(col)) {
    rows[r][col].classList.add('mine');
    rows[r][col].textContent = '💀';
    traps[r].forEach((tc) => {
      rows[r][tc].classList.add('mine');
      rows[r][tc].textContent = '💀';
    });
    toast('계단이 무너졌다…');
    endRound(false, 0);
    return;
  }
  rows[r][col].classList.add('safe');
  rows[r][col].textContent = '🌙';
  rows[r].forEach((c) => (c.disabled = true));
  mult *= stepMult();
  curRow++;
  cashBtn.disabled = false;
  cashBtn.textContent = '💰 캐시아웃 ' + mult.toFixed(2) + '배';
  if (curRow >= ROWS) {
    endRound(true, mult); // 옥상 도달
    return;
  }
  rows[curRow].forEach((c) => (c.disabled = false));
}

function buildGrid() {
  gridEl.innerHTML = '';
  rows = [];
  // 위층(ROWS-1)이 위에 오도록 렌더
  for (let r = ROWS - 1; r >= 0; r--) {
    const rowEl = document.createElement('div');
    rowEl.className = 'towerrow';
    const cells = [];
    for (let c = 0; c < COLS; c++) {
      const cell = document.createElement('button');
      cell.className = 'minecell';
      cell.disabled = true;
      cell.onclick = () => pick(r, c);
      rowEl.appendChild(cell);
      cells.push(cell);
    }
    rows[r] = cells;
    gridEl.appendChild(rowEl);
  }
}

export default {
  id: 'tower',
  name: '달동네 계단 타워',
  sub: '한 층씩 오를수록 배수 상승. 무너지기 전에 챙겨라.',
  sign: '계단타워',
  color: '#b0a0ff',
  district: 'backalley',
  actionLabel: '오르기 시작',
  minBet: 500,
  kind: 'wager',
  betUI: {
    risk: { label: '층당 함정', min: 1, max: 2, step: 1, default: 1, format: (v) => v + '개' },
  },
  preview({ risk }) {
    const safe = COLS - risk;
    return { prob: safe / COLS, payout: (RTP * COLS) / safe };
  },

  mount(container) {
    buildBackdrop(container);
    gridEl = document.createElement('div');
    gridEl.className = 'towergrid';
    container.appendChild(gridEl);
    buildGrid();
    cashBtn = document.createElement('button');
    cashBtn.className = 'stopbtn';
    cashBtn.style.display = 'none';
    cashBtn.onclick = () => {
      if (active && curRow > 0) endRound(true, mult);
    };
    container.appendChild(cashBtn);
  },

  reset() {
    active = false;
    buildGrid();
    if (cashBtn) cashBtn.style.display = 'none';
  },

  start(bet, opts) {
    trapsPerRow = (opts && opts.risk) || 1;
    curRow = 0;
    mult = RTP;
    buildGrid();
    traps = [];
    for (let r = 0; r < ROWS; r++) {
      const set = new Set();
      while (set.size < trapsPerRow) set.add(Math.floor(Math.random() * COLS));
      traps.push(set);
    }
    active = true;
    rows[0].forEach((c) => (c.disabled = false));
    cashBtn.style.display = 'block';
    cashBtn.disabled = true;
    cashBtn.textContent = '💰 캐시아웃 (한 층 올라라)';
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  unmount() {
    if (view) view.dispose();
    if (gridEl) gridEl.remove();
    if (cashBtn) cashBtn.remove();
    if (roundResolve) {
      const r = roundResolve;
      roundResolve = null;
      r({ win: false, multiplier: 0, aborted: true });
    }
    view = null;
    gridEl = null;
    cashBtn = null;
    rows = [];
    active = false;
  },
};
