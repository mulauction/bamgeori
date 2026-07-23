// ══════════════════════════════════════════════════════════════
//  statsPanel — 내 전적 대시보드 (홈 화면)
//  store.stats를 읽어 판수·승률·최고잭팟·연승/연패·파산/재기 등을 표시.
// ══════════════════════════════════════════════════════════════

import { store } from '../core/store.js';
import { PLACES } from '../games/registry.js';
import { fmt } from './util.js';

function gameName(id) {
  const p = PLACES.find((pl) => pl.id === id);
  return p ? p.sign : id;
}

export function initStats() {
  const home = document.getElementById('home');
  const sec = document.createElement('div');
  sec.id = 'statsboard';
  sec.innerHTML = '<h2>내 전적</h2><div class="statgrid"></div>';
  home.appendChild(sec);
  const grid = sec.querySelector('.statgrid');

  function render() {
    const s = store.getStats();
    const winRate = s.totalPlays ? ((s.wins / s.totalPlays) * 100).toFixed(1) + '%' : '-';
    const jp = s.bestJackpot;
    const tiles = [
      ['총 판수', s.totalPlays],
      ['승률', winRate],
      ['전적', s.wins + '승 ' + s.losses + '패'],
      ['현재 연승', s.currentStreak],
      ['최대 연승', s.maxWinStreak],
      ['최대 연패', s.maxLoseStreak],
      ['총 획득', fmt(s.totalWon) + 'P'],
      ['총 상실', fmt(s.totalLost) + 'P'],
      ['노동 수입', fmt(s.laborIncome) + 'P'],
      ['파산 / 재기', s.bankruptcies + ' / ' + s.comebacks],
      ['최고 잭팟', jp ? fmt(jp.amount) + 'P' : '-'],
      ['잭팟 게임', jp ? gameName(jp.game) + ' ×' + jp.multiplier : '-'],
    ];
    grid.innerHTML = tiles
      .map((t) => '<div class="stattile"><div class="k">' + t[0] + '</div><div class="v">' + t[1] + '</div></div>')
      .join('');
  }
  store.subscribe(render);
  render();
}
