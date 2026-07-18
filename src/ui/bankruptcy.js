// ══════════════════════════════════════════════════════════════
//  bankruptcy — 파산·재기 연출 컨트롤러
//  P1의 상태 전이(store.isBankrupt/stats.comebacks)를 구독해
//  화면 명도 저하 + 재기 훈장 토스트를 붙인다.
//  (캐릭터 남루·걸음 처짐·출입 금지는 street에서 처리)
// ══════════════════════════════════════════════════════════════

import { store } from '../core/store.js';
import { toast } from './toast.js';

function apply(bankrupt) {
  document.body.classList.toggle('bankrupt', bankrupt);
}

export function initBankruptcy() {
  let prevBankrupt = store.isBankrupt();
  let prevComebacks = store.getStats().comebacks;
  apply(prevBankrupt);

  store.subscribe(() => {
    const b = store.isBankrupt();
    const cb = store.getStats().comebacks;
    if (b !== prevBankrupt) {
      apply(b);
      if (b) toast('빈털터리… 새벽 대리운전만 문이 열려 있습니다');
    }
    if (cb > prevComebacks) {
      toast('🎖 재기의 훈장! 골목이 다시 밝아집니다');
    }
    prevBankrupt = b;
    prevComebacks = cb;
  });
}
