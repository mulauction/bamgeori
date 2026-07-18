// ══════════════════════════════════════════════════════════════
//  fx — 승리 연출 등급제
//  배당 배수 → 등급(일반/빅윈/잭팟) 판정 + 등급별 화면 연출.
//  임계값은 economy.GRADE(수치 단일화). 사운드는 audio 모듈 경유.
//  잭팟은 거리 전광판 문구를 marquee에 예약한다.
// ══════════════════════════════════════════════════════════════

import { GRADE } from '../core/economy.js';
import { audio } from '../core/audio.js';
import { marquee } from './marquee.js';
import { fmt, wait } from '../ui/util.js';

export const WIN_GRADE = {
  NORMAL: 'normal',
  BIGWIN: 'bigwin',
  JACKPOT: 'jackpot',
};

export function gradeOf(multiplier) {
  if (multiplier >= GRADE.JACKPOT) return WIN_GRADE.JACKPOT;
  if (multiplier >= GRADE.BIGWIN) return WIN_GRADE.BIGWIN;
  return WIN_GRADE.NORMAL;
}

// ── 오버레이 레이어(지연 생성) ────────────────────────────────
let layer = null;
function ensureLayer() {
  if (layer) return layer;
  layer = document.createElement('div');
  layer.id = 'fxlayer';
  document.body.appendChild(layer);
  return layer;
}
function el(cls, parent) {
  const d = document.createElement('div');
  d.className = cls;
  (parent || ensureLayer()).appendChild(d);
  return d;
}
function vibrate(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch {
    /* 미지원 무시 */
  }
}

// 숫자 카운트업 (지정 엘리먼트 textContent를 0→amount)
function countUp(node, amount, dur, prefix = '+', suffix = 'P') {
  const start = performance.now();
  return new Promise((resolve) => {
    function step(t) {
      const k = Math.min(1, (t - start) / dur);
      const v = Math.floor(amount * (1 - Math.pow(1 - k, 2)));
      node.textContent = prefix + fmt(v) + suffix;
      if (k < 1) requestAnimationFrame(step);
      else {
        node.textContent = prefix + fmt(amount) + suffix;
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function burstParticles(container, count, colorClass) {
  for (let i = 0; i < count; i++) {
    const p = el('fx-particle ' + colorClass, container);
    const ang = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 180;
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    p.style.animationDelay = Math.random() * 0.15 + 's';
  }
}

// ── 일반 승 ──
async function playNormal(info) {
  const root = el('fx-normal');
  const flash = el('fx-flash', root);
  const num = el('fx-num sm', root);
  audio.play('fanfare');
  requestAnimationFrame(() => flash.classList.add('on'));
  await countUp(num, info.amount, 700);
  await wait(300);
  root.remove();
}

// ── 빅윈 ──
async function playBigwin(info) {
  const root = el('fx-bigwin');
  el('fx-radial gold', root);
  const num = el('fx-num lg pop', root);
  const label = el('fx-label', root);
  label.textContent = '빅윈!';
  audio.play('bigwin');
  vibrate([0, 40, 30, 70]);
  burstParticles(root, 26, 'gold');
  await countUp(num, info.amount, 900);
  await wait(700);
  root.remove();
}

// ── 잭팟 ──
async function playJackpot(info) {
  const root = el('fx-jackpot');
  const black = el('fx-black', root);
  requestAnimationFrame(() => black.classList.add('on'));
  await wait(350);
  el('fx-spotlight', root);
  const mult = el('fx-mult pop', root);
  mult.textContent = '×' + info.multiplier;
  audio.play('jackpot');
  vibrate([0, 80, 40, 80, 40, 120]);
  await wait(600);
  const num = el('fx-num lg', root);
  await countUp(num, info.amount, 1100);
  burstParticles(root, 40, 'multi');
  // 거리 전광판 문구 예약(P6에서 흐름)
  marquee.push('🎰 당신, ' + info.gameName + '에서 ' + fmt(info.amount) + 'P 획득!');
  await wait(900);
  root.remove();
}

async function playLose() {
  const root = el('fx-lose');
  audio.play('lose');
  requestAnimationFrame(() => root.classList.add('on'));
  await wait(500);
  root.remove();
}

/**
 * 승리 연출 재생.
 * @param {'normal'|'bigwin'|'jackpot'} grade
 * @param {{amount:number, multiplier:number, gameName:string}} info
 */
async function playWin(grade, info) {
  if (grade === WIN_GRADE.JACKPOT) return playJackpot(info);
  if (grade === WIN_GRADE.BIGWIN) return playBigwin(info);
  return playNormal(info);
}

export const fx = {
  gradeOf,
  WIN_GRADE,
  playWin,
  playLose,
};
