// ══════════════════════════════════════════════════════════════
//  voxel.js — 미니게임 공용 복셀 빌더 (플레이스홀더 에셋)
//  전부 BoxGeometry + MeshLambertMaterial. 추후 상용 복셀 모델 교체 지점.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

export const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));

// 정적 복셀 사람 (상점 주인/구경꾼). 색상만 바꿔 재사용.
export function makeVoxelPerson({ skin = 0xf0c8a0, shirt = 0x3a6ea5, pants = 0x2b2136, scale = 1 } = {}) {
  const g = new THREE.Group();
  const head = box(0.6, 0.6, 0.6, skin);
  head.position.y = 1.9;
  g.add(head);
  const hair = box(0.66, 0.2, 0.66, 0x241a30);
  hair.position.y = 2.15;
  g.add(hair);
  const body = box(0.7, 0.8, 0.4, shirt);
  body.position.y = 1.25;
  g.add(body);
  const armL = box(0.2, 0.75, 0.2, shirt);
  armL.position.set(-0.46, 1.28, 0);
  g.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.46;
  g.add(armR);
  const legL = box(0.26, 0.7, 0.26, pants);
  legL.position.set(-0.16, 0.5, 0);
  g.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.16;
  g.add(legR);
  g.scale.setScalar(scale);
  return g;
}

// 복셀 개 — 4다리 애니메이션. { group, animate(phase, running) }
export function makeVoxelDog(color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1520 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 0.5), bodyMat);
  body.position.y = 0.6;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.45), bodyMat);
  head.position.set(0.7, 0.75, 0);
  g.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), darkMat);
  snout.position.set(0.95, 0.68, 0);
  g.add(snout);
  const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), darkMat);
  ear.position.set(0.62, 1.02, 0.16);
  g.add(ear);
  const ear2 = ear.clone();
  ear2.position.z = -0.16;
  g.add(ear2);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.12, 0.12), bodyMat);
  tail.position.set(-0.65, 0.75, 0);
  g.add(tail);
  // 다리 4개 (앞뒤 좌우) — 상단 기준 회전
  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.16, 0.5, 0.16);
  legGeo.translate(0, -0.25, 0);
  [
    [0.42, 0.2],
    [0.42, -0.2],
    [-0.42, 0.2],
    [-0.42, -0.2],
  ].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, darkMat);
    leg.position.set(x, 0.5, z);
    g.add(leg);
    legs.push(leg);
  });
  function animate(phase) {
    const s = Math.sin(phase);
    legs[0].rotation.z = s * 0.8;
    legs[3].rotation.z = s * 0.8;
    legs[1].rotation.z = -s * 0.8;
    legs[2].rotation.z = -s * 0.8;
  }
  return { group: g, animate };
}

// 복셀 닭 — 다리/날개. { group, animate(phase) }
export function makeVoxelChicken(bodyColor) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const combMat = new THREE.MeshLambertMaterial({ color: 0xff5964 });
  const beakMat = new THREE.MeshLambertMaterial({ color: 0xffc247 });
  const legMat = new THREE.MeshLambertMaterial({ color: 0xffc247 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.5), bodyMat);
  body.position.y = 0.75;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), bodyMat);
  head.position.set(0.35, 1.2, 0);
  g.add(head);
  const comb = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.3), combMat);
  comb.position.set(0.3, 1.5, 0);
  g.add(comb);
  const beak = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.12), beakMat);
  beak.position.set(0.62, 1.15, 0);
  g.add(beak);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.1), bodyMat);
  wing.position.set(-0.05, 0.78, 0.3);
  g.add(wing);
  const wing2 = wing.clone();
  wing2.position.z = -0.3;
  g.add(wing2);
  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
  legGeo.translate(0, -0.2, 0);
  [0.14, -0.14].forEach((z) => {
    const leg = new THREE.Mesh(legGeo, legMat);
    leg.position.set(0.1, 0.4, z);
    g.add(leg);
    legs.push(leg);
  });
  function animate(phase) {
    const s = Math.sin(phase);
    legs[0].rotation.z = s * 0.7;
    legs[1].rotation.z = -s * 0.7;
    wing.rotation.x = s * 0.5;
    wing2.rotation.x = -s * 0.5;
  }
  return { group: g, animate };
}

// 구경꾼 군중 — InstancedMesh 1개(드로우콜 최소화). 배치 좌표 배열을 받음.
// 몸통·머리 2개 인스턴스드메시를 반환하고 씬에 add한다.
export function makeCrowd(positions, { bodyColor = 0x2a2440, headColor = 0x3a3050 } = {}) {
  const group = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(0.55, 1.0, 0.4);
  const headGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const bodyMat = new THREE.MeshLambertMaterial({ color: bodyColor });
  const headMat = new THREE.MeshLambertMaterial({ color: headColor });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, positions.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, positions.length);
  const m = new THREE.Matrix4();
  positions.forEach((p, i) => {
    const ry = p.ry || 0;
    m.makeRotationY(ry);
    m.setPosition(p.x, 0.5, p.z);
    bodies.setMatrixAt(i, m);
    m.makeRotationY(ry);
    m.setPosition(p.x, 1.2, p.z);
    heads.setMatrixAt(i, m);
  });
  bodies.instanceMatrix.needsUpdate = true;
  heads.instanceMatrix.needsUpdate = true;
  group.add(bodies, heads);
  return group;
}
