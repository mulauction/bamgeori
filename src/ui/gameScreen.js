// ══════════════════════════════════════════════════════════════
//  gameScreen — 게임 모듈을 감싸는 공통 화면 호스트
//  베팅 패널 + 액션 버튼 + 결과 표시를 제공하고,
//  포인트 정산은 전부 economy를 통해 일괄 처리한다(게임은 정산 안 함).
// ══════════════════════════════════════════════════════════════

import { createBetPanel } from './betPanel.js';
import { store } from '../core/store.js';
import { audio } from '../core/audio.js';
import { fx, WIN_GRADE } from '../fx/index.js';
import { takeBet, settleWager, settleLabor } from '../core/economy.js';
import { toast } from './toast.js';
import { fmt } from './util.js';

// 승리 등급별 접두 라벨 (fx가 판정한 등급을 결과 텍스트에 반영)
const GRADE_LABEL = {
  [WIN_GRADE.BIGWIN]: '빅윈! ',
  [WIN_GRADE.JACKPOT]: '잭팟! ',
};

/**
 * 게임 화면을 컨테이너에 마운트한다.
 * @param {HTMLElement} container 화면 루트(#screen)
 * @param {object} game 공통 인터페이스 게임 모듈
 * @param {()=>void} onBack 뒤로가기 콜백
 * @returns {{ unmount: ()=>void }}
 */
export function mountGameScreen(container, game, onBack) {
  let alive = true;

  const scene = document.createElement('div');
  scene.className = 'scene';

  const back = document.createElement('button');
  back.className = 'back';
  back.textContent = '← 거리로';
  back.onclick = () => onBack();
  scene.appendChild(back);

  const h2 = document.createElement('h2');
  h2.textContent = game.name;
  scene.appendChild(h2);

  if (game.sub) {
    const sub = document.createElement('p');
    sub.className = 'sub';
    sub.textContent = game.sub;
    scene.appendChild(sub);
  }

  const isWager = game.kind !== 'labor';

  let betPanel = null;
  if (isWager) {
    betPanel = createBetPanel();
    scene.appendChild(betPanel.el);
  }

  // 게임이 그려지는 컨테이너
  const gameBox = document.createElement('div');
  scene.appendChild(gameBox);

  const result = document.createElement('div');
  result.className = 'result';

  const ctx = { store, fx, audio };
  game.mount(gameBox, ctx);

  // ── 결과 표시 ─────────────────────────────────────────────
  function showWager(win, gain, bet, multiplier) {
    if (win) {
      const grade = fx.gradeOf(multiplier);
      result.textContent = (GRADE_LABEL[grade] || '') + '승리! +' + fmt(gain) + 'P';
      result.className = 'result win';
    } else {
      result.textContent = '패배… -' + fmt(bet) + 'P';
      result.className = 'result lose';
      if (store.getPoints() <= 0) {
        setTimeout(() => toast('빈털터리… 새벽 대리운전이 기다립니다'), 700);
      }
    }
  }

  function showLabor(success, gain) {
    result.textContent = success ? '무사 도착! +' + fmt(gain) + 'P' : '지각 도착… +' + fmt(gain) + 'P';
    result.className = 'result ' + (success ? 'win' : 'lose');
  }

  // ── 승부 게임: 액션 버튼 ───────────────────────────────────
  if (isWager) {
    const go = document.createElement('button');
    go.className = 'go';
    go.textContent = game.actionLabel || '시작';
    go.onclick = async () => {
      if (typeof game.isReady === 'function' && !game.isReady()) {
        toast('먼저 선택하세요');
        return;
      }
      const bet = takeBet(store, betPanel.getBet());
      if (bet === null) {
        toast('판돈이 없습니다. 대리운전으로 재기하세요');
        return;
      }
      result.textContent = '';
      result.className = 'result';
      go.disabled = true;
      const { win, multiplier } = await game.start(bet);
      if (!alive) return;
      const gain = settleWager(store, { win, bet, multiplier, gameId: game.id });
      // 승리 등급 연출(fx) — 사운드/파티클/진동. 패배는 짧고 담백.
      if (win) {
        await fx.playWin(fx.gradeOf(multiplier), { amount: gain, multiplier, gameName: game.name });
        if (!alive) return;
      } else {
        fx.playLose();
      }
      showWager(win, gain, bet, multiplier);
      go.disabled = false;
      game.reset?.();
    };
    scene.appendChild(go);
    scene.appendChild(result);
  } else {
    // ── 노동 게임: 판돈/버튼 없이 라운드 반복 ──
    scene.appendChild(result);
    (async function runLabor() {
      while (alive) {
        const r = await game.start();
        if (!alive || r.aborted) break;
        const gain = settleLabor(store, r.win);
        showLabor(r.win, gain);
        game.reset?.();
      }
    })();
  }

  container.appendChild(scene);

  return {
    unmount() {
      alive = false;
      game.unmount();
      scene.remove();
    },
  };
}
