// ══════════════════════════════════════════════════════════════
//  tableScene — 테이블형 게임 공용 3D 셋업 (홀짝·주사위·하이로우 등)
//  create3D + 조명 + 나무 테이블을 세팅하고 뷰를 반환. 소품은 게임이 추가.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { create3D } from './scene3d.js';
import { box } from './voxel.js';

/**
 * @param {HTMLElement} container
 * @param {object} opts { bg, tableColor, height, camY, camZ, lookY }
 * @returns {{ view, scene, tableY }}
 */
export function createTableScene(container, opts = {}) {
  const {
    bg = 0x151021,
    tableColor = 0x5a3a2a,
    height = 260,
    camY = 3.4,
    camZ = 5.0,
    lookY = 0.9,
  } = opts;

  const view = create3D(container, { height, fov: 50, bg });
  view.camera.position.set(0, camY, camZ);
  view.camera.lookAt(0, lookY, 0);

  const { scene } = view;
  scene.add(new THREE.AmbientLight(0x6a6488, 1.5));
  scene.add(new THREE.HemisphereLight(0xaab0e0, 0x2a2438, 0.7));
  const key = new THREE.DirectionalLight(0xfff0d0, 0.7);
  key.position.set(2, 6, 4);
  scene.add(key);

  // 나무 테이블
  const table = box(4.4, 0.6, 2.6, tableColor);
  table.position.y = 0.7;
  scene.add(table);
  const top = box(4.5, 0.08, 2.7, 0x6a4a2e);
  top.position.y = 1.02;
  scene.add(top);

  return { view, scene, tableY: 1.06 };
}
