// ══════════════════════════════════════════════════════════════
//  street/character.js — 복셀 히어로 캐릭터 (마인크래프트식)
//  걷기 애니메이션 포함. 추후 상용 복셀 모델 교체 지점.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { makeBlobShadow } from '../games/visuals.js';

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function skinTex(c1, c2) {
  return canvasTex(16, 16, (g) => {
    g.fillStyle = c1;
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = c2;
    for (let i = 0; i < 10; i++)
      g.fillRect(Math.floor(Math.random() * 15), Math.floor(Math.random() * 15), 2, 2);
  });
}

const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });

/**
 * 히어로 캐릭터를 만든다.
 * @returns {{ group: THREE.Group, applyPose: (p)=>void }}
 */
export function createHero() {
  const hero = new THREE.Group();

  const head = new THREE.Mesh(
    boxG(0.8, 0.8, 0.8),
    new THREE.MeshLambertMaterial({
      map: canvasTex(32, 32, (g) => {
        g.fillStyle = '#f0c8a0';
        g.fillRect(0, 0, 32, 32);
        g.fillStyle = '#2b2136';
        g.fillRect(0, 0, 32, 10); // 머리카락
        g.fillRect(6, 14, 4, 4);
        g.fillRect(22, 14, 4, 4); // 눈
        g.fillStyle = '#c98a6a';
        g.fillRect(13, 22, 6, 3); // 입
      }),
    })
  );
  head.position.y = 2.15;
  hero.add(head);

  const body = new THREE.Mesh(boxG(0.8, 0.95, 0.45), new THREE.MeshLambertMaterial({ map: skinTex('#d84a3a', '#b83a2c') }));
  body.position.y = 1.28;
  hero.add(body);

  const armL = new THREE.Mesh(boxG(0.25, 0.9, 0.25), mat(0xd84a3a));
  armL.geometry.translate(0, -0.35, 0);
  armL.position.set(-0.55, 1.65, 0);
  hero.add(armL);
  const armR = armL.clone();
  armR.position.x = 0.55;
  hero.add(armR);

  const legL = new THREE.Mesh(boxG(0.3, 0.85, 0.3), mat(0x3d5a99));
  legL.geometry.translate(0, -0.38, 0);
  legL.position.set(-0.2, 0.82, 0);
  hero.add(legL);
  const legR = legL.clone();
  legR.position.x = 0.2;
  hero.add(legR);

  // 금목걸이(과시템 보유 시 표시) — 목 높이 금색 링
  const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), new THREE.MeshLambertMaterial({ color: 0xffc247 }));
  necklace.rotation.x = Math.PI / 2;
  necklace.position.y = 1.72;
  necklace.visible = false;
  hero.add(necklace);
  function setNecklace(on) {
    necklace.visible = !!on;
  }

  // 발밑 블롭 그림자(접지감). 점프 시에도 바닥에 남도록 y 보정.
  const shadow = makeBlobShadow(0.7);
  hero.add(shadow);

  hero.position.set(2, 0, -1.5);

  // 걷기 애니메이션 + 위치 적용
  function applyPose({ x, y, z, facing, phase, moving }) {
    const sw = Math.sin(phase) * 0.7;
    legL.rotation.x = sw;
    legR.rotation.x = -sw;
    armL.rotation.x = -sw * 0.8;
    armR.rotation.x = sw * 0.8;
    const bob = moving && y === 0 ? Math.abs(Math.sin(phase)) * 0.06 : 0;
    hero.position.set(x, y + bob, z);
    hero.rotation.y = facing;
    // 그림자는 항상 지면(월드 y≈0.02)에 고정 + 점프 높이에 따라 축소
    shadow.position.y = 0.02 - (y + bob);
    const sc = 1 / (1 + y * 0.6);
    shadow.scale.setScalar(sc);
  }

  // 파산 시 남루한 외형(어두운 텍스처 스왑) — armR/legR은 재질을 공유
  const shabbyMats = [body.material, armL.material, legL.material];
  const originalHex = shabbyMats.map((m) => m.color.getHex());
  function setShabby(on) {
    shabbyMats.forEach((m, i) => m.color.setHex(on ? 0x4a4652 : originalHex[i]));
  }

  return { group: hero, applyPose, setShabby, setNecklace };
}
