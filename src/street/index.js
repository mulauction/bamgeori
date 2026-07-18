// ══════════════════════════════════════════════════════════════
//  street/index.js — 3D 거리 오케스트레이터
//  씬 + 캐릭터 + 조작을 묶어 렌더 루프를 돌리고,
//  근접 상점 감지 → 입장 버튼/Enter로 화면 진입을 연결한다.
// ══════════════════════════════════════════════════════════════

import { createScene, SHOPS } from './scene.js';
import { createHero } from './character.js';
import { createControls } from './controls.js';

/**
 * @param {object} opts
 * @param {(sceneId:string)=>void} opts.onEnter 상점 진입 콜백(scene id 전달)
 * @returns {{ setActive:(v:boolean)=>void, resize:()=>void }}
 */
export function createStreet({ onEnter }) {
  const canvas = document.getElementById('gl');
  const enterBtn = document.getElementById('enterbtn');

  const { renderer, scene, camera, resize } = createScene(canvas);
  const hero = createHero();
  scene.add(hero.group);

  // 히어로 상태
  const H = { x: 2, z: -1.5, y: 0, vy: 0, phase: 0, facing: Math.PI / 2 };
  const camDist = 8.5;
  let nearShop = null;
  let active = true;

  function tryEnter() {
    if (active && nearShop) onEnter(nearShop.scene);
  }

  const controls = createControls({ onEnter: tryEnter });
  enterBtn.onclick = tryEnter;

  window.addEventListener('resize', resize);

  let prevT = 0;
  function loop(t) {
    requestAnimationFrame(loop);
    if (!active) return;
    const dt = Math.min(40, t - prevT);
    prevT = t;

    // 이동 입력 (조이스틱 + 키보드), 길이 정규화
    let { ix, iz } = controls.getMoveInput();
    const ilen = Math.hypot(ix, iz);
    if (ilen > 1) {
      ix /= ilen;
      iz /= ilen;
    }
    const moving = ilen > 0.12;
    if (moving) {
      // 카메라 방향 기준 이동
      const s = Math.sin(controls.cam.yaw);
      const c = Math.cos(controls.cam.yaw);
      const mx = ix * c + iz * s;
      const mz = -ix * s + iz * c;
      const spd = 0.0058 * dt;
      H.x = Math.max(-4, Math.min(108, H.x + mx * spd));
      H.z = Math.max(-4.0, Math.min(9.3, H.z + mz * spd));
      H.facing = Math.atan2(mx, mz);
      H.phase += dt * 0.012;
    } else {
      H.phase *= 0.85;
    }

    // 점프
    if (controls.consumeJump() && H.y <= 0.001) H.vy = 0.012;
    H.y += H.vy * dt;
    H.vy -= 0.00004 * dt;
    if (H.y <= 0) {
      H.y = 0;
      H.vy = 0;
    }

    hero.applyPose({ x: H.x, y: H.y, z: H.z, facing: H.facing, phase: H.phase, moving });

    // 궤도 카메라
    const cp = Math.cos(controls.cam.pitch);
    const sp = Math.sin(controls.cam.pitch);
    const tx = H.x;
    const ty = 1.5 + H.y * 0.6;
    const tz = H.z;
    camera.position.set(
      tx + Math.sin(controls.cam.yaw) * cp * camDist,
      Math.max(0.6, ty + sp * camDist),
      tz + Math.cos(controls.cam.yaw) * cp * camDist
    );
    camera.lookAt(tx, ty, tz);

    // 근접 상점 감지
    nearShop = null;
    SHOPS.forEach((sh) => {
      if (Math.abs(H.x - sh.x) < 3.4 && H.z < 1.2) nearShop = sh;
    });
    if (nearShop) {
      enterBtn.style.display = 'block';
      enterBtn.textContent = '🚪 ' + nearShop.name + ' 입장';
    } else {
      enterBtn.style.display = 'none';
    }

    renderer.render(scene, camera);
  }

  resize();
  requestAnimationFrame(loop);

  return {
    setActive(v) {
      active = v;
      if (!v) enterBtn.style.display = 'none';
      else resize(); // 홈 복귀 시 컨테이너 크기 재적용
    },
    resize,
  };
}
