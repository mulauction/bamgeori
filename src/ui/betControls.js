// ══════════════════════════════════════════════════════════════
//  betControls — 공통 베팅 UI
//  칩(판돈) + 리스크 슬라이더(선택) + 확률·배당 실시간 표시(투명성 원칙).
//  게임이 betUI.risk / preview()를 제공하면 자동으로 슬라이더·표시가 생긴다.
// ══════════════════════════════════════════════════════════════

import { CHIP_VALUES, DEFAULT_BET } from '../core/economy.js';
import { store } from '../core/store.js';
import { fmt } from './util.js';

/**
 * @param {object} game 게임 모듈 (betUI?, preview? 참조)
 * @returns {{ el, getBet, getRisk, refresh }}
 */
export function createBetControls(game) {
  let bet = DEFAULT_BET;
  const riskCfg = game.betUI && game.betUI.risk;
  let risk = riskCfg ? (riskCfg.default != null ? riskCfg.default : riskCfg.min) : 0;

  const panel = document.createElement('div');
  panel.className = 'betpanel';

  // ── 판돈 칩 ──
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
    refresh();
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

  // ── 리스크 슬라이더(선택) ──
  let riskValEl = null;
  if (riskCfg) {
    const rlabel = document.createElement('div');
    rlabel.className = 'label risklabel';
    const rname = document.createElement('span');
    rname.textContent = riskCfg.label || '난이도';
    riskValEl = document.createElement('span');
    riskValEl.className = 'riskval';
    rlabel.append(rname, riskValEl);
    panel.appendChild(rlabel);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'riskslider';
    slider.min = riskCfg.min;
    slider.max = riskCfg.max;
    slider.step = riskCfg.step || 1;
    slider.value = risk;
    slider.oninput = () => {
      risk = Number(slider.value);
      refresh();
    };
    panel.appendChild(slider);
  }

  // ── 확률·배당 실시간 표시 ──
  let readout = null;
  if (game.preview) {
    readout = document.createElement('div');
    readout.className = 'oddsreadout';
    panel.appendChild(readout);
  }

  function refresh() {
    if (riskCfg && riskValEl) {
      riskValEl.textContent = riskCfg.format ? riskCfg.format(risk) : String(risk);
    }
    if (readout && game.preview) {
      const info = game.preview({ risk, bet });
      if (info) {
        const prob = info.prob != null ? (info.prob * 100).toFixed(1) + '%' : '-';
        const pay = info.payout != null ? info.payout.toFixed(2) + '배' : '-';
        const win = info.payout != null ? Math.floor(bet * info.payout) : 0;
        readout.innerHTML =
          '<span>당첨확률 <b>' + prob + '</b></span><span>배당 <b>' + pay + '</b></span><span>적중 시 <b>+' + fmt(win) + 'P</b></span>';
      }
    }
  }
  refresh();

  return {
    el: panel,
    getBet: () => bet,
    getRisk: () => risk,
    refresh,
  };
}
