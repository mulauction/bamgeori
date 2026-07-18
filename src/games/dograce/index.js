// ══════════════════════════════════════════════════════════════
//  개경주 (3D) — 미니 경기장. 복셀 개 4마리가 다리 애니메이션으로 질주,
//  카메라는 선두를 완만히 추적, 결승선 통과 슬로우모션(결과는 사전 확정).
//  개 목록/배당/가중치는 economy.CONFIG.dograce. 결과는 실제 확률(weight).
//  로직·정산 인터페이스는 2D판(legacy2d.js)과 동일.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { CONFIG } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from '../scene3d.js';
import { makeVoxelDog, makeCrowd, box } from '../voxel.js';
import { makeGlow, makeBlobShadow } from '../visuals.js';

const DOGS = CONFIG.dograce.dogs;
const START_X = 1;
const FINISH_X = 26;
const LANES = [-2.4, -0.8, 0.8, 2.4];

let view = null;
let dogs = []; // { obj, group }
let pickBox = null;
let pos = [0, 0, 0, 0];
let phase = [0, 0, 0, 0];
let speeds = [1, 1, 1, 1];
let camX = START_X;
let race = null; // { winner, dur, startT, active, resolve, hold }
let pick = -1;
let busy = false;

// 가중치 기반 우승견 추첨 (실제 확률) — 2D판과 동일
function weightedWinner() {
  const total = DOGS.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < DOGS.length; i++) {
    r -= DOGS[i].weight;
    if (r < 0) return i;
  }
  return 0;
}

function buildScene() {
  const { scene } = view;
  scene.add(new THREE.AmbientLight(0x5a648a, 1.5));
  scene.add(new THREE.HemisphereLight(0x9db4ff, 0x24302a, 0.8));
  const key = new THREE.DirectionalLight(0xd6e2ff, 0.85);
  key.position.set(-6, 12, 8);
  scene.add(key);

  // 트랙 바닥
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 16), new THREE.MeshLambertMaterial({ color: 0x1a2f24 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(13, 0, 0);
  scene.add(ground);
  // 레인 경계선 (레인 사이 5개)
  [-3.2, -1.6, 0, 1.6, 3.2].forEach((z) => {
    const line = box(FINISH_X - START_X + 2, 0.02, 0.08, 0x2f4638);
    line.position.set((START_X + FINISH_X) / 2, 0.02, z);
    scene.add(line);
  });
  // 결승선 (체커)
  for (let r = 0; r < 8; r++) {
    const c = box(0.12, 0.12, 0.5, r % 2 ? 0xefe6d8 : 0x12101c);
    c.position.set(FINISH_X, 0.06 + r * 0.12, -2.6);
    scene.add(c);
  }
  const fpole = box(0.12, 2.6, 0.12, 0xefe6d8);
  fpole.position.set(FINISH_X, 1.3, 3.0);
  scene.add(fpole);

  // 관중석 실루엣 (InstancedMesh 1드로우콜)
  const crowd = [];
  for (let x = 2; x < FINISH_X; x += 1.5) {
    crowd.push({ x, z: -6.0, ry: 0 });
    crowd.push({ x: x + 0.7, z: -7.0, ry: 0 });
  }
  scene.add(makeCrowd(crowd, { bodyColor: 0x232038, headColor: 0x322c4a }));

  // 조명탑 2기 (실제 라이트 없이 밝은 헤드만 — 라이트 수 최소화)
  [6, 20].forEach((x) => {
    const pole = box(0.2, 6, 0.2, 0x2a2440);
    pole.position.set(x, 3, -5.4);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
    head.position.set(x, 6.1, -5.2);
    scene.add(head);
    const glow = makeGlow(0xffe9b0, 4);
    glow.position.set(x, 6.1, -5.0);
    scene.add(glow);
  });

  // 개 4마리
  dogs = [];
  DOGS.forEach((d, i) => {
    const obj = makeVoxelDog(new THREE.Color(d.color).getHex());
    obj.group.position.set(START_X, 0, LANES[i]);
    obj.group.add(makeBlobShadow(0.8));
    scene.add(obj.group);
    dogs.push(obj);
  });
}

function applyDogs(dt, slow) {
  for (let i = 0; i < dogs.length; i++) {
    const g = dogs[i].group;
    g.position.x = START_X + pos[i] * (FINISH_X - START_X);
    phase[i] += dt * 0.02 * (slow ? 0.4 : 1) * (busy ? 1 : 0.25);
    dogs[i].animate(phase[i]);
  }
  // 카메라: 선두 완만 추적
  let lead = 0;
  for (let i = 1; i < pos.length; i++) if (pos[i] > pos[lead]) lead = i;
  const leadX = START_X + pos[lead] * (FINISH_X - START_X);
  camX += (leadX - camX) * 0.06;
  view.camera.position.set(camX - 3.5, 5.2, 9.5);
  view.camera.lookAt(camX + 3, 1.0, -0.5);
}

function onFrame(_t, dt) {
  if (race && race.active) {
    if (race.startT == null) race.startT = _t;
    const raw = (_t - race.startT) / race.dur;
    const slow = raw > 0.85;
    const el = Math.min(1, raw);
    for (let i = 0; i < DOGS.length; i++) {
      const wob = Math.sin(_t / 180 + i * 2) * 0.01;
      const boost = i === race.winner && el > 0.7 ? (el - 0.7) * 0.25 : 0;
      pos[i] = Math.min(1, el * speeds[i] + wob + boost);
    }
    applyDogs(dt, slow);
    if (raw >= 1) {
      race.hold = (race.hold || 0) + dt;
      if (race.hold > 750) {
        race.active = false;
        const resolve = race.resolve;
        race = null;
        resolve?.();
      }
    }
  } else {
    applyDogs(dt, false);
  }
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = -1;
  DOGS.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.innerHTML = d.name + '<span class="odds">×' + d.odds.toFixed(1) + '</span>';
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      pick = i;
    };
    pickBox.appendChild(b);
  });
}

export default {
  id: 'dograce',
  name: '달빛 개경주장',
  sub: '배당이 높을수록 이변입니다. 어디에 거시겠습니까.',
  actionLabel: '출발!',
  minBet: 500,
  kind: 'wager',

  mount(container /* , ctx */) {
    pickBox = document.createElement('div');
    pickBox.className = 'dogpick';
    container.appendChild(pickBox);
    buildPicks();

    view = create3D(container, { height: 260, fov: 55, bg: 0x0c1020, fog: { color: 0x0c1020, near: 22, far: 44 } });
    camX = START_X;
    buildScene();
    view.camera.position.set(camX - 3.5, 5.2, 9.5);
    view.camera.lookAt(camX + 3, 1.0, -0.5);
    view.start(onFrame);
  },

  isReady() {
    return pick >= 0;
  },

  reset() {
    busy = false;
    race = null;
    pos = [0, 0, 0, 0];
    phase = [0, 0, 0, 0];
    camX = START_X;
    buildPicks();
  },

  async start(/* bet */) {
    busy = true;
    const winner = weightedWinner();
    speeds = DOGS.map((_, i) => (i === winner ? 1 : 0.8 + Math.random() * 0.14));
    race = { winner, dur: 4200 + Math.random() * 800, startT: null, active: true, hold: 0, resolve: null };
    await new Promise((resolve) => {
      race.resolve = resolve;
    });
    toast('🏁 우승: ' + DOGS[winner].name);
    await wait(400);
    busy = false;
    // 승리 시 배수는 내가 고른 개의 배당
    return { win: pick === winner, multiplier: DOGS[pick].odds };
  },

  unmount() {
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    view = null;
    dogs = [];
    pickBox = null;
    race = null;
    busy = false;
    pick = -1;
  },
};
