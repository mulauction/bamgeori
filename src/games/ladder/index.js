// ══════════════════════════════════════════════════════════════
//  사다리타기 좌판 (즉석 운) — 상단 택1, 숨은 사다리로 하단 상품 도달.
//  하단 5칸 배수 [0,0,0,1.9,2.85] 평균=0.95=RTP. 도착 칸은 균등(EV불변).
// ══════════════════════════════════════════════════════════════

import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';
import { box } from '../voxel.js';

const PRIZES = [0, 0, 0, 1.9, 2.85]; // 평균 0.95
const TOPS_X = [-1.8, -0.9, 0, 0.9, 1.8];
const TOP_Y = 2.6;
const BOT_Y = 0.5;
const WINP = PRIZES.filter((p) => p > 0).length / PRIZES.length; // 표시용 당첨확률

let view = null;
let token = null;
let plates = [];
let bottomPrizes = [];
let pickBox = null;
let pick = -1;
let busy = false;
let path = [];
let animStart = null;
let animDur = 0;

function plateColor(m) {
  return m === 0 ? 0x555063 : m >= 2.85 ? 0xffc247 : 0x6cf0a8;
}

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
  // 세로 기둥 5 + 가로 연결(장식)
  TOPS_X.forEach((x) => {
    const pole = box(0.08, TOP_Y - BOT_Y + 0.3, 0.08, 0x8a7a5a);
    pole.position.set(x, (TOP_Y + BOT_Y) / 2, 0);
    scene.add(pole);
  });
  for (let r = 0; r < 6; r++) {
    const y = BOT_Y + 0.3 + r * ((TOP_Y - BOT_Y - 0.4) / 5);
    const i = Math.floor(Math.random() * 4);
    const rung = box(0.9, 0.06, 0.06, 0x8a7a5a);
    rung.position.set((TOPS_X[i] + TOPS_X[i + 1]) / 2, y, 0);
    scene.add(rung);
  }
  // 하단 상품 판(색은 등급, 숫자는 결과 시 공개)
  plates = [];
  bottomPrizes = shuffle(PRIZES);
  TOPS_X.forEach((x, i) => {
    const p = box(0.7, 0.12, 0.5, plateColor(bottomPrizes[i]));
    p.position.set(x, BOT_Y - 0.1, 0);
    scene.add(p);
    plates.push(p);
  });
  // 토큰
  token = box(0.22, 0.22, 0.22, 0xff5964);
  token.position.set(0, TOP_Y, 0.2);
  token.visible = false;
  scene.add(token);
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = -1;
  TOPS_X.forEach((x, i) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.textContent = i + 1 + '번';
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((c) => c.classList.remove('sel'));
      b.classList.add('sel');
      pick = i;
    };
    pickBox.appendChild(b);
  });
}

// 폴리라인 u(0..1) 위치
function alongPath(u) {
  const n = path.length - 1;
  const s = Math.min(n - 1e-6, u * n);
  const i = Math.floor(s);
  const f = s - i;
  const a = path[i];
  const b = path[i + 1];
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

function onFrame(t) {
  if (animStart != null && token) {
    const u = Math.min(1, (t - animStart) / animDur);
    const p = alongPath(u);
    token.position.set(p.x, p.y, 0.2);
    if (u >= 1) animStart = null;
  }
}

export default {
  id: 'ladder',
  name: '사다리 좌판',
  sub: '번호를 고르면 숨은 사다리가 상품으로. 최고 2.85배.',
  sign: '사다리',
  color: '#c0ff8a',
  district: 'main',
  actionLabel: '사다리 타기',
  minBet: 500,
  kind: 'wager',
  preview() {
    return { prob: WINP, payout: 2.85 };
  },

  mount(container) {
    pickBox = document.createElement('div');
    pickBox.className = 'pick2';
    container.appendChild(pickBox);
    buildPicks();
    const T = createTableScene(container, { bg: 0x121a14, tableColor: 0x2a3a2a, camY: 2.6, camZ: 5.4, lookY: 1.4 });
    view = T.view;
    buildScene();
    view.start(onFrame);
  },

  isReady() {
    return pick >= 0;
  },
  reset() {
    busy = false;
    animStart = null;
    if (token) token.visible = false;
    buildScene(); // 상품 재배치
    buildPicks();
  },

  async start() {
    busy = true;
    const dest = Math.floor(Math.random() * TOPS_X.length); // 도착 칸 균등
    const mult = bottomPrizes[dest];
    // 지그재그 경로(상단 pick → 하단 dest)
    const midX = (TOPS_X[pick] + TOPS_X[dest]) / 2;
    path = [
      { x: TOPS_X[pick], y: TOP_Y },
      { x: TOPS_X[pick], y: 1.9 },
      { x: midX, y: 1.5 },
      { x: midX, y: 1.1 },
      { x: TOPS_X[dest], y: 0.9 },
      { x: TOPS_X[dest], y: BOT_Y },
    ];
    token.visible = true;
    animDur = 1600;
    animStart = performance.now();
    await wait(animDur + 200);
    toast(mult === 0 ? '꽝!' : mult.toFixed(2) + '배 당첨!');
    await wait(600);
    busy = false;
    return { win: mult > 0, multiplier: mult };
  },

  unmount() {
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    view = null;
    token = null;
    plates = [];
    pickBox = null;
    pick = -1;
    busy = false;
    animStart = null;
  },
};
