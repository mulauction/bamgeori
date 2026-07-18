import { defineConfig } from 'vite';

// 모바일 실기기 테스트를 위해 LAN(0.0.0.0) 바인딩. 휴대폰에서 PC의 IP:5173으로 접속한다.
export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
});
