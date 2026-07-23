// ══════════════════════════════════════════════════════════════
//  홀짝 좌판 (즉석 운) — 사발 속 구슬 개수가 홀/짝. 맞히면 1.9배.
//  p=0.5, 배당 = payoutFor(0.5) (economy 단일 관리, EV=RTP).
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { payoutFor } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';
import { box } from '../voxel.js';
import { makeBlobShadow } from '../visuals.js';

const MULT = payoutFor(0.5); // 1.9

let view = null;
let tableY = 1.06;
let bowl = null;
let bowlTY = 1.75;
let beads = [];
let pickBox = null;
let pick = '';
let busy = false;

function buildScene() {
  const scene = view.scene;
  bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 0.7, 16), new THREE.MeshLambertMaterial({ color: 0xc9402b }));
  bowl.position.set(0, tableY + 0.35, 0);
  bowlTY = bowl.position.y;
  scene.add(bowl);
  const sh = makeBlobShadow(0.9);
  sh.position.set(0, tableY + 0.02, 0);
  scene.add(sh);

  beads = [];
  for (let i = 0; i < 12; i++) {
    const b = box(0.16, 0.16, 0.16, 0xffc247);
    b.position.set(-0.45 + (i % 4) * 0.3, tableY + 0.1, -0.3 + Math.floor(i / 4) * 0.3);
    b.visible = false;
    scene.add(b);
    beads.push(b);
  }
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = '';
  [
    ['홀', '🔵 홀 (홀수)'],
    ['짝', '🔴 짝 (짝수)'],
  ].forEach(([side, label]) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.textContent = label;
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      pick = side;
    };
    pickBox.appendChild(b);
  });
}

function onFrame(_t, dt) {
  if (bowl) bowl.position.y += (bowlTY - bowl.position.y) * Math.min(1, dt * 0.008);
}

export default {
  id: 'holjjak',
  name: '홀짝 좌판',
  sub: '사발 속 구슬이 홀수냐 짝수냐. 맞히면 1.9배.',
  sign: '홀짝',
  color: '#7ec8ff',
  district: 'main',
  actionLabel: '뚜껑 열기',
  minBet: 500,
  kind: 'wager',
  preview() {
    return { prob: 0.5, payout: MULT };
  },

  mount(container) {
    pickBox = document.createElement('div');
    pickBox.className = 'pick2';
    container.appendChild(pickBox);
    buildPicks();
    const T = createTableScene(container, { bg: 0x141a24, tableColor: 0x3a3550 });
    view = T.view;
    tableY = T.tableY;
    buildScene();
    view.start(onFrame);
  },

  isReady() {
    return !!pick;
  },

  reset() {
    busy = false;
    if (bowl) {
      bowl.position.y = tableY + 0.35;
      bowlTY = bowl.position.y;
    }
    beads.forEach((b) => (b.visible = false));
    buildPicks();
  },

  async start() {
    busy = true;
    const parity = Math.random() < 0.5 ? '홀' : '짝'; // 결과 사전 확정 50:50
    const opts = parity === '홀' ? [5, 7, 9, 11] : [4, 6, 8, 10];
    const count = opts[Math.floor(Math.random() * opts.length)];
    bowlTY = tableY + 1.6; // 뚜껑 올림(onFrame이 트윈)
    await wait(650);
    for (let i = 0; i < beads.length; i++) beads[i].visible = i < count;
    toast('구슬 ' + count + '개 — ' + parity + '!');
    await wait(900);
    busy = false;
    return { win: pick === parity, multiplier: MULT };
  },

  unmount() {
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    view = null;
    bowl = null;
    beads = [];
    pickBox = null;
    pick = '';
    busy = false;
  },
};
