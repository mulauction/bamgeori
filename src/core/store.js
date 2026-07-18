// ══════════════════════════════════════════════════════════════
//  store.js — 단일 상태 스토어 (포인트 · 보유 자산 · 통계)
//  저장은 save/load 어댑터로 분리해 추후 Capacitor Preferences/서버 전환에 대비한다.
//  통계 기록은 economy 정산 함수의 훅(recordWager/recordLabor)에서만 호출된다.
// ══════════════════════════════════════════════════════════════

import { START_POINTS, COMEBACK_THRESHOLD } from './economy.js';

const SAVE_KEY = 'bamgeori.save.v1';

// ── 저장 어댑터 (localStorage) ─────────────────────────────────
// 추후 서버/Preferences 저장으로 교체할 때 이 어댑터만 바꾼다.
const localStorageAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save(data) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      /* 저장 실패 무시(사파리 프라이빗 모드 등) */
    }
  },
};

// 현재 시각 ISO (테스트 주입 가능하도록 분리)
function nowISO() {
  return new Date().toISOString();
}

function makeDefaultStats() {
  return {
    firstPlayDate: null, // 첫 기록 시각(ISO)
    totalPlays: 0, // 총 판수(승부만)
    wins: 0,
    losses: 0,
    totalWon: 0, // 승리 획득 합계
    totalLost: 0, // 패배 상실(판돈) 합계
    bestJackpot: null, // { game, multiplier, amount, date }
    currentStreak: 0, // 현재 연승(패배 시 0)
    maxWinStreak: 0,
    curLoseStreak: 0, // 내부: 현재 연패
    maxLoseStreak: 0,
    laborIncome: 0, // 노동 총수입
    bankruptcies: 0, // 파산 횟수
    comebacks: 0, // 재기 횟수
    isBankrupt: false, // 현재 파산 상태
    perGame: {}, // { [gameId]: { plays, wins, losses, won, lost, best } }
  };
}

function makeDefaultMeta() {
  return { muted: false };
}

function createStore(adapter) {
  const state = {
    points: START_POINTS,
    owned: [], // 과시템 id 배열
    stats: makeDefaultStats(),
    meta: makeDefaultMeta(),
  };
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) fn(state);
  }
  function persist() {
    adapter.save({ points: state.points, owned: state.owned, stats: state.stats, meta: state.meta });
  }

  function perGame(gameId) {
    if (!state.stats.perGame[gameId]) {
      state.stats.perGame[gameId] = { plays: 0, wins: 0, losses: 0, won: 0, lost: 0, best: 0 };
    }
    return state.stats.perGame[gameId];
  }

  return {
    // ── 초기화: 저장본 로드 ──
    init() {
      const data = adapter.load();
      if (data) {
        state.points = Number.isFinite(data.points) ? data.points : START_POINTS;
        state.owned = Array.isArray(data.owned) ? data.owned : [];
        state.stats = { ...makeDefaultStats(), ...(data.stats || {}) };
        // perGame 누락 방어
        if (!state.stats.perGame || typeof state.stats.perGame !== 'object') state.stats.perGame = {};
        state.meta = { ...makeDefaultMeta(), ...(data.meta || {}) };
      }
      emit();
    },

    // ── 포인트 ──
    getPoints() {
      return state.points;
    },
    setPoints(n) {
      state.points = Math.max(0, Math.floor(n));
      persist();
      emit();
    },
    addPoints(delta) {
      this.setPoints(state.points + delta);
    },

    // ── 자산(과시템) ──
    getAssets() {
      return [...state.owned];
    },
    hasAsset(id) {
      return state.owned.includes(id);
    },
    addAsset(id) {
      if (!state.owned.includes(id)) {
        state.owned.push(id);
        persist();
        emit();
      }
    },

    // ── 설정(음소거 등) — 어댑터 경유 저장 ──
    isMuted() {
      return !!state.meta.muted;
    },
    setMuted(v) {
      state.meta.muted = !!v;
      persist();
      emit();
    },

    // ══════════════════════════════════════════════════════════
    //  통계 기록 — economy 정산 훅에서만 호출한다
    // ══════════════════════════════════════════════════════════
    /**
     * 승부 1판 결과 기록. (economy.settleWager 내부에서 addPoints 이후 호출)
     * @param {{gameId:string, win:boolean, bet:number, gain:number, multiplier:number}} r
     */
    recordWager({ gameId, win, bet, gain, multiplier }) {
      const s = state.stats;
      if (!s.firstPlayDate) s.firstPlayDate = nowISO();
      s.totalPlays++;
      const g = perGame(gameId);
      g.plays++;

      if (win) {
        s.wins++;
        s.totalWon += gain;
        g.wins++;
        g.won += gain;
        if (gain > g.best) g.best = gain;
        s.currentStreak++;
        if (s.currentStreak > s.maxWinStreak) s.maxWinStreak = s.currentStreak;
        s.curLoseStreak = 0;
        // 인생 최고 잭팟: 금액 기준 갱신
        if (!s.bestJackpot || gain > s.bestJackpot.amount) {
          s.bestJackpot = { game: gameId, multiplier, amount: gain, date: nowISO() };
        }
      } else {
        s.losses++;
        s.totalLost += bet;
        g.losses++;
        g.lost += bet;
        s.currentStreak = 0;
        s.curLoseStreak++;
        if (s.curLoseStreak > s.maxLoseStreak) s.maxLoseStreak = s.curLoseStreak;
        // 파산 전이: 잔액 0 도달(중복 카운트 방지)
        if (state.points <= 0 && !s.isBankrupt) {
          s.isBankrupt = true;
          s.bankruptcies++;
        }
      }
      persist();
      emit();
    },

    /**
     * 노동 수입 기록. (economy.settleLabor 내부에서 addPoints 이후 호출)
     * @param {{gain:number}} r
     */
    recordLabor({ gain }) {
      const s = state.stats;
      if (!s.firstPlayDate) s.firstPlayDate = nowISO();
      s.laborIncome += gain;
      // 재기 전이: 파산 상태에서 노동으로 재기 임계치 도달
      if (s.isBankrupt && state.points >= COMEBACK_THRESHOLD) {
        s.isBankrupt = false;
        s.comebacks++;
      }
      persist();
      emit();
    },

    // ── 상태 조회 ──
    isBankrupt() {
      return !!state.stats.isBankrupt;
    },
    getStats() {
      // 디버그용 깊은 복사
      return JSON.parse(JSON.stringify(state.stats));
    },

    // ── 구독 ──
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // ── 완전 초기화(디버그·테스트용) ──
    reset() {
      state.points = START_POINTS;
      state.owned = [];
      state.stats = makeDefaultStats();
      state.meta = makeDefaultMeta();
      persist();
      emit();
    },
  };
}

// 앱 전역 단일 스토어
export const store = createStore(localStorageAdapter);
