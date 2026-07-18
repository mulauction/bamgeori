# 밤거리 승부 (Night Street Hustle)

미니게임 승부 · 자산 경제 · 과시 시스템 기반 3D 복셀 게임. 1인 개발.

- 상세 설계: [`docs/기획서.md`](docs/기획서.md) (원본 `밤거리승부_기획서_v0.1.docx`)
- 개발 원칙·구조: [`CLAUDE.md`](CLAUDE.md)
- 초기 레퍼런스 데모: [`bamgeori-3d-v2.html`](bamgeori-3d-v2.html) (Three.js 단일 파일)

## 현재 단계
**1단계 — 수직 슬라이스.** 위 데모를 모듈 구조로 분해 이식한 상태.
게임 4종(야바위·개경주·닭싸움·대리운전) + 3D 거리 + 경제·파산·과시 최소 구현.

## 실행 (개발 서버)
```bash
npm install
npm run dev
```
`vite.config.js`가 `0.0.0.0`으로 바인딩되어 있어 **휴대폰에서 실기기 테스트**가 가능하다.
- PC와 휴대폰을 같은 Wi-Fi에 두고, 터미널에 표시되는 `Network: http://<PC-IP>:5173` 주소로 접속.
- 조작: 왼손 조이스틱 이동 · 화면 드래그 시점 회전 · 오른쪽 점프 버튼 · 가게 앞에서 입장 버튼.

## 구조
```
src/
  core/    store(포인트·자산·저장) · economy(배당·확률 단일 소스) · audio(스텁)
  street/  scene · character · controls · index(렌더 루프·근접 상점)
  games/   yabawi · dograce · cockfight · work-daeri (공통 인터페이스)
  ui/      betPanel · toast · hud · gameScreen(호스트) · shop · util
  fx/      승리 등급 판정(일반/빅윈/잭팟)
```

### 미니게임 공통 인터페이스
```js
export default {
  id, name, minBet, kind,   // kind: 'wager' | 'labor'
  mount(container, ctx),    // ctx = { store, fx, audio }
  start(bet),               // Promise<{ win, multiplier }>
  reset(), unmount(),
  isReady(),                // (선택) 사전 선택 필요 게임의 준비 여부
}
```
- 포인트 정산은 게임 모듈이 직접 하지 않고 `core/economy`가 일괄 처리한다.
- 확률·배당 수치는 전부 `src/core/economy.js` 한 곳에만 둔다.
