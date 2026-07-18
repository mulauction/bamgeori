// ══════════════════════════════════════════════════════════════
//  main.js — 앱 진입점
//  스토어 로드 → HUD → 3D 거리 → 화면 라우팅(게임/상점) 연결.
// ══════════════════════════════════════════════════════════════

import './style.css';

import { store } from './core/store.js';
import { audio } from './core/audio.js';
import { initHud } from './ui/hud.js';
import { createStreet } from './street/index.js';
import { mountGameScreen } from './ui/gameScreen.js';
import { initBackButton } from './ui/backButton.js';
import { initBankruptcy } from './ui/bankruptcy.js';

// 게임 4종 (공통 인터페이스)
import yabawi from './games/yabawi/index.js';
import dograce from './games/dograce/index.js';
import cockfight from './games/cockfight/index.js';
import workDaeri from './games/work-daeri/index.js';
// 전당포(과시템 상점)
import shop from './ui/shop.js';

// scene id → 게임 모듈
const GAMES = {
  yabawi,
  dograce,
  cockfight,
  'work-daeri': workDaeri,
};

const homeEl = document.getElementById('home');
const screenEl = document.getElementById('screen');

let current = null; // { unmount() }

// ── 상점(전당포) 화면: 뒤로가기 + 제목 + 내용 ──
function mountShopScreen(container, mod, onBack) {
  const scene = document.createElement('div');
  scene.className = 'scene';

  const back = document.createElement('button');
  back.className = 'back';
  back.textContent = '← 거리로';
  back.onclick = onBack;
  scene.appendChild(back);

  const h2 = document.createElement('h2');
  h2.textContent = mod.name;
  scene.appendChild(h2);

  if (mod.sub) {
    const sub = document.createElement('p');
    sub.className = 'sub';
    sub.textContent = mod.sub;
    scene.appendChild(sub);
  }

  const box = document.createElement('div');
  scene.appendChild(box);
  mod.mount(box);

  container.appendChild(scene);
  return {
    unmount() {
      mod.unmount();
      scene.remove();
    },
  };
}

// ── 라우팅 ──
function openScreen(id) {
  street.setActive(false);
  homeEl.style.display = 'none';
  screenEl.classList.add('on');
  window.scrollTo(0, 0);

  if (id === 'mall') {
    current = mountShopScreen(screenEl, shop, closeScreen);
  } else {
    const game = GAMES[id];
    if (!game) {
      closeScreen();
      return;
    }
    current = mountGameScreen(screenEl, game, closeScreen);
  }
}

function closeScreen() {
  current?.unmount();
  current = null;
  screenEl.classList.remove('on');
  homeEl.style.display = 'block';
  street.setActive(true);
  window.scrollTo(0, 0);
}

// ── 사운드: 음소거 상태 동기화 + 첫 제스처 unlock + 음소거 토글 버튼 ──
function initAudioControls() {
  audio.setMuted(store.isMuted());

  // 모바일 웹뷰 정책: 첫 유저 제스처에서만 오디오 시작
  const unlock = () => {
    audio.unlock();
    if (!store.isMuted()) audio.startLoop('ambience');
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });

  // 음소거 토글 버튼(상단바)
  const btn = document.createElement('button');
  btn.id = 'mutebtn';
  const paint = () => (btn.textContent = store.isMuted() ? '🔇' : '🔊');
  paint();
  btn.onclick = () => {
    const next = !store.isMuted();
    store.setMuted(next);
    audio.setMuted(next);
    if (next) audio.stopLoop('ambience');
    else audio.startLoop('ambience');
    paint();
  };
  document.getElementById('topbar').insertBefore(btn, document.getElementById('wallet'));
}

// ── 낮/밤 토글 버튼(상단바) ──
function initDayNight() {
  const btn = document.createElement('button');
  btn.id = 'daybtn';
  const paint = () => (btn.textContent = store.isDay() ? '☀️' : '🌙');
  paint();
  btn.onclick = () => {
    const next = !store.isDay();
    store.setDay(next);
    street.setDayNight(next);
    paint();
  };
  document.getElementById('topbar').insertBefore(btn, document.getElementById('wallet'));
}

// ── 부팅 ──
store.init(); // 저장본 로드(포인트·자산·설정 복원)
initHud();
initAudioControls();
initBankruptcy(); // 파산·재기 연출(화면 명도·훈장 토스트)
const street = createStreet({ onEnter: openScreen });
initDayNight();

// 안드로이드 하드웨어 뒤로가기 → 씬 닫기(홈이면 앱 종료)
initBackButton({
  isSceneOpen: () => current !== null,
  closeScene: closeScreen,
});

// 디버그 콘솔 핸들 (UI 없음) — 통계/상태 확인 및 초기화용
// 사용 예: __bamgeori.stats() / __bamgeori.reset()
window.__bamgeori = {
  stats: () => store.getStats(),
  isBankrupt: () => store.isBankrupt(),
  points: () => store.getPoints(),
  assets: () => store.getAssets(),
  reset: () => store.reset(),
};
