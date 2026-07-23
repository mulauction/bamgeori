# 자율 세션 리포트

라이브: https://mulauction.github.io/bamgeori/ · 리포: https://github.com/mulauction/bamgeori

작업마다 갱신. 상세 계획은 `WORKPLAN.md`, 결정은 `DECISIONS.md`.

## 진행 현황
- 🔵 진행 중: A1 게임 레지스트리
- ✅ 완료: (없음)
- ⏸️ 보류: (없음)

## 결정 요약
- 카탈로그 docx 부재 → 백로그 번안명 + 표준 카지노 수학. RTP=0.95 economy 단일 관리.
- 게임 인터페이스에 district/sign/color/betUI 추가. 레지스트리로 가게 자동 배치.

## 아침에 폰으로 확인할 포인트
- (작업 완료 시 추가)

## 검증 한계
- 로컬 dev 서버 미실행(M1 커널패닉 규칙). 게이트 = node --check + esbuild 번들 + eslint no-undef + CI 빌드.
- 3D 런타임/레이아웃/성능은 폰 확인 필요.
