// ══════════════════════════════════════════════════════════════
//  scene3d.js — 미니게임용 3D 씬 헬퍼
//  컨테이너 안에 렌더러/씬/카메라를 만들고 렌더 루프·리사이즈·레이캐스트·
//  리소스 해제(dispose)를 제공한다. 게임 mount/unmount에서 메모리 누수 방지.
//  성능 예산: pixelRatio 캡(min(dpr,2)), 라이트는 게임별로 최소화.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// 씬 전체를 순회하며 지오메트리·머티리얼·텍스처를 해제 (공유 리소스 중복 해제 방지)
export function disposeScene(scene) {
  const geos = new Set();
  const mats = new Set();
  const texs = new Set();
  scene.traverse((obj) => {
    if (obj.geometry) geos.add(obj.geometry);
    const list = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
    for (const m of list) mats.add(m);
  });
  for (const m of mats) {
    for (const k in m) {
      const v = m[k];
      if (v && v.isTexture) texs.add(v);
    }
  }
  geos.forEach((g) => g.dispose());
  texs.forEach((t) => t.dispose());
  mats.forEach((m) => m.dispose());
}

/**
 * 컨테이너에 3D 뷰를 만든다.
 * @param {HTMLElement} container
 * @param {object} opts { height, fov, bg, cameraStart }
 */
export function create3D(container, opts = {}) {
  const { height = 260, fov = 55, bg = 0x0a0817, fog = null } = opts;

  const wrap = document.createElement('div');
  wrap.className = 'cv3d-wrap';
  const canvas = document.createElement('canvas');
  canvas.className = 'cv3d';
  wrap.appendChild(canvas);
  container.appendChild(wrap);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  if (fog) scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);

  function size() {
    const w = wrap.clientWidth || 320;
    const h = height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', size);
  size();

  let raf = 0;
  let onFrame = null;
  let prevT = 0;
  function loop(t) {
    raf = requestAnimationFrame(loop);
    const dt = prevT ? Math.min(50, t - prevT) : 16;
    prevT = t;
    if (onFrame) onFrame(t, dt);
    renderer.render(scene, camera);
  }
  function start(fn) {
    onFrame = fn || onFrame;
    if (!raf) {
      prevT = 0;
      raf = requestAnimationFrame(loop);
    }
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // 포인터 → NDC → 레이캐스트
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function raycast(clientX, clientY, targets) {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(targets, true);
  }

  function dispose() {
    stop();
    window.removeEventListener('resize', size);
    disposeScene(scene);
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
    wrap.remove();
  }

  return { wrap, canvas, renderer, scene, camera, start, stop, size, raycast, dispose };
}
