// 공통 UI 유틸

/** 숫자를 한국식 천단위 콤마 문자열로 */
export function fmt(n) {
  return Number(n).toLocaleString('ko-KR');
}

/** Promise 기반 대기 */
export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
