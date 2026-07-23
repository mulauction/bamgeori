// ══════════════════════════════════════════════════════════════
//  마인즈 (복어 손질집) — 5x5 중 독(지뢰) M개. 안전칸 손질할수록 배수↑, 캐시아웃.
//  배수 = RTP × ∏(남은칸/남은안전칸). 각 시점 EV = 생존확률 × 배수 = RTP.
//  독 위치는 시작 시 사전 확정(니어미스 없음).
// ══════════════════════════════════════════════════════════════

import { RTP } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';
import { box } from '../voxel.js';

const N = 25;

let view = null;
let gridEl = null;
let cashBtn = null;
let cells = [];
let mines = new Set();
let revealed = 0;
let mult = 1;
let mineCount = 3;
let active = false;
let roundResolve = null;

function buildBackdrop(container) {
  const T = createTableScene(container, { height: 130, bg: 0x0f1a12, tableColor: 0x4a6a3a, camY: 2.4, camZ: 4.0, lookY: 1.1 });
  view = T.view;
  // 도마 위 복어 2마리(장식)
  [
    [-0.9, 0],
    [0.9, 0.2],
  ].forEach(([x, z]) => {
    const f = box(0.6, 0.5, 0.6, 0xffd24a);
    f.position.set(x, T.tableY + 0.3, z);
    view.scene.add(f);
    const eye = box(0.1, 0.1, 0.1, 0x141018);
    eye.position.set(x + 0.28, T.tableY + 0.42, z + 0.18);
    view.scene.add(eye);
  });
  view.start(() => {});
}

function firstStepInfo(M) {
  const safe = N - M;
  return { prob: safe / N, payout: (RTP * N) / safe };
}

function endRound(win, m) {
  active = false;
  cells.forEach((c) => (c.disabled = true));
  cashBtn.style.display = 'none';
  const resolve = roundResolve;
  roundResolve = null;
  resolve?.({ win, multiplier: win ? m : 0 });
}

function reveal(i) {
  if (!active || cells[i].classList.contains('safe') || cells[i].classList.contains('mine')) return;
  if (mines.has(i)) {
    // 독 → 버스트
    cells[i].classList.add('mine');
    cells[i].textContent = '☠️';
    mines.forEach((mi) => {
      cells[mi].classList.add('mine');
      cells[mi].textContent = '☠️';
    });
    toast('독을 건드렸다…');
    endRound(false, 0);
    return;
  }
  // 안전
  cells[i].classList.add('safe');
  cells[i].textContent = '🐡';
  cells[i].disabled = true;
  revealed++;
  mult *= (N - (revealed - 1)) / (N - mineCount - (revealed - 1));
  cashBtn.disabled = false;
  cashBtn.textContent = '💰 캐시아웃 ' + mult.toFixed(2) + '배';
  if (revealed >= N - mineCount) endRound(true, mult); // 전부 손질
}

function buildGrid() {
  gridEl.innerHTML = '';
  cells = [];
  for (let i = 0; i < N; i++) {
    const c = document.createElement('button');
    c.className = 'minecell';
    c.disabled = true;
    c.onclick = () => reveal(i);
    gridEl.appendChild(c);
    cells.push(c);
  }
}

export default {
  id: 'mines',
  name: '복어 손질집 마인즈',
  sub: '독을 피해 손질할수록 배수 상승. 언제든 캐시아웃.',
  sign: '복어손질',
  color: '#ffd24a',
  district: 'backalley',
  actionLabel: '손질 시작',
  minBet: 500,
  kind: 'wager',
  betUI: {
    risk: { label: '독 개수', min: 1, max: 12, step: 1, default: 3, format: (v) => v + '개' },
  },
  preview({ risk }) {
    return firstStepInfo(risk);
  },

  mount(container) {
    buildBackdrop(container);
    gridEl = document.createElement('div');
    gridEl.className = 'minegrid';
    container.appendChild(gridEl);
    buildGrid();
    cashBtn = document.createElement('button');
    cashBtn.className = 'stopbtn';
    cashBtn.style.display = 'none';
    cashBtn.onclick = () => {
      if (active && revealed > 0) endRound(true, mult);
    };
    container.appendChild(cashBtn);
  },

  reset() {
    active = false;
    buildGrid();
    if (cashBtn) cashBtn.style.display = 'none';
  },

  start(bet, opts) {
    mineCount = (opts && opts.risk) || 3;
    revealed = 0;
    mult = RTP; // RTP를 한 번만 반영(각 오픈은 공정 배율) → 어느 시점 캐시아웃도 EV=RTP
    buildGrid();
    // 독 위치 사전 확정
    mines = new Set();
    while (mines.size < mineCount) mines.add(Math.floor(Math.random() * N));
    cells.forEach((c) => (c.disabled = false));
    active = true;
    cashBtn.style.display = 'block';
    cashBtn.disabled = true;
    cashBtn.textContent = '💰 캐시아웃 (안전칸을 손질하세요)';
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  unmount() {
    if (view) view.dispose();
    if (gridEl) gridEl.remove();
    if (cashBtn) cashBtn.remove();
    // 대기 중 라운드 정리
    if (roundResolve) {
      const r = roundResolve;
      roundResolve = null;
      r({ win: false, multiplier: 0, aborted: true });
    }
    view = null;
    gridEl = null;
    cashBtn = null;
    cells = [];
    active = false;
  },
};
