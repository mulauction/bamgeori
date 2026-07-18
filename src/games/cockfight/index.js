// ══════════════════════════════════════════════════════════════
//  닭싸움 (3D) — 흙바닥 원형 링 + 구경꾼 복셀 NPC. 복셀 닭 2마리가
//  돌진·점프·타격, 타격 시 깃털 파티클 + 카메라 흔들림.
//  능력치 공개·결과는 실제 확률. 전투 시뮬레이션 로직은 2D판과 동일.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { CONFIG } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from '../scene3d.js';
import { makeVoxelChicken, makeCrowd, box } from '../voxel.js';

const CFG = CONFIG.cockfight;
const REST = { blue: -2.0, red: 2.0 };

let view = null;
let chickens = { blue: null, red: null };
let target = { blue: -2.0, red: 2.0 };
let jumpY = { blue: 0, red: 0 };
let jumpV = { blue: 0, red: 0 };
let phase = { blue: 0, red: 0 };
let particles = [];
let shake = 0;

let pickBox = null;
let hpEl = { blue: null, red: null };
let nmEl = { blue: null, red: null };
let blue = null;
let red = null;
let pick = '';
let busy = false;

function rollChicken() {
  return {
    name: CFG.names[Math.floor(Math.random() * CFG.names.length)],
    atk: CFG.atk.min + Math.floor(Math.random() * CFG.atk.span),
    hp: CFG.hp.min + Math.floor(Math.random() * CFG.hp.span),
  };
}

function buildScene() {
  const { scene } = view;
  scene.add(new THREE.AmbientLight(0x726578, 1.5));
  scene.add(new THREE.HemisphereLight(0xd0c0b0, 0x2a2018, 0.8));
  const key = new THREE.DirectionalLight(0xfff0d8, 0.85);
  key.position.set(3, 10, 6);
  scene.add(key);

  // 흙바닥 원형 링
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 4.5, 0.3, 20), new THREE.MeshLambertMaterial({ color: 0x5a4230 }));
  ring.position.y = -0.15;
  scene.add(ring);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(4.5, 0.12, 6, 24), new THREE.MeshLambertMaterial({ color: 0x3a2c1c }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.02;
  scene.add(rim);

  // 구경꾼 8명 (원형 배치, InstancedMesh)
  const crowd = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    crowd.push({ x: Math.cos(a) * 5.4, z: Math.sin(a) * 5.4 - 0.5, ry: -a });
  }
  scene.add(makeCrowd(crowd, { bodyColor: 0x2a2440, headColor: 0x3a3050 }));

  // 닭 2마리 (고정 색, 서로 마주봄)
  const b = makeVoxelChicken(0xe8f4ff);
  b.group.position.set(REST.blue, 0, 0);
  b.group.rotation.y = 0; // +x(중앙) 바라봄
  scene.add(b.group);
  const r = makeVoxelChicken(0xd8a05c);
  r.group.position.set(REST.red, 0, 0);
  r.group.rotation.y = Math.PI; // -x(중앙) 바라봄
  scene.add(r.group);
  chickens = { blue: b, red: r };

  // 깃털 파티클 풀
  particles = [];
  const featherGeo = new THREE.BoxGeometry(0.12, 0.12, 0.03);
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(featherGeo, new THREE.MeshLambertMaterial({ color: 0xf2ead8 }));
    m.visible = false;
    scene.add(m);
    particles.push({ mesh: m, vel: new THREE.Vector3(), life: 0 });
  }
}

function spawnFeathers(x, y, z) {
  let n = 0;
  for (const p of particles) {
    if (p.life > 0) continue;
    p.mesh.position.set(x + (Math.random() - 0.5) * 0.4, y + Math.random() * 0.4, z + (Math.random() - 0.5) * 0.4);
    p.vel.set((Math.random() - 0.5) * 2.4, 1.5 + Math.random() * 2.2, (Math.random() - 0.5) * 2.4);
    p.life = 700 + Math.random() * 400;
    p.mesh.visible = true;
    if (++n >= 10) break;
  }
}

function onFrame(_t, dt) {
  const dts = dt / 1000;
  for (const side of ['blue', 'red']) {
    const g = chickens[side].group;
    g.position.x += (target[side] - g.position.x) * Math.min(1, dt * 0.02);
    // 점프 물리
    jumpV[side] -= 22 * dts;
    jumpY[side] += jumpV[side] * dts;
    if (jumpY[side] < 0) {
      jumpY[side] = 0;
      jumpV[side] = 0;
    }
    g.position.y = jumpY[side];
    phase[side] += dt * 0.02 * (busy ? 1 : 0.3);
    chickens[side].animate(phase[side]);
  }
  // 파티클
  for (const p of particles) {
    if (p.life <= 0) continue;
    p.vel.y -= 9 * dts;
    p.mesh.position.addScaledVector(p.vel, dts);
    p.mesh.rotation.x += dt * 0.01;
    p.life -= dt;
    if (p.life <= 0) p.mesh.visible = false;
  }
  // 카메라 흔들림
  let ox = 0;
  let oy = 0;
  if (shake > 0) {
    ox = (Math.random() - 0.5) * 0.25 * (shake / 300);
    oy = (Math.random() - 0.5) * 0.25 * (shake / 300);
    shake -= dt;
  }
  view.camera.position.set(ox, 3.6 + oy, 6.2);
  view.camera.lookAt(0, 0.9, 0);
}

function buildHud(container) {
  const bars = document.createElement('div');
  bars.className = 'hpbars';
  bars.innerHTML =
    '<div class="hpcol b"><div class="nm"></div><div class="hpbar"><div class="hp" style="width:100%"></div></div></div>' +
    '<div class="hpcol r"><div class="nm"></div><div class="hpbar"><div class="hp" style="width:100%"></div></div></div>';
  container.appendChild(bars);
  nmEl.blue = bars.querySelector('.hpcol.b .nm');
  nmEl.red = bars.querySelector('.hpcol.r .nm');
  hpEl.blue = bars.querySelector('.hpcol.b .hp');
  hpEl.red = bars.querySelector('.hpcol.r .hp');

  pickBox = document.createElement('div');
  pickBox.className = 'pick2';
  container.appendChild(pickBox);
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = '';
  [
    ['blue', '🟦 ' + blue.name],
    ['red', '🟥 ' + red.name],
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

function rollMatch() {
  blue = rollChicken();
  red = rollChicken();
  while (red.name === blue.name) red = rollChicken();
  blue.cur = blue.hp;
  red.cur = red.hp;
  nmEl.blue.textContent = '🟦 ' + blue.name + ' (공' + blue.atk + '/체' + blue.hp + ')';
  nmEl.red.textContent = '(공' + red.atk + '/체' + red.hp + ') ' + red.name + ' 🟥';
  hpEl.blue.style.width = '100%';
  hpEl.red.style.width = '100%';
  buildPicks();
}

async function lunge(side) {
  const dir = side === 'blue' ? 1 : -1;
  target[side] = REST[side] + dir * 1.5;
  jumpV[side] = 6; // 돌진 점프
  await wait(150);
  // 타격 순간: 상대 위치에 깃털 + 흔들림
  const defSide = side === 'blue' ? 'red' : 'blue';
  const dx = chickens[defSide].group.position.x;
  spawnFeathers(dx, 0.9, 0);
  shake = 300;
  await wait(130);
  target[side] = REST[side]; // 복귀
  await wait(200);
}

export default {
  id: 'cockfight',
  name: '뒷골목 닭싸움장',
  sub: '능력치는 공개됩니다. 그래도 닭은 닭 마음대로 싸웁니다. 승리 시 1.9배.',
  actionLabel: '싸움 붙이기',
  minBet: 500,
  kind: 'wager',

  mount(container /* , ctx */) {
    buildHud(container);
    view = create3D(container, { height: 260, fov: 55, bg: 0x141019 });
    view.camera.position.set(0, 3.6, 6.2);
    view.camera.lookAt(0, 0.9, 0);
    buildScene();
    rollMatch();
    view.start(onFrame);
  },

  isReady() {
    return !!pick;
  },

  reset() {
    busy = false;
    target = { blue: REST.blue, red: REST.red };
    jumpY = { blue: 0, red: 0 };
    jumpV = { blue: 0, red: 0 };
    if (chickens.blue) chickens.blue.group.position.set(REST.blue, 0, 0);
    if (chickens.red) chickens.red.group.position.set(REST.red, 0, 0);
    rollMatch();
  },

  async start(/* bet */) {
    busy = true;
    let turn = Math.random() < 0.5 ? 'blue' : 'red';
    const sides = { blue, red };
    while (blue.cur > 0 && red.cur > 0) {
      const atkSide = turn;
      const defSide = turn === 'blue' ? 'red' : 'blue';
      const dmg = Math.floor(sides[atkSide].atk * (CFG.dmgFactor.base + Math.random() * CFG.dmgFactor.span));
      sides[defSide].cur = Math.max(0, sides[defSide].cur - dmg);
      await lunge(atkSide);
      hpEl[defSide].style.width = (sides[defSide].cur / sides[defSide].hp) * 100 + '%';
      await wait(200);
      turn = defSide;
    }
    const winSide = blue.cur > 0 ? 'blue' : 'red';
    toast('🏆 승자: ' + sides[winSide].name);
    await wait(500);
    busy = false;
    return { win: pick === winSide, multiplier: CFG.multiplier };
  },

  unmount() {
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    const bars = document.querySelector('#screen .hpbars');
    if (bars) bars.remove();
    view = null;
    chickens = { blue: null, red: null };
    particles = [];
    pickBox = null;
    blue = red = null;
    pick = '';
    busy = false;
  },
};
