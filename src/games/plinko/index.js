// ══════════════════════════════════════════════════════════════
//  플린코 (오락실 구슬 낙하기) — 구슬이 핀을 튕겨 배수 칸에 낙하.
//  결과 칸을 이항분포로 사전 확정 → 그 칸에 닿도록 경로 역산(니어미스 없음).
//  배수는 EV=RTP가 되도록 스케일. 리스크별 스프레드.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RTP, round2 } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

const R = 8;
const SX = 0.44;
const SY = 0.32;
const TOPY = 3.0;
const BINOM = [1, 8, 28, 56, 70, 56, 28, 8, 1].map((c) => c / 256);
const BASE = {
  1: [2.2, 1.5, 1.2, 1.0, 0.6, 1.0, 1.2, 1.5, 2.2],
  2: [5, 2, 1.1, 0.5, 0.3, 0.5, 1.1, 2, 5],
  3: [26, 6, 2, 0.4, 0.2, 0.4, 2, 6, 26],
};
function scaledMults(base) {
  const s = RTP / base.reduce((a, b, k) => a + BINOM[k] * b, 0);
  return base.map((b) => round2(b * s));
}
const MULTS = { 1: scaledMults(BASE[1]), 2: scaledMults(BASE[2]), 3: scaledMults(BASE[3]) };

let view = null;
let ball = null;
let slots = [];
let numEl = null;

function slotX(k) {
  return ((2 * k - R) * SX) / 2;
}
function slotColor(m) {
  return m >= 3 ? 0xffc247 : m >= 1 ? 0x6cf0a8 : 0x3a3550;
}

function buildSlots(mults) {
  slots.forEach((s) => {
    s.geometry.dispose();
    s.material.dispose();
    view.scene.remove(s);
  });
  slots = [];
  for (let k = 0; k <= R; k++) {
    const s = box(SX * 0.9, 0.24, 0.3, slotColor(mults[k]));
    s.position.set(slotX(k), TOPY - R * SY - 0.2, 0);
    view.scene.add(s);
    slots.push(s);
  }
}

function buildScene(container) {
  view = create3D(container, { height: 300, fov: 45, bg: 0x0d1018 });
  view.camera.position.set(0, TOPY - R * SY * 0.5, 6.4);
  view.camera.lookAt(0, TOPY - R * SY * 0.5, 0);
  view.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 0.5);
  key.position.set(1, 4, 5);
  view.scene.add(key);
  // 핀
  for (let r = 1; r < R; r++) {
    for (let i = 0; i <= r; i++) {
      const peg = box(0.09, 0.09, 0.09, 0x8d82ad);
      peg.position.set(((2 * i - r) * SX) / 2, TOPY - r * SY, 0);
      view.scene.add(peg);
    }
  }
  buildSlots(MULTS[2]);
  ball = box(0.2, 0.2, 0.2, 0xff5964);
  ball.position.set(0, TOPY + 0.3, 0.2);
  ball.visible = false;
  view.scene.add(ball);
  view.start(() => {});
}

// 이항분포로 슬롯 추첨
function pickSlot() {
  let r = Math.random();
  for (let k = 0; k <= R; k++) {
    r -= BINOM[k];
    if (r < 0) return k;
  }
  return R;
}

export default {
  id: 'plinko',
  name: '오락실 플린코',
  sub: '구슬을 떨어뜨려 배수 칸에. 가장자리일수록 대박.',
  sign: '플린코',
  color: '#7affea',
  district: 'yasijang',
  actionLabel: '구슬 넣기',
  minBet: 500,
  kind: 'wager',
  payoutMode: 'multiplier', // 칸마다 배수(1 미만 포함) → 부분 반환
  betUI: {
    risk: { label: '리스크', min: 1, max: 3, step: 1, default: 2, format: (v) => ['', '낮음', '중간', '높음'][v] },
  },
  preview({ risk }) {
    const m = MULTS[risk] || MULTS[2];
    let p = 0;
    for (let k = 0; k <= R; k++) if (m[k] >= 1) p += BINOM[k];
    return { prob: p, payout: Math.max(...m) };
  },

  mount(container) {
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    numEl.style.top = 'auto';
    numEl.style.bottom = '6px';
    view.wrap.appendChild(numEl);
  },

  reset() {
    if (ball) ball.visible = false;
    if (numEl) {
      numEl.textContent = '';
      numEl.style.color = '';
    }
  },

  async start(bet, opts) {
    const risk = (opts && opts.risk) || 2;
    const mults = MULTS[risk];
    buildSlots(mults);
    const k = pickSlot(); // 결과 칸 사전 확정
    const mult = mults[k];
    // 경로 역산: 오른쪽 k번, 왼쪽 R-k번을 랜덤 배치
    const dirs = [];
    for (let i = 0; i < R; i++) dirs.push(i < k ? 1 : -1);
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    const pts = [{ x: 0, y: TOPY + 0.3 }];
    let x = 0;
    for (let r = 0; r < R; r++) {
      x += (dirs[r] * SX) / 2;
      pts.push({ x, y: TOPY - (r + 1) * SY });
    }
    ball.position.set(0, TOPY + 0.3, 0.2);
    ball.visible = true;
    const dur = 1500;
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (t) => {
        const u = Math.min(1, (t - t0) / dur);
        const s = u * (pts.length - 1);
        const i = Math.min(pts.length - 2, Math.floor(s));
        const f = s - i;
        ball.position.x = pts[i].x + (pts[i + 1].x - pts[i].x) * f;
        ball.position.y = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
        if (u < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    numEl.textContent = mult + '배';
    numEl.style.color = mult >= 1 ? '#6cf0a8' : '#ff5964';
    toast(mult >= 1 ? mult + '배 당첨!' : mult + '배…');
    await wait(700);
    return { win: mult > 1, multiplier: mult };
  },

  unmount() {
    if (view) view.dispose();
    view = null;
    ball = null;
    slots = [];
    numEl = null;
  },
};
