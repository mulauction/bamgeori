// ══════════════════════════════════════════════════════════════
//  visuals.js — 공용 3D 비주얼 헬퍼 (거리·게임 공용)
//  · 블롭 그림자: 캐릭터/오브젝트 접지감(붕 떠 보임 해소)
//  · 글로우 스프라이트: 가산합성 발광 halo(풀스크린 블룸 없이 네온 빛남)
//  둘 다 라이트를 쓰지 않아 저비용(안전빵). 텍스처는 캔버스 생성·1회 재사용.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

let blobTex = null;
function getBlobTex() {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  return blobTex;
}

let glowTex = null;
function getGlowTex() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

/** 바닥 블롭 그림자(가로 평면). radius = 반지름 */
export function makeBlobShadow(radius = 0.6) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: getBlobTex(), transparent: true, depthWrite: false, opacity: 0.9 })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.02;
  return m;
}

/** 발광 halo 스프라이트(가산합성). color 색, size 크기 */
export function makeGlow(color, size = 3) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: getGlowTex(),
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0.9,
    })
  );
  s.scale.set(size, size, 1);
  return s;
}
