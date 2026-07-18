// ══════════════════════════════════════════════════════════════
//  야바위 (3D) — 포장마차 내부. 나무 좌판 위 복셀 컵 3개가 실제 3D로 섞임.
//  컵을 탭(레이캐스트)해 선택, 들어올리면 구슬. 주인 NPC가 좌판 뒤에 섬.
//  로직·확률·정산 인터페이스는 2D판과 동일(legacy2d.js 보존). 표현만 3D.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { CONFIG } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from '../scene3d.js';
import { makeVoxelPerson, box } from '../voxel.js';
import { makeGlow, makeBlobShadow } from '../visuals.js';

const CFG = CONFIG.yabawi;

const SLOT_X = [-1.15, 0, 1.15];
const COUNTER_TOP = 1.0;
const CUP_H = 0.62;
const REST_Y = COUNTER_TOP + CUP_H / 2;
const LIFT_Y = REST_Y + 0.8;

let view = null;
let cups = []; // { group, body, index, slot, tx, ty, lifted }
let cupBodies = [];
let marble = null;
let ball = 0;
let pickable = false;
let pickResolve = null;
let onPointer = null;

function slotX(slot) {
  return SLOT_X[slot];
}
function setLift(cup, lifted) {
  cup.lifted = lifted;
  cup.ty = lifted ? LIFT_Y : REST_Y;
}
function placeInstant(cup) {
  cup.tx = slotX(cup.slot);
  cup.ty = cup.lifted ? LIFT_Y : REST_Y;
  cup.group.position.set(cup.tx, cup.ty, 0);
}

function buildScene() {
  const { scene } = view;

  scene.add(new THREE.AmbientLight(0x6a6488, 1.5));
  scene.add(new THREE.HemisphereLight(0xaab0e0, 0x2a2438, 0.7));
  const lantern = new THREE.PointLight(0xffc266, 2.0, 16);
  lantern.position.set(0, 3.0, 1.6);
  scene.add(lantern);
  const lanternGlow = makeGlow(0xffc266, 3.2);
  lanternGlow.position.set(0, 2.9, 1.6);
  scene.add(lanternGlow);
  const key = new THREE.DirectionalLight(0xfff0d0, 0.6);
  key.position.set(2, 5, 4);
  scene.add(key);

  // 좌판(카운터)
  const counter = box(3.2, 1.0, 1.3, 0x8a5c33);
  counter.position.set(0, 0.5, 0);
  scene.add(counter);
  const top = box(3.24, 0.08, 1.34, 0xa06a3e);
  top.position.set(0, 1.02, 0);
  scene.add(top);

  // 천막(줄무늬 느낌은 두 조각으로 근사)
  const awning = box(3.6, 0.22, 1.7, 0xe0512f);
  awning.position.set(0, 2.75, 0.1);
  scene.add(awning);
  const stripe = box(3.62, 0.24, 0.28, 0xefe6d8);
  stripe.position.set(0, 2.75, -0.4);
  scene.add(stripe);
  // 기둥
  [-1.6, 1.6].forEach((x) => {
    const pole = box(0.14, 2.7, 0.14, 0x6a4a2a);
    pole.position.set(x, 1.35, 0.7);
    scene.add(pole);
  });

  // 주인 NPC (좌판 뒤)
  const keeper = makeVoxelPerson({ skin: 0xe6b58c, shirt: 0x5b3a2a, pants: 0x2b2136 });
  keeper.position.set(0, 0, -1.0);
  keeper.add(makeBlobShadow(0.6));
  scene.add(keeper);

  // 컵 3개
  cups = [];
  cupBodies = [];
  for (let i = 0; i < CFG.cups; i++) {
    const group = new THREE.Group();
    const body = box(0.62, CUP_H, 0.62, 0xc9402b);
    body.userData.cupIndex = i;
    group.add(body);
    const rim = box(0.66, 0.1, 0.66, 0xe86a4f);
    rim.position.y = CUP_H / 2 - 0.05;
    group.add(rim);
    scene.add(group);
    const cup = { group, body, index: i, slot: i, tx: 0, ty: REST_Y, lifted: false };
    placeInstant(cup);
    cups.push(cup);
    cupBodies.push(body);
  }

  // 구슬
  marble = box(0.24, 0.24, 0.24, 0xffc247);
  marble.position.set(slotX(ball), COUNTER_TOP + 0.13, 0.05);
  marble.visible = false;
  scene.add(marble);
}

function onFrame(_t, dt) {
  const k = Math.min(1, dt * 0.012);
  for (const cup of cups) {
    const p = cup.group.position;
    p.x += (cup.tx - p.x) * k;
    p.y += (cup.ty - p.y) * k;
  }
  if (cups[ball]) marble.position.x = cups[ball].group.position.x;
}

async function pick(cup) {
  if (!pickable) return;
  pickable = false;
  setLift(cup, true);
  const hit = cup.index === ball;
  if (hit) {
    marble.position.x = cup.group.position.x;
    marble.visible = true;
  }
  await wait(700);
  if (!hit) {
    setLift(cups[ball], true);
    marble.visible = true;
    await wait(600);
  }
  const resolve = pickResolve;
  pickResolve = null;
  resolve?.({ win: hit, multiplier: CFG.multiplier });
}

export default {
  id: 'yabawi',
  name: '야바위 포장마차',
  sub: '구슬이 든 컵을 끝까지 쫓아가세요. 맞히면 2배.',
  actionLabel: '구슬 넣고 섞기',
  minBet: 500,
  kind: 'wager',

  mount(container /* , ctx */) {
    view = create3D(container, { height: 280, fov: 50, bg: 0x140f1e });
    view.camera.position.set(0, 2.5, 4.5);
    view.camera.lookAt(0, 1.15, -0.1);
    buildScene();

    const hint = document.createElement('div');
    hint.className = 'cv3d-hint';
    hint.textContent = '컵을 탭해서 고르세요';
    view.wrap.appendChild(hint);

    onPointer = (e) => {
      if (!pickable) return;
      const p = e.changedTouches ? e.changedTouches[0] : e;
      const hits = view.raycast(p.clientX, p.clientY, cupBodies);
      if (hits.length) {
        const idx = hits[0].object.userData.cupIndex;
        const cup = cups.find((c) => c.index === idx);
        if (cup) pick(cup);
      }
    };
    view.canvas.addEventListener('pointerdown', onPointer);

    view.start(onFrame);
  },

  reset() {
    pickable = false;
    pickResolve = null;
    if (marble) marble.visible = false;
    cups.forEach((c, i) => {
      c.slot = i;
      c.lifted = false;
      placeInstant(c);
    });
  },

  async start(/* bet */) {
    this.reset();
    ball = Math.floor(Math.random() * CFG.cups);

    // 구슬을 보여준 뒤 감춘다
    marble.position.x = slotX(cups[ball].slot);
    marble.visible = true;
    setLift(cups[ball], true);
    await wait(900);
    setLift(cups[ball], false);
    await wait(500);
    marble.visible = false;

    // 셔플 (슬롯 스왑 → 위치 트윈)
    for (let s = 0; s < CFG.shuffleTimes; s++) {
      const a = Math.floor(Math.random() * CFG.cups);
      let b = Math.floor(Math.random() * CFG.cups);
      if (b === a) b = (a + 1) % CFG.cups;
      const cupA = cups.find((c) => c.slot === a);
      const cupB = cups.find((c) => c.slot === b);
      cupA.slot = b;
      cupB.slot = a;
      cupA.tx = slotX(b);
      cupB.tx = slotX(a);
      await wait(Math.max(160, 320 - s * 20));
    }

    pickable = true;
    toast('구슬이 든 컵을 고르세요');
    return new Promise((resolve) => {
      pickResolve = resolve;
    });
  },

  unmount() {
    if (view) {
      view.canvas.removeEventListener('pointerdown', onPointer);
      view.dispose();
    }
    view = null;
    cups = [];
    cupBodies = [];
    marble = null;
    pickable = false;
    pickResolve = null;
    onPointer = null;
  },
};
