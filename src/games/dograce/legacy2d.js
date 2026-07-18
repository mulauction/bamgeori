// ══════════════════════════════════════════════════════════════
//  개경주 — 배당 걸고 우승견 맞히기 (2층: 관전·베팅형)
//  개 목록/배당/가중치는 economy.CONFIG.dograce 에서 가져온다.
//  결과는 실제 확률(weight)로만 결정한다. start는 {win, multiplier} 반환.
// ══════════════════════════════════════════════════════════════

import { CONFIG } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { drawSprite } from '../sprite.js';

const DOGS = CONFIG.dograce.dogs;

// 걷는 두 프레임
const DOG_A = [
  '...........KKK..',
  '..........KBBBK.',
  'KK........KBBEK.',
  'KBK......KBBBK..',
  '.KBKKKKKKBBBK...',
  '.KBBBBBBBBBK....',
  '..KBBBBBBBK.....',
  '...KBK..KBK.....',
  '...KBK..KBK.....',
  '...KK....KK.....',
];
const DOG_B = [
  '...........KKK..',
  '..........KBBBK.',
  'KK........KBBEK.',
  'KBK......KBBBK..',
  '.KBKKKKKKBBBK...',
  '.KBBBBBBBBBK....',
  '..KBBBBBBBK.....',
  '..KBK....KBK....',
  '.KBK......KBK...',
  '.KK........KK...',
];

let ctx2d = null;
let cv = null;
let pick = -1;
let busy = false;
let pos = [0, 0, 0, 0];
let pickBox = null;

function drawFrame() {
  const g = ctx2d;
  g.fillStyle = '#101326';
  g.fillRect(0, 0, 360, 152);
  for (let y = 0; y < 152; y += 8) {
    g.fillStyle = (y / 8) % 2 ? '#efe6d8' : '#12101c';
    g.fillRect(330, y, 5, 8);
  }
  for (let i = 0; i < DOGS.length; i++) {
    const laneY = 8 + i * 36;
    g.fillStyle = '#1c2140';
    g.fillRect(0, laneY + 26, 360, 2);
    const x = 8 + pos[i] * 310;
    const frame = Math.floor(x / 9) % 2 ? DOG_B : DOG_A;
    drawSprite(g, frame, { K: '#12101c', B: DOGS[i].color, E: '#12101c' }, Math.floor(x), laneY + 6, 2, false);
    g.fillStyle = '#8d82ad';
    g.font = '900 9px sans-serif';
    g.textAlign = 'left';
    g.fillText(DOGS[i].name, 4, laneY + 4);
  }
}

// 가중치 기반 우승견 추첨 (실제 확률)
function weightedWinner() {
  const total = DOGS.reduce((s, d) => s + d.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < DOGS.length; i++) {
    r -= DOGS[i].weight;
    if (r < 0) return i;
  }
  return 0;
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = -1;
  DOGS.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.innerHTML = d.name + '<span class="odds">×' + d.odds.toFixed(1) + '</span>';
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      pick = i;
    };
    pickBox.appendChild(b);
  });
}

export default {
  id: 'dograce',
  name: '달빛 개경주장',
  sub: '배당이 높을수록 이변입니다. 어디에 거시겠습니까.',
  actionLabel: '출발!',
  minBet: 500,
  kind: 'wager',

  mount(container /* , ctx */) {
    pickBox = document.createElement('div');
    pickBox.className = 'dogpick';
    container.appendChild(pickBox);

    cv = document.createElement('canvas');
    cv.className = 'gamecv';
    cv.width = 360;
    cv.height = 152;
    container.appendChild(cv);
    ctx2d = cv.getContext('2d');

    buildPicks();
    pos = [0, 0, 0, 0];
    drawFrame();
  },

  isReady() {
    return pick >= 0;
  },

  reset() {
    busy = false;
    pos = [0, 0, 0, 0];
    buildPicks();
    drawFrame();
  },

  async start(/* bet */) {
    busy = true;
    const winner = weightedWinner();
    const dur = 4200 + Math.random() * 800;
    const t0 = performance.now();
    await new Promise((done) => {
      function frame(t) {
        const el = (t - t0) / dur;
        for (let i = 0; i < DOGS.length; i++) {
          const base = i === winner ? el : el * (0.82 + Math.random() * 0.14);
          const wob = Math.sin(t / 180 + i * 2) * 0.015;
          pos[i] = Math.min(1, base + wob + (i === winner && el > 0.75 ? (el - 0.75) * 0.5 : 0));
        }
        drawFrame();
        if (el < 1) requestAnimationFrame(frame);
        else done();
      }
      requestAnimationFrame(frame);
    });
    toast('🏁 우승: ' + DOGS[winner].name);
    await wait(500);
    busy = false;
    // 승리 시 배수는 내가 고른 개의 배당
    return { win: pick === winner, multiplier: DOGS[pick].odds };
  },

  unmount() {
    if (pickBox) pickBox.innerHTML = '';
    ctx2d = null;
    cv = null;
    pickBox = null;
    busy = false;
    pick = -1;
  },
};
