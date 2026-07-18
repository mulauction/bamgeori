// 베팅 패널: 칩 프리셋 + 현재 판돈 표시
import { CHIP_VALUES, DEFAULT_BET } from '../core/economy.js';
import { store } from '../core/store.js';
import { fmt } from './util.js';

/**
 * 판돈 선택 패널을 만든다.
 * @param {object} opts
 * @param {(bet:number)=>void} [opts.onChange] 판돈 변경 콜백
 * @returns {{ el: HTMLElement, getBet: ()=>number }}
 */
export function createBetPanel({ onChange } = {}) {
  let bet = DEFAULT_BET;

  const panel = document.createElement('div');
  panel.className = 'betpanel';

  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = '판돈 걸기';
  panel.appendChild(label);

  const chips = document.createElement('div');
  chips.className = 'chips';
  panel.appendChild(chips);

  const betnow = document.createElement('div');
  betnow.className = 'betnow';
  const betSpan = document.createElement('span');
  betnow.append('현재 판돈: ', betSpan, 'P');
  panel.appendChild(betnow);

  function setBet(v) {
    bet = v;
    betSpan.textContent = fmt(bet);
    onChange?.(bet);
  }

  CHIP_VALUES.forEach((v) => {
    const b = document.createElement('button');
    const isAllIn = v === '올인';
    b.className = 'chip' + (v === DEFAULT_BET ? ' sel' : '');
    b.textContent = isAllIn ? '올인' : fmt(v);
    b.onclick = () => {
      chips.querySelectorAll('.chip').forEach((c) => c.classList.remove('sel'));
      b.classList.add('sel');
      setBet(isAllIn ? store.getPoints() : v);
    };
    chips.appendChild(b);
  });

  betSpan.textContent = fmt(bet);

  return {
    el: panel,
    getBet: () => bet,
  };
}
