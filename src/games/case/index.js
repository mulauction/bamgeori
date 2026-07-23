// ══════════════════════════════════════════════════════════════
//  케이스 (전당포 유실물 상자) — 상자를 열어 랜덤 배수 보상. 릴이 돌아 멈춘다.
//  보상 배수는 가중치 기반, EV=RTP가 되도록 스케일. 결과 사전 확정 후 릴 정지.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { RTP, round2 } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

// 기본 배수·가중치 → 배수를 스케일해 EV=RTP
const BASE_M = [0, 0.5, 1, 2, 5, 15, 75];
const W = [40, 28, 18, 9, 4, 0.9, 0.1];
const TOTW = W.reduce((a, b) => a + b, 0);
const evBase = BASE_M.reduce((a, m, i) => a + (W[i] / TOTW) * m, 0);
const SCALE = RTP / evBase;
const M = BASE_M.map((m) => round2(m * SCALE));

const ITEMW = 80; // 74 + margin 6
const REWARD_IDX = 30;

let view = null;
let reelEl = null;
let stripEl = null;
let busy = false;

function color(m) {
  return m === 0 ? '#555063' : m < 1 ? '#8d82ad' : m < 3 ? '#6fd3ff' : m < 10 ? '#6cf0a8' : '#ffc247';
}
function pickIndex() {
  let r = Math.random() * TOTW;
  for (let i = 0; i < W.length; i++) {
    r -= W[i];
    if (r < 0) return i;
  }
  return 0;
}
function makeItem(mi) {
  const d = document.createElement('div');
  d.className = 'reelitem';
  d.style.background = color(M[mi]);
  d.innerHTML = '<div>' + (M[mi] === 0 ? '꽝' : M[mi] + '×') + '</div>';
  return d;
}

function buildBackdrop(container) {
  view = create3D(container, { height: 120, fov: 55, bg: 0x1a1224 });
  view.camera.position.set(0, 1.5, 4);
  view.camera.lookAt(0, 0.9, 0);
  view.scene.add(new THREE.AmbientLight(0xffffff, 1.3));
  const chest = box(1.6, 0.9, 1.0, 0x6a4a2a);
  chest.position.set(0, 0.8, 0);
  view.scene.add(chest);
  const lid = box(1.65, 0.3, 1.05, 0x8a5c33);
  lid.position.set(0, 1.35, 0);
  view.scene.add(lid);
  const lock = box(0.25, 0.3, 0.1, 0xffc247);
  lock.position.set(0, 1.05, 0.52);
  view.scene.add(lock);
  view.start(() => {});
}

function buildReel(finalMi) {
  stripEl.style.transition = 'none';
  stripEl.style.transform = 'translateX(0)';
  stripEl.innerHTML = '';
  for (let i = 0; i < REWARD_IDX + 12; i++) {
    const mi = i === REWARD_IDX ? finalMi : pickIndex();
    stripEl.appendChild(makeItem(mi));
  }
}

export default {
  id: 'case',
  name: '전당포 유실물 상자',
  sub: '유실물 상자를 연다. 무엇이 나올지는 열어봐야 안다.',
  sign: '유실물상자',
  color: '#e0b3ff',
  district: 'main',
  actionLabel: '상자 열기',
  minBet: 500,
  kind: 'wager',
  payoutMode: 'multiplier',
  preview() {
    return { prob: W.slice(2).reduce((a, b) => a + b, 0) / TOTW, payout: Math.max(...M) };
  },

  mount(container) {
    buildBackdrop(container);
    reelEl = document.createElement('div');
    reelEl.className = 'reel';
    stripEl = document.createElement('div');
    stripEl.className = 'reelstrip';
    const marker = document.createElement('div');
    marker.className = 'reelmarker';
    reelEl.appendChild(stripEl);
    reelEl.appendChild(marker);
    container.appendChild(reelEl);
    buildReel(0);
  },

  reset() {
    busy = false;
    buildReel(0);
  },

  async start() {
    busy = true;
    const mi = pickIndex(); // 결과 사전 확정
    const mult = M[mi];
    buildReel(mi);
    // 릴이 REWARD_IDX 아이템을 중앙 마커에 오게 정지
    const w = reelEl.clientWidth || 320;
    const target = -(REWARD_IDX * ITEMW - w / 2 + ITEMW / 2);
    await wait(60);
    stripEl.style.transition = 'transform 3.1s cubic-bezier(.12,.7,.15,1)';
    stripEl.style.transform = 'translateX(' + target + 'px)';
    await wait(3300);
    toast(mult === 0 ? '꽝…' : mult + '배 획득!');
    await wait(500);
    busy = false;
    return { multiplier: mult };
  },

  unmount() {
    if (view) view.dispose();
    if (reelEl) reelEl.remove();
    view = null;
    reelEl = null;
    stripEl = null;
    busy = false;
  },
};
