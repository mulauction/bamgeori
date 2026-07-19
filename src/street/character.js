// ══════════════════════════════════════════════════════════════
//  street/character.js — 복셀 히어로 캐릭터 (마인크래프트식)
//  걷기 애니메이션 포함. 추후 상용 복셀 모델 교체 지점.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { makeGlow } from '../games/visuals.js';

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

  // ── 디테일(실루엣 개선): 머리카락 볼륨 · 손 · 신발 · 재킷 지퍼 ──
  const hairTop = mat(0x241a30);
  const top = new THREE.Mesh(boxG(0.86, 0.24, 0.86), hairTop);
  top.position.y = 2.5;
  hero.add(top);
  const back = new THREE.Mesh(boxG(0.86, 0.5, 0.16), hairTop);
  back.position.set(0, 2.15, -0.34);
  hero.add(back);
  // 손 (팔 끝, 팔에 종속되어 함께 스윙)
  const handGeo = boxG(0.28, 0.2, 0.28);
  const handMat = mat(0xf0c8a0);
  [armL, armR].forEach((arm) => {
    const hand = new THREE.Mesh(handGeo, handMat);
    hand.position.set(0, -0.78, 0);
    arm.add(hand);
  });
  // 신발 (다리 끝, 다리에 종속)
  const shoeGeo = boxG(0.36, 0.18, 0.44);
  const shoeMat = mat(0x1b1522);
  [legL, legR].forEach((leg) => {
    const shoe = new THREE.Mesh(shoeGeo, shoeMat);
    shoe.position.set(0, -0.78, 0.06);
    leg.add(shoe);
  });
  // 재킷 지퍼/카라
  const zip = new THREE.Mesh(boxG(0.08, 0.9, 0.02), mat(0x2b2136));
  zip.position.set(0, 1.28, 0.24);
  hero.add(zip);
  const collar = new THREE.Mesh(boxG(0.84, 0.14, 0.5), mat(0xb83a2c));
  collar.position.set(0, 1.72, 0);
  hero.add(collar);

  // ── 착용 과시템(보유 시 표시) ──
  // 📿 금목걸이
  const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), new THREE.MeshLambertMaterial({ color: 0xffc247 }));
  necklace.rotation.x = Math.PI / 2;
  necklace.position.y = 1.72;
  necklace.visible = false;
  hero.add(necklace);
  // 🎩 중절모 (챙 + 윗통)
  const hat = new THREE.Group();
  const brim = new THREE.Mesh(boxG(1.0, 0.06, 1.0), mat(0x1a141f));
  brim.position.y = 2.55;
  hat.add(brim);
  const crown = new THREE.Mesh(boxG(0.62, 0.4, 0.62), mat(0x241a30));
  crown.position.y = 2.78;
  hat.add(crown);
  hat.visible = false;
  hero.add(hat);
  // 🕶️ 선글라스
  const sunglasses = new THREE.Mesh(boxG(0.6, 0.15, 0.06), mat(0x0a0a10));
  sunglasses.position.set(0, 2.12, 0.42);
  sunglasses.visible = false;
  hero.add(sunglasses);
  // ✨ 황금 오라 (발광 스프라이트)
  const aura = makeGlow(0xffc247, 3.6);
  aura.position.y = 1.3;
  aura.visible = false;
  hero.add(aura);

  // 보유 자산 Set을 받아 착용 반영 (👟 금신발은 신발 색 변경)
  function setEquipped(owned) {
    necklace.visible = owned.has('necklace');
    hat.visible = owned.has('hat');
    sunglasses.visible = owned.has('sunglasses');
    aura.visible = owned.has('aura');
    shoeMat.color.setHex(owned.has('goldshoes') ? 0xffc247 : 0x1b1522);
  }

  hero.position.set(2, 0, -1.5);
  hero.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });

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
  }

  // 파산 시 남루한 외형(어두운 텍스처 스왑) — armR/legR은 재질을 공유
  const shabbyMats = [body.material, armL.material, legL.material];
  const originalHex = shabbyMats.map((m) => m.color.getHex());
  function setShabby(on) {
    shabbyMats.forEach((m, i) => m.color.setHex(on ? 0x4a4652 : originalHex[i]));
  }

  return { group: hero, applyPose, setShabby, setEquipped };
}
