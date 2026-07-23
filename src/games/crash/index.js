// ══════════════════════════════════════════════════════════════
//  크래시 (새벽 폭주 배달) — 배수가 오르다 랜덤 폭주(버스트). 전에 캐시아웃.
//  버스트 지점 = crashPoint(): P(≥x)=RTP/x. x에 캐시아웃 시 EV=RTP.
//  버스트 지점은 시작 시 사전 확정(니어미스 없음). NPC 캐시아웃 피드 포함.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { crashPoint, RTP } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { create3D } from './../scene3d.js';
import { box } from '../voxel.js';

const NPC_NAMES = ['철수', '영자', '만수', '따라지', '깜빡이', '왕눈이', '칼치', '점보'];

let view = null;
let bike = null;
let numEl = null;
let feedEl = null;
let cashBtn = null;
let active = false;
let cashed = false;
let curM = 1;
let roundResolve = null;

function buildScene(container) {
  view = create3D(container, { height: 230, fov: 55, bg: 0x0b0c18 });
  view.camera.position.set(2, 3.0, 7);
  view.camera.lookAt(3, 0.8, 0);
  const scene = view.scene;
  scene.add(new THREE.AmbientLight(0x5a5686, 1.4));
  scene.add(new THREE.HemisphereLight(0x8a9ad0, 0x241f38, 0.7));
  const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 4), new THREE.MeshLambertMaterial({ color: 0x12101f }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(10, 0, 0);
  scene.add(road);
  bike = new THREE.Group();
  const body = box(1.0, 0.4, 0.4, 0xff5964);
  body.position.y = 0.5;
  bike.add(body);
  const rider = box(0.4, 0.6, 0.4, 0x2b2136);
  rider.position.set(-0.1, 0.95, 0);
  bike.add(rider);
  const deliverBox = box(0.5, 0.5, 0.5, 0xffc247);
  deliverBox.position.set(-0.4, 0.75, 0);
  bike.add(deliverBox);
  [0.4, -0.4].forEach((x) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 10), new THREE.MeshLambertMaterial({ color: 0x1a1520 }));
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.24, 0);
    bike.add(w);
  });
  scene.add(bike);
}

function feed(msg, win) {
  if (!feedEl) return;
  const row = document.createElement('div');
  row.className = 'feedrow ' + (win ? 'win' : 'bust');
  row.textContent = msg;
  feedEl.prepend(row);
  while (feedEl.children.length > 4) feedEl.lastChild.remove();
}

function settle(win, m) {
  if (!roundResolve) return;
  active = false;
  if (cashBtn) cashBtn.style.display = 'none';
  const r = roundResolve;
  roundResolve = null;
  r({ win, multiplier: win ? m : 0 });
}

export default {
  id: 'crash',
  name: '새벽 폭주 배달',
  sub: '배수가 오르다 폭주한다. 터지기 전에 캐시아웃!',
  sign: '폭주배달',
  color: '#ff7a5a',
  district: 'backalley',
  actionLabel: '출발!',
  minBet: 500,
  kind: 'wager',
  preview() {
    return { prob: RTP / 2, payout: 2 };
  },

  mount(container) {
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    numEl.textContent = '1.00×';
    view.wrap.appendChild(numEl);
    feedEl = document.createElement('div');
    feedEl.className = 'npcfeed';
    view.wrap.appendChild(feedEl);
    cashBtn = document.createElement('button');
    cashBtn.className = 'stopbtn';
    cashBtn.style.display = 'none';
    cashBtn.onclick = () => {
      if (active && !cashed) {
        cashed = true;
        feed('나 ' + curM.toFixed(2) + '배 획득!', true);
        settle(true, curM);
      }
    };
    container.appendChild(cashBtn);
    view.start(() => {});
  },

  reset() {
    if (bike) bike.position.x = 0;
    if (numEl) {
      numEl.textContent = '1.00×';
      numEl.style.color = '';
    }
    if (cashBtn) cashBtn.style.display = 'none';
  },

  start() {
    const crash = crashPoint();
    curM = 1;
    cashed = false;
    active = true;
    numEl.textContent = '1.00×';
    numEl.style.color = '';
    cashBtn.style.display = 'block';
    cashBtn.disabled = crash < 1.01;
    cashBtn.textContent = '💰 캐시아웃 1.00배';
    let lastFeed = 0;
    const t0 = performance.now();
    const rate = 0.32;
    const loop = (t) => {
      if (!active) return;
      const sec = (t - t0) / 1000;
      curM = Math.exp(rate * sec);
      if (crash < 1.01 || curM >= crash) {
        numEl.textContent = '💥 ' + Math.min(crash, 999).toFixed(2) + '×';
        numEl.style.color = '#ff5964';
        feed('폭주! ' + crash.toFixed(2) + '배에서 터짐', false);
        settle(false, 0);
        return;
      }
      numEl.textContent = curM.toFixed(2) + '×';
      bike.position.x = Math.min(30, (curM - 1) * 3);
      cashBtn.textContent = '💰 캐시아웃 ' + curM.toFixed(2) + '배';
      if (t - lastFeed > 800 && Math.random() < 0.5) {
        lastFeed = t;
        const nm = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
        feed(nm + ' ' + curM.toFixed(2) + '배 획득', true);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  unmount() {
    active = false;
    if (view) view.dispose();
    if (feedEl) feedEl.remove();
    if (cashBtn) cashBtn.remove();
    if (roundResolve) {
      const r = roundResolve;
      roundResolve = null;
      r({ win: false, multiplier: 0, aborted: true });
    }
    view = null;
    bike = null;
    numEl = null;
    feedEl = null;
    cashBtn = null;
  },
};
