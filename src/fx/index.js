// ══════════════════════════════════════════════════════════════
//  fx — 승리 연출 등급 판정
//  배당 배수를 기준으로 등급(일반/빅윈/잭팟)을 자동 판정한다.
//  임계값은 economy.GRADE 에 있다(수치 단일화 원칙).
//  ※ 1단계는 등급 '판정'만 구현. 화면 효과·사운드는 2단계.
// ══════════════════════════════════════════════════════════════

import { GRADE } from '../core/economy.js';

/** 등급 상수 */
export const WIN_GRADE = {
  NORMAL: 'normal', // 일반 승
  BIGWIN: 'bigwin', // 빅윈
  JACKPOT: 'jackpot', // 잭팟
};

/**
 * 배당 배수 → 승리 등급
 * @param {number} multiplier 배당 배수
 * @returns {'normal'|'bigwin'|'jackpot'}
 */
export function gradeOf(multiplier) {
  if (multiplier >= GRADE.JACKPOT) return WIN_GRADE.JACKPOT;
  if (multiplier >= GRADE.BIGWIN) return WIN_GRADE.BIGWIN;
  return WIN_GRADE.NORMAL;
}

export const fx = {
  gradeOf,
  WIN_GRADE,
};
