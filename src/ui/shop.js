// ══════════════════════════════════════════════════════════════
//  전당포 — 과시(외형) 아이템 상점
//  포인트로만 구매. 현금 결제·판돈 전환 없음(경제 원칙).
//  구매 정산(포인트 차감)은 store를 통해서만 처리한다.
// ══════════════════════════════════════════════════════════════

import { WARES } from '../core/economy.js';
import { store } from '../core/store.js';
import { fmt } from './util.js';
import { toast } from './toast.js';

let unsub = null;
let listEl = null;

function render() {
  if (!listEl) return;
  const P = store.getPoints();
  listEl.innerHTML = '';
  WARES.forEach((w) => {
    const has = store.hasAsset(w.id);
    const d = document.createElement('div');
    d.className = 'ware' + (has ? ' owned' : '');
    d.innerHTML =
      '<span class="icon">' + w.icon + '</span>' +
      '<span class="info"><b>' + w.name + '</b><small>' + w.desc + '</small></span>' +
      '<button class="buy" ' + (has ? 'disabled' : '') + '>' +
      (has ? '보유 중' : fmt(w.price) + 'P') +
      '</button>';
    if (!has) {
      const btn = d.querySelector('.buy');
      btn.disabled = P < w.price;
      btn.onclick = () => {
        if (store.getPoints() < w.price) return;
        store.addPoints(-w.price);
        store.addAsset(w.id);
        toast(w.icon + ' ' + w.name + ' 획득! 골목에 소문이 퍼집니다');
      };
    }
    listEl.appendChild(d);
  });
}

export default {
  id: 'mall',
  name: '황금 전당포',
  sub: '판돈으로는 못 씁니다. 오직 자랑을 위한 물건들.',

  mount(container) {
    listEl = document.createElement('div');
    listEl.className = 'wares';
    container.appendChild(listEl);
    render();
    // 포인트/자산 변동 시 목록(구매 가능 여부) 갱신
    unsub = store.subscribe(render);
  },

  unmount() {
    unsub?.();
    unsub = null;
    if (listEl) listEl.remove();
    listEl = null;
  },
};
