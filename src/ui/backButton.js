// ══════════════════════════════════════════════════════════════
//  backButton — 안드로이드 하드웨어 뒤로가기 처리
//  씬(게임/상점)이 열려 있으면 닫고, 홈이면 앱을 종료한다.
//  웹(브라우저/Pages)에서는 backButton 이벤트가 발생하지 않아 무해하다.
// ══════════════════════════════════════════════════════════════

import { App } from '@capacitor/app';

/**
 * @param {object} opts
 * @param {()=>boolean} opts.isSceneOpen 씬이 열려 있는지
 * @param {()=>void} opts.closeScene 씬 닫기
 */
export function initBackButton({ isSceneOpen, closeScene }) {
  App.addListener('backButton', () => {
    if (isSceneOpen()) {
      closeScene();
    } else {
      App.exitApp();
    }
  });
}
