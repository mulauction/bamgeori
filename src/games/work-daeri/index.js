// ══════════════════════════════════════════════════════════════
//  새벽 대리운전 — 노동(재기 루트). 판돈 없음 (kind: 'labor')
//  제한시간 안에 목표 횟수만큼 탭하면 성공. 수치는 economy.CONFIG.work.
//  start는 {win} 반환(win=성공 여부). 정산은 economy.settleLabor.
// ══════════════════════════════════════════════════════════════

import { CONFIG } from '../../core/economy.js';

const CFG = CONFIG.work;

let zone = null;
let msgEl = null;
let cntEl = null;
let on = false;
let cnt = 0;
let timer = null;
let roundResolve = null;

function onTap() {
  if (!roundResolve) return; // start()가 활성일 때만 반응
  if (!on) {
    on = true;
    cnt = 0;
    msgEl.textContent = '운전 중! 계속 탭!';
    cntEl.textContent = '0 / ' + CFG.target;
    timer = setTimeout(endRound, CFG.timeLimit);
    return;
  }
  cnt++;
  cntEl.textContent = cnt + ' / ' + CFG.target;
  if (cnt >= CFG.target) {
    clearTimeout(timer);
    endRound();
  }
}

function endRound() {
  if (!roundResolve) return;
  clearTimeout(timer);
  const success = cnt >= CFG.target;
  on = false;
  cntEl.textContent = '';
  const resolve = roundResolve;
  roundResolve = null;
  resolve({ win: success });
}

export default {
  id: 'work-daeri',
  name: '새벽 대리운전',
  sub: '8초 안에 15번 탭하면 손님을 무사히 모십니다. 성공 1,500P / 지각 500P.',
  minBet: 0,
  kind: 'labor',

  mount(container /* , ctx */) {
    zone = document.createElement('div');
    zone.className = 'tapzone';
    zone.innerHTML = '<span class="msg">여기를 탭해서 콜 잡기</span><span class="cnt"></span>';
    msgEl = zone.querySelector('.msg');
    cntEl = zone.querySelector('.cnt');
    zone.onclick = onTap;
    container.appendChild(zone);
  },

  // 한 콜(라운드)을 수행한다. 첫 탭으로 시작 → 목표/시간 종료 시 {win} 반환.
  start() {
    on = false;
    cnt = 0;
    return new Promise((resolve) => {
      roundResolve = resolve;
    });
  },

  reset() {
    on = false;
    cnt = 0;
    clearTimeout(timer);
    if (msgEl) msgEl.textContent = '다시 탭해서 다음 콜';
    if (cntEl) cntEl.textContent = '';
  },

  unmount() {
    clearTimeout(timer);
    // 대기 중인 라운드가 있으면 취소 신호로 해제
    if (roundResolve) {
      const resolve = roundResolve;
      roundResolve = null;
      resolve({ win: false, aborted: true });
    }
    if (zone) zone.remove();
    zone = msgEl = cntEl = null;
    on = false;
    cnt = 0;
  },
};
