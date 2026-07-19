// ══════════════════════════════════════════════════════════════
//  street/index.js — 3D 거리 오케스트레이터
//  씬 + 캐릭터 + 조작을 묶어 렌더 루프를 돌리고,
//  근접 상점 감지 → 입장 버튼/Enter로 화면 진입을 연결한다.
// ══════════════════════════════════════════════════════════════

import { createScene, SHOPS } from './scene.js';
import { createHero } from './character.js';
import { createControls } from './controls.js';
import { audio } from '../core/audio.js';
import { store } from '../core/store.js';
import { toast } from '../ui/toast.js';
import { createLiveliness } from './liveliness.js';
import { initMarquee } from '../ui/marqueeBanner.js';

// 파산 시 유일하게 입장 가능한 가게(노동)
const LABOR_SCENE = 'work-daeri';

/**
 * @param {object} opts
 * @param {(sceneId:string)=>void} opts.onEnter 상점 진입 콜백(scene id 전달)
 * @returns {{ setActive:(v:boolean)=>void, resize:()=>void }}
 */
export function createStreet({ onEnter }) {
  const canvas = document.getElementById('gl');
  const enterBtn = document.getElementById('enterbtn');

  const { renderer, scene, camera, resize, setDaylight, solids, updateShadowFocus } = createScene(canvas);
  const hero = createHero();
  scene.add(hero.group);

  // 건물 충돌 판정(2D footprint)
  function blocked(x, z) {
    for (const s of solids) {
      if (x > s.minX && x < s.maxX && z > s.minZ && z < s.maxZ) return true;
    }
    return false;
  }

  // 게임 내 시간 흐름(자동 낮/밤). 한 사이클 ≈ 100초. 밤에서 시작.
  const DAY_CYCLE = 100000;
  let clock = 0;
  setDaylight(0);

  // 거리 생동감(행인·과시템) + 전광판
  const life = createLiveliness(scene, hero);
  const marqueeCtl = initMarquee();

  // 히어로 상태
  const H = { x: 2, z: -1.5, y: 0, vy: 0, phase: 0, facing: Math.PI / 2 };
  let nearShop = null;
  let active = true;

  // 파산 상태 반영: 남루한 외형 + 느린 걸음 + 승부 가게 출입 금지
  let bankrupt = store.isBankrupt();
  hero.setShabby(bankrupt);
  store.subscribe(() => {
    bankrupt = store.isBankrupt();
    hero.setShabby(bankrupt);
  });

  // 파산 중에는 노동(대리운전)만 입장 가능
  function canEnter(shop) {
    return !bankrupt || shop.scene === LABOR_SCENE;
  }

  // 탈것 타기 상태
  let riding = null; // { id, group }
  let nearVeh = null;

  function findNearVehicle() {
    for (const id of Object.keys(life.vehicles)) {
      const g = life.vehicles[id];
      if (!g) continue;
      if (Math.abs(H.x - g.position.x) < 3 && H.z > 0.5 && H.z < 4.5) return { id, group: g };
    }
    return null;
  }

  function mountVehicle(v) {
    riding = v;
    toast('🚲 ' + life.meta[v.id].name + ' 탑승! (버튼으로 내리기)');
  }
  function dismount() {
    if (!riding) return;
    // 현재 위치에 주차
    riding.group.position.set(H.x, 0, life.parkZ);
    riding.group.rotation.y = Math.PI / 2;
    toast('🚲 ' + life.meta[riding.id].name + '에서 내렸다');
    riding = null;
  }

  // 입장 버튼 = 문맥 액션(타기/내리기/입장)
  function primaryAction() {
    if (riding) {
      dismount();
      return;
    }
    if (!active) return;
    if (nearShop) {
      if (!canEnter(nearShop)) {
        toast('빈털터리는 출입 금지 — 대리운전으로 재기하세요');
        return;
      }
      onEnter(nearShop.scene);
      return;
    }
    if (nearVeh) mountVehicle(nearVeh);
  }

  const controls = createControls({ onEnter: primaryAction });
  enterBtn.onclick = primaryAction;

  window.addEventListener('resize', resize);

  let prevT = 0;
  let stepAcc = 0; // 발소리 스로틀
  function loop(t) {
    requestAnimationFrame(loop);
    if (!active) return;
    const dt = Math.min(40, t - prevT);
    prevT = t;

    life.update(dt); // 행인 배회
    marqueeCtl.pump(); // 전광판 문구 흐름

    // 시간 흐름 → 부드러운 낮/밤 (0=한밤 ↔ 1=한낮)
    clock += dt;
    const frac = (clock % DAY_CYCLE) / DAY_CYCLE;
    setDaylight(0.5 - 0.5 * Math.cos(frac * Math.PI * 2));

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
      const spd = 0.0058 * dt * (bankrupt ? 0.55 : 1) * (riding ? 1.9 : 1); // 파산 처짐 / 탈것 가속
      const nx = Math.max(-4, Math.min(108, H.x + mx * spd));
      // 세로 이동: 기본은 넓은 거리, x≈40 골목에서는 뒤쪽으로 더 깊이
      const inAlley = Math.abs(H.x - 40) < 2.6;
      const zMin = inAlley ? -24 : -3.8;
      const nz = Math.max(zMin, Math.min(13.5, H.z + mz * spd));
      // 축별 이동 → 벽에 부딪히면 그 축만 막고 미끄러짐(건물 관통 방지)
      if (!blocked(nx, H.z)) H.x = nx;
      if (!blocked(H.x, nz)) H.z = nz;
      H.facing = Math.atan2(mx, mz);
      H.phase += dt * 0.012;
    } else {
      H.phase *= 0.85;
    }

    // 발소리 (이동 중, 지면, 스로틀)
    if (moving && H.y <= 0.001) {
      stepAcc += dt;
      if (stepAcc > 340) {
        audio.play('footstep');
        stepAcc = 0;
      }
    } else {
      stepAcc = 0;
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
    updateShadowFocus(H.x, H.z); // 그림자 카메라를 플레이어 주변으로

    // 탈것 탑승: 히어로를 살짝 올리고 탈것을 발밑으로 이동
    if (riding) {
      hero.group.position.y += 0.35;
      riding.group.position.set(H.x, 0, H.z);
      riding.group.rotation.y = H.facing;
    }

    // 궤도 카메라 (벽에 닿으면 거리를 줄여 관통 방지)
    const cp = Math.cos(controls.cam.pitch);
    const sp = Math.sin(controls.cam.pitch);
    const sy = Math.sin(controls.cam.yaw);
    const cy = Math.cos(controls.cam.yaw);
    const tx = H.x;
    const ty = 1.5 + H.y * 0.6;
    const tz = H.z;
    let cd = controls.cam.dist; // 핀치/휠 줌 반영
    for (let k = 0; k < 6; k++) {
      if (!blocked(tx + sy * cp * cd, tz + cy * cp * cd)) break;
      cd -= 1.2;
      if (cd < 2) {
        cd = 2;
        break;
      }
    }
    camera.position.set(tx + sy * cp * cd, Math.max(0.6, ty + sp * cd), tz + cy * cp * cd);
    camera.lookAt(tx, ty, tz);

    // 근접 상점/탈것 감지 → 문맥 버튼
    nearShop = null;
    SHOPS.forEach((sh) => {
      if (Math.abs(H.x - sh.x) < 3.4 && H.z < 1.2) nearShop = sh;
    });
    nearVeh = riding ? null : findNearVehicle();

    if (riding) {
      enterBtn.style.display = 'block';
      enterBtn.textContent = '🚲 내리기';
      enterBtn.classList.remove('blocked');
    } else if (nearShop) {
      enterBtn.style.display = 'block';
      if (canEnter(nearShop)) {
        enterBtn.textContent = '🚪 ' + nearShop.name + ' 입장';
        enterBtn.classList.remove('blocked');
      } else {
        enterBtn.textContent = '🚫 빈털터리 출입 금지';
        enterBtn.classList.add('blocked');
      }
    } else if (nearVeh) {
      enterBtn.style.display = 'block';
      enterBtn.textContent = '🚲 ' + life.meta[nearVeh.id].name + ' 타기';
      enterBtn.classList.remove('blocked');
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
