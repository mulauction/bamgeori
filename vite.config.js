import { defineConfig } from 'vite';

// base: './' — 상대 경로 산출물. GitHub Pages(하위 경로)와 Capacitor 웹뷰(file://) 양쪽에서 동작.
// 모바일 실기기 테스트를 위해 LAN(0.0.0.0) 바인딩. 휴대폰에서 PC의 IP:5173으로 접속한다.
export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
});
