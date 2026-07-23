// ══════════════════════════════════════════════════════════════
//  다이스 (야시장 눈금 주사위) — 0~99. 목표 미만이면 승. 승률 슬라이더.
//  승률 = 목표/100, 배당 = payoutFor(승률) → EV=RTP. 결과 사전 확정.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { payoutFor } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { createTableScene } from '../tableScene.js';

let view = null;
let die = null;
let numEl = null;

function buildScene(container) {
  const T = createTableScene(container, { height: 220, bg: 0x1a1024, tableColor: 0x4a2a5a, camY: 2.8, camZ: 4.0, lookY: 1.2 });
  view = T.view;
  die = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), new THREE.MeshLambertMaterial({ color: 0xefe6d8 }));
  die.position.set(0, T.tableY + 0.6, 0);
  // 눈금(점)
  [
    [0, 0, 0.56],
    [0.3, 0.3, 0.56],
    [-0.3, -0.3, 0.56],
  ].forEach(([x, y, z]) => {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.04), new THREE.MeshLambertMaterial({ color: 0xc9402b }));
    dot.position.set(x, y, z);
    die.add(dot);
  });
  view.scene.add(die);
  view.start((t) => {
    die.rotation.y = t * 0.0006;
    die.rotation.x = Math.sin(t * 0.0004) * 0.3;
  });
}

export default {
  id: 'dice',
  name: '야시장 주사위',
  sub: '목표 숫자 미만이 나오면 승. 승률을 조절하라.',
  sign: '주사위',
  color: '#e0b3ff',
  district: 'yasijang',
  actionLabel: '굴리기',
  minBet: 500,
  kind: 'wager',
  betUI: {
    risk: { label: '승률(목표)', min: 2, max: 95, step: 1, default: 50, format: (v) => v + '%' },
  },
  preview({ risk }) {
    return { prob: risk / 100, payout: payoutFor(risk / 100) };
  },

  mount(container) {
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    numEl.textContent = '00';
    view.wrap.appendChild(numEl);
  },

  reset() {
    if (numEl) {
      numEl.textContent = '00';
      numEl.style.color = '';
    }
  },

  async start(bet, opts) {
    const target = (opts && opts.risk) || 50;
    const roll = Math.floor(Math.random() * 100); // 사전 확정
    // 굴리는 연출
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (t) => {
        if (t - t0 > 900) return done();
        numEl.textContent = String(Math.floor(Math.random() * 100)).padStart(2, '0');
        setTimeout(() => requestAnimationFrame(step), 45);
      };
      requestAnimationFrame(step);
    });
    numEl.textContent = String(roll).padStart(2, '0') + ' / ' + target;
    const win = roll < target;
    numEl.style.color = win ? '#6cf0a8' : '#ff5964';
    await wait(700);
    return { win, multiplier: payoutFor(target / 100) };
  },

  unmount() {
    if (view) view.dispose();
    view = null;
    die = null;
    numEl = null;
  },
};
