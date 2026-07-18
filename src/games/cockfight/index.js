// ══════════════════════════════════════════════════════════════
//  닭싸움 — 능력치 공개, 결과는 실제 확률 (2층: 관전·베팅형)
//  능력치 범위·데미지 계수·배수는 economy.CONFIG.cockfight 에서.
//  start는 {win, multiplier} 반환. 정산은 economy가 처리.
// ══════════════════════════════════════════════════════════════

import { CONFIG } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { drawSprite } from '../sprite.js';

const CFG = CONFIG.cockfight;

const CHK = [
  '....RR......',
  '...RRRR.....',
  '..KWWWWK....',
  '.KWWWWWWKOO.',
  '.KWEWWWWK...',
  '.KWWWWWWK...',
  '.KWWWWWWK...',
  '..KWWWWK....',
  '...KWWK.....',
  '....KK......',
  '....LL......',
  '...LL.LL....',
];

let cv = null;
let ctx2d = null;
let pickBox = null;
let hpBlueEl = null;
let hpRedEl = null;
let nmBlueEl = null;
let nmRedEl = null;

let blue = null;
let red = null;
let pick = ''; // 'blue' | 'red'
let busy = false;

function rollChicken() {
  return {
    name: CFG.names[Math.floor(Math.random() * CFG.names.length)],
    atk: CFG.atk.min + Math.floor(Math.random() * CFG.atk.span),
    hp: CFG.hp.min + Math.floor(Math.random() * CFG.hp.span),
  };
}

function drawFrame(off) {
  off = off || {};
  const g = ctx2d;
  g.fillStyle = '#171326';
  g.fillRect(0, 0, 360, 132);
  g.fillStyle = '#3d2c1c';
  g.fillRect(0, 104, 360, 28);
  g.fillStyle = '#54402a';
  g.fillRect(0, 104, 360, 4);
  g.fillStyle = '#100d1f';
  for (let i = 0; i < 12; i++) {
    g.fillRect(i * 32 + 6, 20 + (i % 2) * 6, 20, 26);
    g.fillRect(i * 32 + 11, 10 + (i % 2) * 6, 10, 10);
  }
  const palB = { K: '#12101c', W: '#e8f4ff', R: '#ff5964', O: '#ffc247', L: '#ffc247', E: '#12101c' };
  const palR = { K: '#12101c', W: '#d8a05c', R: '#ff5964', O: '#ffc247', L: '#ffc247', E: '#12101c' };
  drawSprite(g, CHK, palB, 60 + (off.blue || 0), 68, 3, false);
  drawSprite(g, CHK, palR, 254 + (off.red || 0), 68, 3, true);
  if (off.spark) {
    g.fillStyle = '#ffc247';
    for (let i = 0; i < 6; i++) g.fillRect(off.spark + Math.random() * 30 - 15, 80 + Math.random() * 24, 3, 3);
  }
}

function buildPicks() {
  pickBox.innerHTML = '';
  pick = '';
  [
    ['blue', '🟦 ' + blue.name],
    ['red', '🟥 ' + red.name],
  ].forEach(([side, label]) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.textContent = label;
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      pick = side;
    };
    pickBox.appendChild(b);
  });
}

function rollMatch() {
  blue = rollChicken();
  red = rollChicken();
  while (red.name === blue.name) red = rollChicken();
  blue.cur = blue.hp;
  red.cur = red.hp;
  nmBlueEl.textContent = '🟦 ' + blue.name + ' (공' + blue.atk + '/체' + blue.hp + ')';
  nmRedEl.textContent = '(공' + red.atk + '/체' + red.hp + ') ' + red.name + ' 🟥';
  hpBlueEl.style.width = '100%';
  hpRedEl.style.width = '100%';
  buildPicks();
  drawFrame();
}

export default {
  id: 'cockfight',
  name: '뒷골목 닭싸움장',
  sub: '능력치는 공개됩니다. 그래도 닭은 닭 마음대로 싸웁니다. 승리 시 1.9배.',
  actionLabel: '싸움 붙이기',
  minBet: 500,
  kind: 'wager',

  mount(container /* , ctx */) {
    pickBox = document.createElement('div');
    pickBox.className = 'pick2';
    container.appendChild(pickBox);

    const bars = document.createElement('div');
    bars.className = 'hpbars';
    bars.innerHTML =
      '<div class="hpcol b"><div class="nm"></div><div class="hpbar"><div class="hp" style="width:100%"></div></div></div>' +
      '<div class="hpcol r"><div class="nm"></div><div class="hpbar"><div class="hp" style="width:100%"></div></div></div>';
    container.appendChild(bars);
    nmBlueEl = bars.querySelector('.hpcol.b .nm');
    nmRedEl = bars.querySelector('.hpcol.r .nm');
    hpBlueEl = bars.querySelector('.hpcol.b .hp');
    hpRedEl = bars.querySelector('.hpcol.r .hp');

    cv = document.createElement('canvas');
    cv.className = 'gamecv';
    cv.width = 360;
    cv.height = 132;
    container.appendChild(cv);
    ctx2d = cv.getContext('2d');

    rollMatch();
  },

  isReady() {
    return !!pick;
  },

  reset() {
    busy = false;
    rollMatch();
  },

  async start(/* bet */) {
    busy = true;
    let turn = Math.random() < 0.5 ? 'blue' : 'red';
    const sides = { blue, red };
    while (blue.cur > 0 && red.cur > 0) {
      const atkSide = turn;
      const defSide = turn === 'blue' ? 'red' : 'blue';
      const dmg = Math.floor(sides[atkSide].atk * (CFG.dmgFactor.base + Math.random() * CFG.dmgFactor.span));
      sides[defSide].cur = Math.max(0, sides[defSide].cur - dmg);
      const dir = atkSide === 'blue' ? 1 : -1;
      for (let step = 0; step <= 3; step++) {
        const o = {};
        o[atkSide] = dir * step * 22;
        drawFrame(o);
        await wait(35);
      }
      const o2 = {};
      o2[atkSide] = dir * 66;
      o2.spark = atkSide === 'blue' ? 200 : 150;
      drawFrame(o2);
      (defSide === 'blue' ? hpBlueEl : hpRedEl).style.width =
        (sides[defSide].cur / sides[defSide].hp) * 100 + '%';
      await wait(160);
      drawFrame();
      await wait(260);
      turn = defSide;
    }
    const winSide = blue.cur > 0 ? 'blue' : 'red';
    toast('🏆 승자: ' + sides[winSide].name);
    await wait(500);
    busy = false;
    return { win: pick === winSide, multiplier: CFG.multiplier };
  },

  unmount() {
    if (pickBox) pickBox.innerHTML = '';
    cv = null;
    ctx2d = null;
    pickBox = null;
    hpBlueEl = hpRedEl = nmBlueEl = nmRedEl = null;
    blue = red = null;
    pick = '';
    busy = false;
  },
};
