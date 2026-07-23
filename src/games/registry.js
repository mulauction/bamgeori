// ══════════════════════════════════════════════════════════════
//  registry.js — 게임/가게 레지스트리
//  모듈을 등록하면 거리 가게 배치(x·간판·건물)와 라우팅이 자동 생성된다.
//  게임 1종 = 가게 1곳. 새 게임은 여기 배열에 추가만 하면 거리에 나타난다.
// ══════════════════════════════════════════════════════════════

import yabawi from './yabawi/index.js';
import dograce from './dograce/index.js';
import cockfight from './cockfight/index.js';
import workDaeri from './work-daeri/index.js';
import holjjak from './holjjak/index.js';
import rps from './rps/index.js';
import ladder from './ladder/index.js';
import jebi from './jebi/index.js';
import limbo from './limbo/index.js';
import shop from '../ui/shop.js';

// 등록 순서 = 거리 배치 순서(구역 내). 새 게임은 여기에 추가.
const MODULES = [yabawi, dograce, cockfight, holjjak, rps, ladder, jebi, limbo, workDaeri, shop];

// 구역 순서 + 구역별 기본 건물 스타일(간판/게임이 지정 안 하면 사용)
const DISTRICT_ORDER = ['main', 'yasijang', 'backalley'];
const DISTRICT_DEFAULT = {
  main: { w: 8, h: 7, base: '#243055' },
  yasijang: { w: 7, h: 6, base: '#5a3a2a' },
  backalley: { w: 8, h: 8, base: '#2a2438' },
};

// 기존 5곳의 건물 스타일(현 외형 보존)
const STYLE = {
  yabawi: { stall: true },
  dograce: { w: 10, h: 9, base: '#243a63' },
  cockfight: { w: 9, h: 7, base: '#5c3a24' },
  'work-daeri': { w: 8, h: 6, base: '#1f4238' },
  mall: { w: 9, h: 8, base: '#4a2a5c' },
};

const START_X = 8;
const STEP = 22; // 가게 간격
const GAP = 30; // 구역 사이 간격

function layout() {
  const places = [];
  const districtRanges = {};
  let x = START_X;
  for (const d of DISTRICT_ORDER) {
    const inD = MODULES.filter((m) => (m.district || 'main') === d);
    if (!inD.length) continue;
    const xStart = x;
    for (const m of inD) {
      const style = STYLE[m.id] || DISTRICT_DEFAULT[d];
      places.push({
        id: m.id,
        scene: m.id,
        name: m.name,
        sign: m.sign || m.name,
        color: m.color || '#ffc247',
        district: d,
        module: m,
        x,
        ...style,
      });
      x += STEP;
    }
    districtRanges[d] = { start: xStart - 11, end: x - STEP + 11 };
    x += GAP;
  }
  return { places, districtRanges, endX: x - GAP };
}

const L = layout();
export const PLACES = L.places;
export const DISTRICT_RANGES = L.districtRanges;
export const STREET_END = Math.max(L.endX + 12, 100); // 거리 길이(동적)

export function getModule(id) {
  const p = PLACES.find((pl) => pl.id === id);
  return p ? p.module : null;
}
