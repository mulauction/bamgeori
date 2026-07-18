// ══════════════════════════════════════════════════════════════
//  economy.js — 확률·배당·정산의 단일 소스
//  밸런싱 시 이 파일 한 곳만 수정한다. 다른 파일에 수치 하드코딩 금지.
// ══════════════════════════════════════════════════════════════

/** 시작 자금 */
export const START_POINTS = 10000;

/** 재기 임계치 — 파산 후 노동으로 이 금액에 도달하면 '재기'로 간주 */
export const COMEBACK_THRESHOLD = 5000;

/** 베팅 칩 프리셋 (마지막 '올인'은 UI에서 보유 전액으로 치환) */
export const CHIP_VALUES = [500, 1000, 5000, 10000, '올인'];
export const DEFAULT_BET = 1000;

/** 승리 연출 등급 임계값 (배당 배수 기준) — fx가 이 값으로 등급 판정 */
export const GRADE = {
  BIGWIN: 5, // 5배 이상 빅윈
  JACKPOT: 10, // 10배 이상 잭팟
};

// ── 게임별 배당·확률 ─────────────────────────────────────────────
export const CONFIG = {
  // 야바위: 3컵 중 하나, 적중 시 2배
  yabawi: {
    cups: 3,
    multiplier: 2.0,
    shuffleTimes: 8, // 셔플 횟수
  },

  // 개경주: 배당(odds)과 승리 가중치(weight)
  dograce: {
    // odds = 승리 시 배수, weight = 승리 확률 가중치
    dogs: [
      { name: '번개', odds: 1.8, weight: 45, color: '#c98a4a' },
      { name: '흰둥이', odds: 2.5, weight: 28, color: '#efe6d8' },
      { name: '검은발', odds: 4.0, weight: 17, color: '#3a3a4a' },
      { name: '복실이', odds: 7.0, weight: 10, color: '#e0b3ff' },
    ],
  },

  // 닭싸움: 능력치는 공개되지만 결과는 실제 확률로. 승리 시 1.9배
  cockfight: {
    multiplier: 1.9,
    names: ['천둥', '불주먹', '회오리', '쌍칼', '벼락', '돌쇠', '장군', '번개발'],
    atk: { min: 8, span: 8 }, // 공격력 8~15
    hp: { min: 80, span: 41 }, // 체력 80~120
    dmgFactor: { base: 0.6, span: 0.9 }, // 타격 데미지 = atk * (base ~ base+span)
  },

  // 새벽 대리운전(노동): 판돈 없음. 성공/지각 고정 보상
  work: {
    target: 15, // 목표 탭 횟수
    timeLimit: 8000, // 제한시간(ms)
    rewardSuccess: 1500,
    rewardLate: 500,
  },
};

// ── 전당포(과시템) 가격 ──────────────────────────────────────────
// 포인트로 구매하지만 판돈으로 되돌릴 수 없는 순수 과시 아이템.
// cat: 'wear'(착용) | 'ride'(탈것) | 'space'(공간). slot: 착용 아이템은 캐릭터 반영 키.
export const WARES = [
  { id: 'bike', icon: '🚲', name: '중고 자전거', desc: '그래도 걷는 것보단 낫다', price: 5000, cat: 'ride' },
  { id: 'sunglasses', icon: '🕶️', name: '선글라스', desc: '밤에도 낀다. 그게 멋이다', price: 8000, cat: 'wear' },
  { id: 'hat', icon: '🎩', name: '중절모', desc: '골목 신사의 기본', price: 15000, cat: 'wear' },
  { id: 'car', icon: '🚙', name: '중고차', desc: '골목에서 처음 받는 시선', price: 30000, cat: 'ride' },
  { id: 'goldshoes', icon: '👟', name: '금 신발', desc: '한 걸음마다 반짝인다', price: 40000, cat: 'wear' },
  { id: 'necklace', icon: '📿', name: '금목걸이', desc: '원거리에서도 보이는 부의 신호', price: 120000, cat: 'wear' },
  { id: 'sport', icon: '🏎️', name: '스포츠카', desc: '포장마차 앞 주차 금지 무시 가능', price: 200000, cat: 'ride' },
  { id: 'aura', icon: '✨', name: '황금 오라', desc: '몸에서 빛이 난다. 진짜로', price: 500000, cat: 'wear' },
  { id: 'apt', icon: '🏠', name: '강변 아파트', desc: '닭싸움장 사장이 인사를 한다', price: 1000000, cat: 'space' },
  { id: 'bld', icon: '🏢', name: '골목 빌딩', desc: '이 거리 가게들이 내 세입자', price: 5000000, cat: 'space' },
  { id: 'statue', icon: '🗿', name: '광장 동상', desc: '거리 이름이 당신 이름으로 바뀝니다', price: 20000000, cat: 'space' },
];

// ══════════════════════════════════════════════════════════════
//  정산 로직 — 포인트 증감은 전부 여기서 처리한다(게임 모듈 직접 정산 금지)
// ══════════════════════════════════════════════════════════════

/**
 * 판돈 차감. 보유액을 넘으면 전액으로 클램프.
 * @returns {number|null} 실제 차감된 판돈. 판돈이 없으면 null.
 */
export function takeBet(store, bet) {
  const P = store.getPoints();
  if (bet <= 0 || P <= 0) return null;
  const actual = Math.min(bet, P);
  store.addPoints(-actual);
  return actual;
}

/**
 * 승부 정산. 승리 시 판돈 × 배수를 지급(판돈은 takeBet에서 이미 차감됨).
 * 정산 직후 통계 기록 훅(store.recordWager)을 호출한다 — 기록의 유일한 진입점.
 * @returns {number} 획득 포인트(패배 시 0)
 */
export function settleWager(store, { win, bet, multiplier, gameId }) {
  const gain = win ? Math.floor(bet * multiplier) : 0;
  if (gain > 0) store.addPoints(gain);
  store.recordWager({ gameId, win: !!win, bet, gain, multiplier });
  return gain;
}

/**
 * 노동(재기) 정산. 성공/지각에 따른 고정 보상.
 * 정산 직후 통계 기록 훅(store.recordLabor)을 호출한다.
 * @returns {number} 획득 포인트
 */
export function settleLabor(store, success) {
  const gain = success ? CONFIG.work.rewardSuccess : CONFIG.work.rewardLate;
  store.addPoints(gain);
  store.recordLabor({ gain });
  return gain;
}
