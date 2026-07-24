// ══════════════════════════════════════════════════════════════
//  street/scene.js — 3D 복셀 거리 씬 구성
//  씬·렌더러·카메라·조명 + 도로/건물/네온 간판/가로등/달/원경.
//  텍스처는 전부 캔버스로 생성(외부 파일 불필요) → 에셋 교체 지점.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { makeGlow } from '../games/visuals.js';
import { PLACES, STREET_END } from '../games/registry.js';

// ── 캔버스 텍스처 유틸 ─────────────────────────────────────────
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

// public/textures/<name>.png 가 있으면 그 이미지로 교체(없으면 절차생성 유지)
function tryOverrideTexture(name, tex) {
  const img = new Image();
  img.onload = () => {
    tex.image = img;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
  };
  img.src = 'textures/' + name + '.png';
  return tex;
}

function wallTex(base, winLit) {
  return canvasTex(64, 64, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 64, 64);
    for (let y = 8; y < 56; y += 16)
      for (let x = 8; x < 56; x += 16) {
        const lit = Math.random() < winLit;
        g.fillStyle = lit ? '#ffdc8c' : '#0d0b16';
        g.fillRect(x, y, 8, 10);
        if (lit) {
          g.fillStyle = 'rgba(255,220,140,.35)';
          g.fillRect(x - 1, y - 1, 10, 12);
        }
      }
  });
}

function signTex(text, color) {
  return canvasTex(256, 64, (g) => {
    g.fillStyle = '#0d0b16';
    g.fillRect(0, 0, 256, 64);
    g.strokeStyle = color;
    g.lineWidth = 4;
    g.strokeRect(4, 4, 248, 56);
    g.fillStyle = color;
    g.font = '900 34px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowColor = color;
    g.shadowBlur = 18;
    g.fillText(text, 128, 34);
    g.fillText(text, 128, 34);
  });
}

const boxG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
const box = (w, h, d, c) => new THREE.Mesh(boxG(w, h, d), mat(c));

/**
 * 거리 씬을 만든다.
 * @returns {{ renderer, scene, camera, resize }}
 */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // 톤매핑·그림자 없이 단순 렌더 — 일부 모바일 GPU에서 어둠 뭉개짐/블랙 방지(가시성 우선)
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14122a);
  scene.fog = new THREE.Fog(0x14122a, 24, 70);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

  // 충돌용 솔리드(건물 footprint) — 플레이어/카메라가 벽을 못 뚫게
  const solids = [];
  const addSolid = (cx, cz, w, d, m = 0.4) =>
    solids.push({ minX: cx - w / 2 - m, maxX: cx + w / 2 + m, minZ: cz - d / 2 - m, maxZ: cz + d / 2 + m });

  // 거리 길이(레지스트리 가게 수에 따라 동적)
  const END = STREET_END;
  const CENTER = END / 2;
  const LEN = END + 40;

  // 조명 — 전체적으로 올려 가독성 확보(밤 분위기는 유지)
  const ambient = new THREE.AmbientLight(0x5a5686, 1.35);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x8a9ad0, 0x241f38, 0.7); // 하늘/지면 반사광
  scene.add(hemi);
  const moonLight = new THREE.DirectionalLight(0xbcc8ff, 0.6);
  moonLight.position.set(-10, 30, 10);
  scene.add(moonLight);
  // 그림자: 플레이어 주변만 커버하는 이동식 섀도우 카메라(선명 + 저비용)
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(1024, 1024); // 모바일 성능 — 커버 범위가 좁아 1024로도 선명
  moonLight.shadow.bias = -0.0004;
  moonLight.shadow.normalBias = 0.03;
  const sc = moonLight.shadow.camera;
  sc.near = 1;
  sc.far = 90;
  sc.left = -20;
  sc.right = 20;
  sc.top = 20;
  sc.bottom = -20;
  const shadowTarget = new THREE.Object3D();
  scene.add(shadowTarget);
  moonLight.target = shadowTarget;
  function updateShadowFocus(x, z) {
    shadowTarget.position.set(x, 0, z);
    moonLight.position.set(x - 16, 20, z + 16); // 낮은 각도 → 벽·캐릭터 측면을 비춤
  }

  // 도로 + 인도
  const roadTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#14101f';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1c1730';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(40, 4);
  tryOverrideTexture('road', roadTex);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 14), new THREE.MeshLambertMaterial({ map: roadTex }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(CENTER, 0, 3.5);
  road.receiveShadow = true;
  scene.add(road);

  const walkTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#2a2340';
    g.fillRect(0, 0, 64, 64);
    g.strokeStyle = '#1c1730';
    g.lineWidth = 2;
    for (let i = 0; i <= 64; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, 64);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i);
      g.lineTo(64, i);
      g.stroke();
    }
  });
  walkTex.wrapS = walkTex.wrapT = THREE.RepeatWrapping;
  walkTex.repeat.set(50, 2);
  tryOverrideTexture('ground', walkTex);
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 5), new THREE.MeshLambertMaterial({ map: walkTex }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(CENTER, 0.01, -2.0);
  walk.receiveShadow = true;
  scene.add(walk);

  // 중앙선
  for (let x = -10; x < END + 12; x += 4) {
    const line = new THREE.Mesh(boxG(2, 0.02, 0.3), mat(0x8d82ad));
    line.position.set(x, 0.02, 5);
    scene.add(line);
  }

  // 가게 건물 (레지스트리)
  PLACES.forEach((s) => {
    if (s.stall) {
      // 포장마차: 줄무늬 천막 + 좌판
      const g = new THREE.Group();
      const tentTex = canvasTex(64, 32, (c) => {
        for (let i = 0; i < 8; i++) {
          c.fillStyle = i % 2 ? '#efe6d8' : '#e0512f';
          c.fillRect(i * 8, 0, 8, 32);
        }
      });
      const tent = new THREE.Mesh(boxG(5, 0.3, 3.4), new THREE.MeshLambertMaterial({ map: tentTex }));
      tent.position.y = 2.6;
      g.add(tent);
      const counter = new THREE.Mesh(boxG(4.4, 1.1, 1.6), mat(0x8a5c33));
      counter.position.y = 0.55;
      g.add(counter);
      [
        [-2.2, 0],
        [2.2, 0],
      ].forEach((p) => {
        const pole = new THREE.Mesh(boxG(0.18, 2.6, 0.18), mat(0x6a4a2a));
        pole.position.set(p[0], 1.3, 1.4);
        g.add(pole);
        const pole2 = pole.clone();
        pole2.position.z = -1.4;
        g.add(pole2);
      });
      for (let i = 0; i < 3; i++) {
        const cup = new THREE.Mesh(boxG(0.4, 0.45, 0.4), mat(0xc9402b));
        cup.position.set(-1 + i, 1.35, 0.2);
        g.add(cup);
      }
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(3.2, 0.8),
        new THREE.MeshBasicMaterial({ map: signTex(s.sign, s.color), transparent: false })
      );
      sign.position.set(0, 3.3, 1.71);
      g.add(sign);
      const signGlow = makeGlow(s.color, 4);
      signGlow.position.set(0, 3.3, 1.9);
      g.add(signGlow);
      const lampGlow = makeGlow(0xffb347, 2.6);
      lampGlow.position.set(0, 2.4, 1.2);
      g.add(lampGlow);
      g.position.set(s.x, 0, -5.5);
      scene.add(g);
      addSolid(s.x, -5.5, 4.4, 1.6); // 포장마차 좌판
    } else {
      const g = new THREE.Group();
      const bld = new THREE.Mesh(boxG(s.w, s.h, 7), new THREE.MeshLambertMaterial({ map: tryOverrideTexture('wall', wallTex(s.base, 0.55)) }));
      bld.position.y = s.h / 2;
      bld.castShadow = true;
      bld.receiveShadow = true;
      g.add(bld);
      const roof = new THREE.Mesh(boxG(s.w + 0.6, 0.5, 7.6), mat(0x12101c));
      roof.position.y = s.h + 0.25;
      g.add(roof);
      const door = new THREE.Mesh(boxG(1.6, 2.4, 0.2), mat(0xf7d9a0));
      door.position.set(0, 1.2, 3.55);
      g.add(door);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(s.w * 0.72, s.w * 0.18),
        new THREE.MeshBasicMaterial({ map: signTex(s.sign, s.color) })
      );
      sign.position.set(0, s.h - 0.8, 3.56);
      g.add(sign);
      const signGlow = makeGlow(s.color, s.w * 0.9);
      signGlow.position.set(0, s.h - 0.8, 3.8);
      g.add(signGlow);
      g.position.set(s.x, 0, -6.5);
      scene.add(g);
      addSolid(s.x, -6.5, s.w, 7); // 가게 건물
    }
  });

  // 배경 원경 건물 (거리 길이에 맞춰)
  const bgCount = Math.ceil(LEN / 8);
  for (let i = 0; i < bgCount; i++) {
    const h = 6 + Math.random() * 10;
    const w = 4 + Math.random() * 5;
    const b = new THREE.Mesh(boxG(w, h, 5), new THREE.MeshLambertMaterial({ map: tryOverrideTexture('wall', wallTex('#151129', 0.25)) }));
    const bx = -6 + i * 8 + Math.random() * 3;
    const bz = -16 - Math.random() * 6;
    b.position.set(bx, h / 2, bz);
    scene.add(b);
    addSolid(bx, bz, w, 5);
  }

  // 가로등
  for (let x = 0; x < END; x += 18) {
    const pole = new THREE.Mesh(boxG(0.15, 3.4, 0.15), mat(0x2a2440));
    pole.position.set(x, 1.7, 1.0);
    scene.add(pole);
    const head = new THREE.Mesh(boxG(0.5, 0.3, 0.5), mat(0xffe9b0));
    head.position.set(x, 3.4, 1.0);
    scene.add(head);
    const glow = makeGlow(0xffd98a, 2.2);
    glow.position.set(x, 3.35, 1.0);
    scene.add(glow);
  }

  // ── near-side 광장(세로 이동 공간 확장) ──
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(LEN, 13), new THREE.MeshLambertMaterial({ map: walkTex }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.set(CENTER, 0.006, 10.5);
  plaza.receiveShadow = true;
  scene.add(plaza);
  // near-side 벤치 + 가로등(라이트 없이 발광 헤드로 — 라이트 최소화)
  for (let x = 12; x < END; x += 24) {
    const bench = box(2, 0.4, 0.6, 0x5a4632);
    bench.position.set(x, 0.25, 12.5);
    scene.add(bench);
    const pole = box(0.15, 3.2, 0.15, 0x2a2440);
    pole.position.set(x + 6, 1.6, 11.5);
    scene.add(pole);
    const head = new THREE.Mesh(boxG(0.4, 0.25, 0.4), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
    head.position.set(x + 6, 3.15, 11.5);
    scene.add(head);
    const gl = makeGlow(0xffd98a, 1.8);
    gl.position.set(x + 6, 3.1, 11.5);
    scene.add(gl);
  }

  // ── 골목(세로 탐험) x≈40, 뒤쪽(-z)으로 이어짐 ──
  const alleyX = 40;
  const alley = new THREE.Mesh(new THREE.PlaneGeometry(6, 22), new THREE.MeshLambertMaterial({ map: walkTex }));
  alley.rotation.x = -Math.PI / 2;
  alley.position.set(alleyX, 0.006, -15);
  alley.receiveShadow = true;
  scene.add(alley);
  for (let z = -9; z > -25; z -= 5) {
    [alleyX - 3.9, alleyX + 3.9].forEach((x) => {
      const h = 5 + Math.random() * 4;
      const b = new THREE.Mesh(boxG(3, h, 4), new THREE.MeshLambertMaterial({ map: tryOverrideTexture('wall', wallTex('#1c1836', 0.5)) }));
      b.position.set(x, h / 2, z);
      b.castShadow = true;
      b.receiveShadow = true;
      scene.add(b);
      addSolid(x, z, 3, 4);
    });
  }
  const alleySign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshBasicMaterial({ map: signTex('골목', '#8affc1') }));
  alleySign.position.set(alleyX, 4.2, -6.3);
  scene.add(alleySign);
  const alleyGlow = makeGlow('#8affc1', 3);
  alleyGlow.position.set(alleyX, 4.2, -6.0);
  scene.add(alleyGlow);
  // 골목 끝 '준비중' 가게(향후 확장 자리)
  const comingSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.75), new THREE.MeshBasicMaterial({ map: signTex('준비중', '#ffc247') }));
  comingSign.position.set(alleyX, 3, -24);
  scene.add(comingSign);

  // 달 + 후광
  const moon = new THREE.Mesh(boxG(3, 3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  moon.position.set(40, 26, -40);
  scene.add(moon);
  const moonGlow = makeGlow(0xffe9b0, 4.5);
  moonGlow.position.set(40, 26, -39.5);
  scene.add(moonGlow);

  // ── 시간대(낮/밤) 보간 — k: 0=한밤, 1=한낮 ──
  const NIGHT = {
    bg: new THREE.Color(0x1a1836), amb: new THREE.Color(0x9a94c0), ai: 1.5,
    hs: new THREE.Color(0xa4b0e0), hg: new THREE.Color(0x3a3450), hi: 0.8,
    mc: new THREE.Color(0xd6def0), mi: 1.0, orb: new THREE.Color(0xffe9b0),
    fn: 30, ff: 90,
  };
  const DAY = {
    bg: new THREE.Color(0x7aa8d8), amb: new THREE.Color(0xffeecc), ai: 1.35,
    hs: new THREE.Color(0x9dc0f0), hg: new THREE.Color(0x5a6a4a), hi: 0.7,
    mc: new THREE.Color(0xfff0d0), mi: 0.95, orb: new THREE.Color(0xfff6c0),
    fn: 42, ff: 115,
  };
  const lerp = (a, b, k) => a + (b - a) * k;
  function setDaylight(k) {
    scene.background.copy(NIGHT.bg).lerp(DAY.bg, k);
    scene.fog.color.copy(NIGHT.bg).lerp(DAY.bg, k);
    scene.fog.near = lerp(NIGHT.fn, DAY.fn, k);
    scene.fog.far = lerp(NIGHT.ff, DAY.ff, k);
    ambient.color.copy(NIGHT.amb).lerp(DAY.amb, k);
    ambient.intensity = lerp(NIGHT.ai, DAY.ai, k);
    hemi.color.copy(NIGHT.hs).lerp(DAY.hs, k);
    hemi.groundColor.copy(NIGHT.hg).lerp(DAY.hg, k);
    hemi.intensity = lerp(NIGHT.hi, DAY.hi, k);
    moonLight.color.copy(NIGHT.mc).lerp(DAY.mc, k);
    moonLight.intensity = lerp(NIGHT.mi, DAY.mi, k);
    moon.material.color.copy(NIGHT.orb).lerp(DAY.orb, k);
    moonGlow.material.color.copy(NIGHT.orb).lerp(DAY.orb, k);
  }

  function resize() {
    const wrap = document.getElementById('streetwrap');
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { renderer, scene, camera, resize, setDaylight, solids, updateShadowFocus };
}
