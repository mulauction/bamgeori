// ══════════════════════════════════════════════════════════════
//  가위바위보 좌판 (즉석 운) — NPC와 대결. 승 1.85배 / 무 판돈반환 / 패.
//  EV: (1/3)·MULT + (1/3)·1 = RTP → MULT = 3·RTP − 1.
// ══════════════════════════════════════════════════════════════

import { RTP, round2 } from '../../core/economy.js';
import { wait } from '../../ui/util.js';
import { toast } from '../../ui/toast.js';
import { createTableScene } from '../tableScene.js';
import { makeVoxelPerson } from '../voxel.js';
import { makeBlobShadow } from '../visuals.js';

const MULT = round2(3 * RTP - 1); // 1.85
const HANDS = ['가위', '바위', '보'];
const EMOJI = { 가위: '✌️', 바위: '✊', 보: '✋' };
const BEATS = { 가위: '보', 바위: '가위', 보: '바위' };

let view = null;
let npc = null;
let pickBox = null;
let pick = '';
let busy = false;

function buildPicks() {
  pickBox.innerHTML = '';
  pick = '';
  HANDS.forEach((h) => {
    const b = document.createElement('button');
    b.className = 'dogbtn';
    b.textContent = EMOJI[h] + ' ' + h;
    b.onclick = () => {
      if (busy) return;
      pickBox.querySelectorAll('.dogbtn').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      pick = h;
    };
    pickBox.appendChild(b);
  });
}

export default {
  id: 'rps',
  name: '가위바위보 좌판',
  sub: '한 판 승부. 이기면 1.85배, 비기면 판돈 반환.',
  sign: '가위바위보',
  color: '#ffb0d0',
  district: 'main',
  actionLabel: '내기!',
  minBet: 500,
  kind: 'wager',
  preview() {
    return { prob: 1 / 3, payout: MULT };
  },

  mount(container) {
    pickBox = document.createElement('div');
    pickBox.className = 'pick2';
    container.appendChild(pickBox);
    buildPicks();
    const T = createTableScene(container, { bg: 0x1a1420, tableColor: 0x4a3a5a });
    view = T.view;
    // 상대 NPC
    npc = makeVoxelPerson({ skin: 0xe6b58c, shirt: 0x6e3550 });
    npc.position.set(0, 0, -1.4);
    npc.rotation.y = Math.PI; // 플레이어를 마주봄 → 뒤통수 대신 정면(대칭이라 무방)
    view.scene.add(npc);
    const sh = makeBlobShadow(0.6);
    sh.position.set(0, T.tableY - 1.04, -1.4);
    view.scene.add(sh);
  },

  isReady() {
    return !!pick;
  },
  reset() {
    busy = false;
    buildPicks();
  },

  async start() {
    busy = true;
    const foe = HANDS[Math.floor(Math.random() * 3)]; // 결과 사전 확정
    // NPC가 손을 내미는 느낌으로 살짝 흔듦
    if (npc) npc.position.z = -1.2;
    await wait(500);
    if (npc) npc.position.z = -1.4;
    toast('나 ' + EMOJI[pick] + ' vs 상대 ' + EMOJI[foe]);
    await wait(700);
    busy = false;
    if (foe === pick) return { push: true };
    if (BEATS[pick] === foe) return { win: true, multiplier: MULT };
    return { win: false, multiplier: 0 };
  },

  unmount() {
    if (view) view.dispose();
    if (pickBox) pickBox.remove();
    view = null;
    npc = null;
    pickBox = null;
    pick = '';
    busy = false;
  },
};
