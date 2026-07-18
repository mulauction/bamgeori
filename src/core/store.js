// ══════════════════════════════════════════════════════════════
//  store.js — 단일 상태 스토어 (포인트 · 보유 자산)
//  저장은 save/load 인터페이스로 분리해 추후 서버 전환에 대비한다.
// ══════════════════════════════════════════════════════════════

import { START_POINTS } from './economy.js';

const SAVE_KEY = 'bamgeori.save.v1';

// ── 저장 어댑터 (localStorage) ─────────────────────────────────
// 추후 서버 저장으로 교체할 때 이 어댑터만 바꾸면 된다.
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
      /* 저장 실패는 무시(사파리 프라이빗 모드 등) */
    }
  },
};

function createStore(adapter) {
  const state = {
    points: START_POINTS,
    owned: [], // 과시템 id 배열
  };
  const listeners = new Set();

  function emit() {
    for (const fn of listeners) fn(state);
  }

  function persist() {
    adapter.save({ points: state.points, owned: state.owned });
  }

  return {
    // ── 초기화: 저장본 로드 ──
    init() {
      const data = adapter.load();
      if (data) {
        state.points = Number.isFinite(data.points) ? data.points : START_POINTS;
        state.owned = Array.isArray(data.owned) ? data.owned : [];
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

    // ── 구독 ──
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    // ── 완전 초기화(디버그·테스트용) ──
    reset() {
      state.points = START_POINTS;
      state.owned = [];
      persist();
      emit();
    },
  };
}

// 앱 전역 단일 스토어
export const store = createStore(localStorageAdapter);
