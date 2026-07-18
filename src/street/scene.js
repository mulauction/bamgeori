// ══════════════════════════════════════════════════════════════
//  street/scene.js — 3D 복셀 거리 씬 구성
//  씬·렌더러·카메라·조명 + 도로/건물/네온 간판/가로등/달/원경.
//  텍스처는 전부 캔버스로 생성(외부 파일 불필요) → 에셋 교체 지점.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// 거리에 놓인 가게들. scene 값이 진입 시 열릴 화면 id.
export const SHOPS = [
  { x: 8, name: '야바위 포장마차', scene: 'yabawi', sign: '야바위', color: '#ff8f5e', stall: true },
  { x: 30, name: '달빛 개경주장', scene: 'dograce', sign: '개경주', color: '#6fd3ff', w: 10, h: 9, base: '#243a63' },
  { x: 52, name: '뒷골목 닭싸움장', scene: 'cockfight', sign: '닭싸움', color: '#ffd166', w: 9, h: 7, base: '#5c3a24' },
  { x: 74, name: '새벽 대리운전', scene: 'work-daeri', sign: '대리운전', color: '#8affc1', w: 8, h: 6, base: '#1f4238' },
  { x: 96, name: '황금 전당포', scene: 'mall', sign: '전당포', color: '#e0b3ff', w: 9, h: 8, base: '#4a2a5c' },
];

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

/**
 * 거리 씬을 만든다.
 * @returns {{ renderer, scene, camera, resize }}
 */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // 필믹 톤매핑 — 밤거리 네온이 뭉개지지 않고 살아나게
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14122a);
  scene.fog = new THREE.Fog(0x14122a, 24, 70);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);

  // 조명 — 전체적으로 올려 가독성 확보(밤 분위기는 유지)
  scene.add(new THREE.AmbientLight(0x5a5686, 1.35));
  scene.add(new THREE.HemisphereLight(0x8a9ad0, 0x241f38, 0.7)); // 하늘/지면 반사광
  const moonLight = new THREE.DirectionalLight(0xbcc8ff, 0.6);
  moonLight.position.set(-10, 30, 10);
  scene.add(moonLight);

  // 도로 + 인도
  const roadTex = canvasTex(64, 64, (g) => {
    g.fillStyle = '#14101f';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#1c1730';
    for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  });
  roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping;
  roadTex.repeat.set(40, 4);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(200, 14), new THREE.MeshLambertMaterial({ map: roadTex }));
  road.rotation.x = -Math.PI / 2;
  road.position.set(50, 0, 3.5);
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
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(200, 5), new THREE.MeshLambertMaterial({ map: walkTex }));
  walk.rotation.x = -Math.PI / 2;
  walk.position.set(50, 0.01, -2.0);
  scene.add(walk);

  // 중앙선
  for (let x = -10; x < 120; x += 4) {
    const line = new THREE.Mesh(boxG(2, 0.02, 0.3), mat(0x8d82ad));
    line.position.set(x, 0.02, 5);
    scene.add(line);
  }

  // 가게 건물
  SHOPS.forEach((s) => {
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
      const lamp = new THREE.PointLight(0xffb347, 1.7, 12);
      lamp.position.set(0, 2.4, 1.2);
      g.add(lamp);
      g.position.set(s.x, 0, -5.5);
      scene.add(g);
    } else {
      const g = new THREE.Group();
      const bld = new THREE.Mesh(boxG(s.w, s.h, 7), new THREE.MeshLambertMaterial({ map: wallTex(s.base, 0.55) }));
      bld.position.y = s.h / 2;
      g.add(bld);
      const roof = new THREE.Mesh(boxG(s.w + 0.6, 0.5, 7.6), mat(0x12101c));
      roof.position.y = s.h + 0.25;
      g.add(roof);
      const door = new THREE.Mesh(boxG(1.6, 2.4, 0.2), mat(0xf7d9a0));
      door.position.set(0, 1.2, 3.55);
      g.add(door);
      const doorLight = new THREE.PointLight(0xffe0a0, 1.3, 8);
      doorLight.position.set(0, 2.2, 4.2);
      g.add(doorLight);
      const sign = new THREE.Mesh(
        new THREE.PlaneGeometry(s.w * 0.72, s.w * 0.18),
        new THREE.MeshBasicMaterial({ map: signTex(s.sign, s.color) })
      );
      sign.position.set(0, s.h - 0.8, 3.56);
      g.add(sign);
      const neon = new THREE.PointLight(new THREE.Color(s.color), 1.6, 13);
      neon.position.set(0, s.h - 0.8, 4.6);
      g.add(neon);
      g.position.set(s.x, 0, -6.5);
      scene.add(g);
    }
  });

  // 배경 원경 건물
  for (let i = 0; i < 16; i++) {
    const h = 6 + Math.random() * 10;
    const w = 4 + Math.random() * 5;
    const b = new THREE.Mesh(boxG(w, h, 5), new THREE.MeshLambertMaterial({ map: wallTex('#151129', 0.25) }));
    b.position.set(-6 + i * 8 + Math.random() * 3, h / 2, -16 - Math.random() * 6);
    scene.add(b);
  }

  // 가로등
  for (let x = 0; x < 110; x += 18) {
    const pole = new THREE.Mesh(boxG(0.15, 3.4, 0.15), mat(0x2a2440));
    pole.position.set(x, 1.7, 1.0);
    scene.add(pole);
    const head = new THREE.Mesh(boxG(0.5, 0.3, 0.5), mat(0xffe9b0));
    head.position.set(x, 3.4, 1.0);
    scene.add(head);
    const l = new THREE.PointLight(0xffd98a, 1.5, 11);
    l.position.set(x, 3.2, 1.0);
    scene.add(l);
  }

  // 달
  const moon = new THREE.Mesh(boxG(3, 3, 0.3), new THREE.MeshBasicMaterial({ color: 0xffe9b0 }));
  moon.position.set(40, 26, -40);
  scene.add(moon);

  function resize() {
    const wrap = document.getElementById('streetwrap');
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  return { renderer, scene, camera, resize };
}
