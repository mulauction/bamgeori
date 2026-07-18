// ══════════════════════════════════════════════════════════════
//  HUD — 지갑(포인트) + 내 자산(과시템) 표시. store 구독으로 자동 갱신.
// ══════════════════════════════════════════════════════════════

import { store } from '../core/store.js';
import { WARES } from '../core/economy.js';
import { fmt } from './util.js';

let walletEl = null;
let garageEl = null;
let prevPoints = null;

function renderWallet() {
  const P = store.getPoints();
  walletEl.innerHTML = fmt(P) + '<small> P</small>';
  // 값이 바뀌었을 때만 bump 애니메이션 재생
  if (prevPoints !== null && prevPoints !== P) {
    walletEl.classList.remove('bump');
    void walletEl.offsetWidth; // 리플로우로 애니메이션 리셋
    walletEl.classList.add('bump');
  }
  prevPoints = P;
}

function renderGarage() {
  const owned = store.getAssets();
  if (owned.length === 0) {
    garageEl.innerHTML = '<span class="empty">아직 빈손입니다. 골목은 깁니다.</span>';
    return;
  }
  garageEl.innerHTML = '';
  WARES.filter((w) => owned.includes(w.id)).forEach((w) => {
    const c = document.createElement('div');
    c.className = 'asset-chip';
    c.innerHTML = '<b>' + w.icon + '</b>' + w.name;
    garageEl.appendChild(c);
  });
}

export function initHud() {
  walletEl = document.getElementById('wallet');
  garageEl = document.getElementById('garage');
  store.subscribe(() => {
    renderWallet();
    renderGarage();
  });
  renderWallet();
  renderGarage();
}
