// ══════════════════════════════════════════════════════════════
//  marquee — 거리 전광판 문구 예약 큐
//  잭팟 연출(P3)이 문구를 push하고, 거리 전광판(P6)이 consume/구독한다.
// ══════════════════════════════════════════════════════════════

const queue = [];
const listeners = new Set();

export const marquee = {
  push(msg) {
    queue.push(msg);
    for (const fn of listeners) fn(msg);
  },
  consume() {
    return queue.shift() || null;
  },
  hasNext() {
    return queue.length > 0;
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
