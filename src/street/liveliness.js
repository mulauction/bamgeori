// ══════════════════════════════════════════════════════════════
//  street/liveliness.js — 거리 생동감
//  복셀 행인 배회(왕복+랜덤 정지) + 과시템 반영(금목걸이/주차된 탈것).
//  street는 세션 내내 살아있어 별도 dispose 불필요.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { store } from '../core/store.js';
import { makeBlobShadow } from '../games/visuals.js';

const box = (w, h, d, c) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color: c }));
const SHIRTS = [0x3a6ea5, 0x9a5b3a, 0x4a7a4a, 0x7a4a7a, 0x8a8a3a, 0x5a5a8a];

// 걷는 복셀 행인
function makeWalker(shirt) {
  const g = new THREE.Group();
  const head = box(0.5, 0.5, 0.5, 0xe6b58c);
  head.position.y = 1.75;
  g.add(head);
  const hair = box(0.54, 0.16, 0.54, 0x241a30);
  hair.position.y = 1.95;
  g.add(hair);
  const body = box(0.6, 0.7, 0.34, shirt);
  body.position.y = 1.2;
  g.add(body);
  const legGeo = new THREE.BoxGeometry(0.22, 0.65, 0.22);
  legGeo.translate(0, -0.32, 0);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x2b2136 });
  const legL = new THREE.Mesh(legGeo, legMat);
  legL.position.set(-0.14, 0.85, 0);
  g.add(legL);
  const legR = new THREE.Mesh(legGeo, legMat);
  legR.position.set(0.14, 0.85, 0);
  g.add(legR);
  const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
  armGeo.translate(0, -0.3, 0);
  const armMat = new THREE.MeshLambertMaterial({ color: shirt });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.4, 1.5, 0);
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.4, 1.5, 0);
  g.add(armR);
  g.add(makeBlobShadow(0.55));
  return { group: g, legL, legR, armL, armR };
}

// 소유 표시 마커(떠 있는 금색 다이아)
function ownMarker() {
  const m = box(0.3, 0.3, 0.3, 0xffc247);
  m.rotation.set(Math.PI / 4, Math.PI / 4, 0);
  m.position.y = 2.2;
  return m;
}

// 탈것은 전부 +Z(앞) 방향으로 제작 → 히어로와 회전 기준 통일.
// 바퀴는 실린더(축을 X로: rotation.z=π/2) → Z 방향으로 굴러감.
const tireMat = () => new THREE.MeshLambertMaterial({ color: 0x1a1520 });
const metalMat = () => new THREE.MeshLambertMaterial({ color: 0xc2c8ce });
function wheel(r, th, x, y, z, mat) {
  const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, th, 14), mat);
  w.rotation.z = Math.PI / 2;
  w.position.set(x, y, z);
  return w;
}

function makeBike() {
  const g = new THREE.Group();
  const tire = tireMat();
  const metal = metalMat();
  // 앞/뒤 바퀴(z축 정렬)
  g.add(wheel(0.34, 0.08, 0, 0.34, 0.52, tire));
  g.add(wheel(0.34, 0.08, 0, 0.34, -0.52, tire));
  // 프레임
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.95), metal);
  bar.position.set(0, 0.52, 0);
  g.add(bar);
  const down = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), metal);
  down.position.set(0, 0.44, 0.28);
  down.rotation.x = 0.5;
  g.add(down);
  // 안장 + 핸들
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.05), metal);
  post.position.set(0, 0.6, -0.42);
  g.add(post);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.32), new THREE.MeshLambertMaterial({ color: 0x201820 }));
  seat.position.set(0, 0.76, -0.42);
  g.add(seat);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 0.05), metal);
  stem.position.set(0, 0.64, 0.5);
  g.add(stem);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.05), metal);
  handle.position.set(0, 0.84, 0.5);
  g.add(handle);
  g.add(ownMarker());
  return g;
}

function makeCar(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 2.2), bodyMat);
  body.position.y = 0.55;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.5, 1.1), new THREE.MeshLambertMaterial({ color: 0xcfe6ff }));
  cabin.position.set(0, 1.02, -0.1);
  g.add(cabin);
  const tire = tireMat();
  [
    [0.55, 0.72],
    [0.55, -0.72],
    [-0.55, 0.72],
    [-0.55, -0.72],
  ].forEach(([x, z]) => g.add(wheel(0.3, 0.2, x, 0.3, z, tire)));
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.14, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  hl.position.set(0, 0.55, 1.12);
  g.add(hl);
  g.add(ownMarker());
  return g;
}

function makeSport(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.36, 2.7), bodyMat);
  body.position.y = 0.42;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.34, 0.95), new THREE.MeshLambertMaterial({ color: 0x201020 }));
  cabin.position.set(0, 0.74, -0.15);
  g.add(cabin);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.3), bodyMat);
  spoiler.position.set(0, 0.7, -1.28);
  g.add(spoiler);
  const tire = tireMat();
  [
    [0.56, 0.8],
    [0.56, -0.8],
    [-0.56, 0.8],
    [-0.56, -0.8],
  ].forEach(([x, z]) => g.add(wheel(0.32, 0.22, x, 0.32, z, tire)));
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.1, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  hl.position.set(0, 0.42, 1.37);
  g.add(hl);
  g.add(ownMarker());
  return g;
}

// 탈것 주차 위치(거리 near side) + 이름
const PARK = {
  bike: { x: 18, name: '자전거', build: () => makeBike() },
  car: { x: 44, name: '중고차', build: () => makeCar(0x3a6ea5) },
  sport: { x: 68, name: '스포츠카', build: () => makeSport(0xff5964) },
};

export function createLiveliness(scene, hero, count = 6) {
  // 행인
  const walkers = [];
  for (let i = 0; i < count; i++) {
    const w = makeWalker(SHIRTS[i % SHIRTS.length]);
    const x = 6 + Math.random() * 92;
    const z = -3 + Math.random() * 15; // 넓어진 거리 전체에 분포
    w.group.position.set(x, 0, z);
    scene.add(w.group);
    walkers.push({ ...w, x, z, dir: Math.random() < 0.5 ? 1 : -1, speed: 0.0009 + Math.random() * 0.0011, phase: 0, state: 'walk', timer: 0 });
  }

  // 과시템 반영(한번 사면 유지 — 제거 없음)
  const vehicles = {};
  function refreshFlex() {
    hero.setEquipped(new Set(store.getAssets())); // 착용 과시템 반영
    for (const id of Object.keys(PARK)) {
      if (store.hasAsset(id) && !vehicles[id]) {
        const v = PARK[id].build();
        v.add(makeBlobShadow(1.4));
        v.position.set(PARK[id].x, 0, 2.6);
        v.rotation.y = Math.PI / 2;
        scene.add(v);
        vehicles[id] = v;
      }
    }
  }
  store.subscribe(refreshFlex);
  refreshFlex();

  function update(dt) {
    for (const w of walkers) {
      if (w.state === 'walk') {
        w.x += w.dir * w.speed * dt;
        w.phase += dt * 0.01;
        if (w.x < 4) {
          w.x = 4;
          w.dir = 1;
        }
        if (w.x > 104) {
          w.x = 104;
          w.dir = -1;
        }
        if (Math.random() < 0.0015 * dt) {
          w.state = 'pause';
          w.timer = 500 + Math.random() * 1600;
        }
        const s = Math.sin(w.phase);
        w.legL.rotation.x = s * 0.5;
        w.legR.rotation.x = -s * 0.5;
        w.armL.rotation.x = -s * 0.4;
        w.armR.rotation.x = s * 0.4;
      } else {
        w.timer -= dt;
        if (w.timer <= 0) w.state = 'walk';
      }
      w.group.position.x = w.x;
      w.group.rotation.y = w.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  }

  return {
    update,
    vehicles, // { id: group } — 보유해 거리에 나타난 탈것
    parkZ: 2.6,
    meta: PARK, // 이름·주차 위치
  };
}
