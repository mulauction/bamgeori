// ══════════════════════════════════════════════════════════════
//  림보 (심야버스 몇 정거장) — 목표 배당 T 설정. 버스가 T 정거장 이상 가면 승.
//  P(도달 ≥ T) = RTP/T, 배당 = T → EV = RTP (리스크 무관). crashPoint()가 도달 배수.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { crashPoint, RTP } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

let view = null;
let bus = null;
let target = null;
let numEl = null;

function trackX(m) {
  return ((Math.min(m, 12) - 1) / 11) * 13; // 배수 1~12 → x 0~13
}

function buildScene() {
  const scene = view.scene;
  scene.add(new THREE.AmbientLight(0x5a5686, 1.4));
  scene.add(new THREE.HemisphereLight(0x8a9ad0, 0x241f38, 0.7));
  const key = new THREE.DirectionalLight(0xbcc8ff, 0.6);
  key.position.set(-4, 10, 6);
  scene.add(key);
  // 도로
  const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 4), new THREE.MeshLambertMaterial({ color: 0x14101f }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(6, 0, 0);
  scene.add(road);
  // 정거장 표지
  for (let i = 1; i <= 12; i++) {
    const pole = box(0.08, 1.2, 0.08, 0x2a2440);
    pole.position.set(trackX(i), 0.6, -1.6);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.1), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
    head.position.set(trackX(i), 1.25, -1.6);
    scene.add(head);
  }
  // 버스
  bus = new THREE.Group();
  const body = box(1.4, 0.7, 0.7, 0xffc247);
  body.position.y = 0.55;
  bus.add(body);
  const cabin = box(1.2, 0.4, 0.62, 0xcfe6ff);
  cabin.position.set(0.05, 1.0, 0);
  bus.add(cabin);
  [
    [0.45, 0.36],
    [0.45, -0.36],
    [-0.45, 0.36],
    [-0.45, -0.36],
  ].forEach(([x, z]) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.14, 10), new THREE.MeshLambertMaterial({ color: 0x1a1520 }));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.2, z);
    bus.add(w);
  });
  bus.position.set(trackX(1), 0, 0);
  scene.add(bus);
  // 목표 깃발
  target = box(0.1, 1.6, 0.1, 0xff5964);
  target.position.set(trackX(2), 0.8, 1.4);
  scene.add(target);
}

export default {
  id: 'limbo',
  name: '심야버스 림보',
  sub: '목표 정거장을 정하라. 버스가 거기까지 가면 그 배당으로.',
  sign: '심야버스',
  color: '#ffd166',
  district: 'backalley',
  actionLabel: '버스 출발',
  minBet: 500,
  kind: 'wager',
  betUI: {
    risk: { label: '목표 배당', min: 1.1, max: 12, step: 0.1, default: 2, format: (v) => v.toFixed(1) + '배' },
  },
  preview({ risk }) {
    return { prob: Math.min(1, RTP / risk), payout: risk };
  },

  mount(container) {
    view = create3D(container, { height: 240, fov: 55, bg: 0x0c1020 });
    view.camera.position.set(5, 3.6, 7.5);
    view.camera.lookAt(6, 0.8, 0);
    buildScene();
    const el = document.createElement('div');
    el.className = 'bignum';
    view.wrap.appendChild(el);
    numEl = el;
    numEl.textContent = '1.00×';
    view.start(() => {});
  },

  reset() {
    if (bus) bus.position.x = trackX(1);
    if (numEl) numEl.textContent = '1.00×';
  },

  async start(bet, opts) {
    const T = (opts && opts.risk) || 2;
    target.position.x = trackX(T);
    const crash = crashPoint();
    const shown = Math.max(crash, T * 0.6);
    const dur = 1600;
    const t0 = performance.now();
    await new Promise((done) => {
      const step = (t) => {
        const u = Math.min(1, (t - t0) / dur);
        const m = 1 + (Math.min(shown, 12) - 1) * u;
        numEl.textContent = m.toFixed(2) + '×';
        bus.position.x = trackX(m);
        if (u < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    const win = crash >= T;
    numEl.textContent = (win ? '✅ ' : '💥 ') + Math.min(crash, 99).toFixed(2) + '×';
    await wait(700);
    return { win, multiplier: T };
  },

  unmount() {
    if (view) view.dispose();
    view = null;
    bus = null;
    target = null;
    numEl = null;
  },
};
