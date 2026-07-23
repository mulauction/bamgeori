// ══════════════════════════════════════════════════════════════
//  휠 (야시장 돌림판) — 배수 세그먼트를 돌려 뽑는다. 리스크별 분포(EV 동일).
//  각 세트 합 = 세그먼트수 × RTP → 균등 착지 시 EV=RTP. 결과 사전 확정.
// ══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { create3D } from './../scene3d.js';

// 세 세트 모두 10칸, 합 9.5 (평균 0.95)
const SETS = {
  1: [1.2, 1.5, 1.2, 1.5, 0, 1.2, 1.5, 0.5, 0.9, 0], // 저위험
  2: [0, 2.0, 0, 3.0, 0, 1.5, 0, 1.5, 1.5, 0], // 중위험
  3: [0, 0, 0, 0, 0, 0, 0, 0, 4.75, 4.75], // 고위험
};

let view = null;
let disc = null;
let numEl = null;
let curSegs = SETS[2];

function segColor(m) {
  return m === 0 ? '#3a3550' : m >= 4 ? '#ffc247' : m >= 2 ? '#6cf0a8' : '#6fd3ff';
}

function wheelTex(segs) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  const n = segs.length;
  for (let i = 0; i < n; i++) {
    g.beginPath();
    g.moveTo(128, 128);
    g.arc(128, 128, 126, (i / n) * 2 * Math.PI, ((i + 1) / n) * 2 * Math.PI);
    g.closePath();
    g.fillStyle = segColor(segs[i]);
    g.fill();
    g.strokeStyle = '#0d0b16';
    g.lineWidth = 2;
    g.stroke();
    const a = ((i + 0.5) / n) * 2 * Math.PI;
    g.save();
    g.translate(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82);
    g.fillStyle = '#0d0b16';
    g.font = '900 18px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(segs[i] === 0 ? '꽝' : segs[i] + 'x', 0, 0);
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  return t;
}

function buildDisc(segs) {
  if (disc) {
    disc.material.map.dispose();
    disc.material.dispose();
    disc.geometry.dispose();
    view.scene.remove(disc);
  }
  disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ map: wheelTex(segs) }));
  disc.position.set(0, 1.3, 0);
  view.scene.add(disc);
}

function buildScene(container) {
  view = create3D(container, { height: 250, fov: 45, bg: 0x160f1e });
  view.camera.position.set(0, 1.3, 5.2);
  view.camera.lookAt(0, 1.3, 0);
  view.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  buildDisc(curSegs);
  // 상단 포인터
  const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 3), new THREE.MeshBasicMaterial({ color: 0xff5964 }));
  ptr.position.set(0, 3.1, 0.1);
  ptr.rotation.z = Math.PI;
  view.scene.add(ptr);
  view.start(() => {});
}

export default {
  id: 'wheel',
  name: '야시장 돌림판',
  sub: '배수 칸을 돌려 뽑는다. 리스크가 높을수록 한 방.',
  sign: '돌림판',
  color: '#ff9ad0',
  district: 'yasijang',
  actionLabel: '돌리기',
  minBet: 500,
  kind: 'wager',
  betUI: {
    risk: { label: '리스크', min: 1, max: 3, step: 1, default: 2, format: (v) => ['', '낮음', '중간', '높음'][v] },
  },
  preview({ risk }) {
    const segs = SETS[risk] || SETS[2];
    const nz = segs.filter((m) => m > 0).length;
    return { prob: nz / segs.length, payout: Math.max(...segs) };
  },

  mount(container) {
    buildScene(container);
    numEl = document.createElement('div');
    numEl.className = 'bignum';
    numEl.style.top = 'auto';
    numEl.style.bottom = '8px';
    view.wrap.appendChild(numEl);
  },

  reset() {
    if (numEl) {
      numEl.textContent = '';
      numEl.style.color = '';
    }
  },

  async start(bet, opts) {
    const risk = (opts && opts.risk) || 2;
    curSegs = SETS[risk];
    buildDisc(curSegs);
    const n = curSegs.length;
    const idx = Math.floor(Math.random() * n); // 균등 착지(사전 확정)
    const mult = curSegs[idx];
    // 세그먼트 idx 중심을 상단(포인터)으로: 캔버스 각도 기준 근사 정렬
    const centerA = ((idx + 0.5) / n) * 2 * Math.PI;
    const targetZ = 6 * 2 * Math.PI + (Math.PI / 2 + centerA);
    const t0 = performance.now();
    const dur = 2600;
    const startZ = disc.rotation.z;
    await new Promise((done) => {
      const step = (t) => {
        const u = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - u, 3);
        disc.rotation.z = startZ + (targetZ - startZ) * e;
        if (u < 1) requestAnimationFrame(step);
        else done();
      };
      requestAnimationFrame(step);
    });
    numEl.textContent = mult === 0 ? '꽝' : mult + '배!';
    numEl.style.color = mult > 0 ? '#6cf0a8' : '#ff5964';
    toast(mult === 0 ? '꽝!' : mult + '배 당첨!');
    await wait(700);
    return { win: mult > 0, multiplier: mult };
  },

  unmount() {
    if (view) view.dispose();
    view = null;
    disc = null;
    numEl = null;
  },
};
