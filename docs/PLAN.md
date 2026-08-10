# AI 노컷뉴스 — 개발 플랜

## 현재 범위
RSS 톱뉴스 수집 → AI 요약(Short/Original) + 유튜브 영상(Watch) + 로그인·관심사·좋아요.
- Short    : AI 요약 카드 피드 (StoryStream 타임라인). `is_featured` 기사엔 Pick 배지
- Original : RSS 원문 + 노컷 원문 링크
- Watch    : 유튜브 채널 영상 그리드
- Like     : ✅ 관심사 칩 + 맞춤 피드. 좋아요한 기사는 `/like/saved`
- Me       : ✅ Google 로그인 · 설정. 구독은 "곧 제공됩니다" 플레이스홀더
- /admin   : ✅ 요약 수정 · Pick 배치 · 삭제 (`ADMIN_EMAILS` 화이트리스트)

## 확장 대비 (아직 미구현, 구조만 열어둠)
기사 작성 툴·에디터를 추후 "데이터 마이그레이션 없이" 붙일 수 있게:
- articles.source_type ('rss' 기본) — 추후 'manual' 수기 기사 공존
- articles.status 제약에 draft/scheduled 미리 허용 — 추후 검수·예약발행
- profiles / article_revisions 테이블, 역할 RLS는 0002에 주석으로 자리만 예약

관리자 라우트(/admin)는 예약해둔 대로 **구현 완료**. 역할 테이블 대신 `ADMIN_EMAILS`
환경변수 화이트리스트로 게이팅하고, 쓰기는 service_role 클라이언트를 쓴다. 편집자가 늘어나
DB 기반 역할 관리가 필요해지면 0002에 예약된 profiles 테이블로 옮긴다.

## 아키텍처
- 프론트: Next.js (App Router) → Vercel, ISR 5분
- DB/Auth: Supabase (Postgres + RLS, 공개 read만 활성)
- 파이프라인: 독립 스크립트(scripts/ingest.mjs) — GitHub Actions 매시간: RSS → OpenRouter 요약 → 적재
- DNS: Cloudflare (nocut.news)

## 디자인
The Verge 시스템 + 노컷 액센트(레드 #ff2d4f / 블루 #1a56ff). 다크 캔버스,
색블록 타일, StoryStream 타임라인, 모노 대문자 라벨. Pretendard + IBM Plex Mono.

## 진행 순서
1. ✅ Supabase 생성 → migrate.mjs로 0001~0004 적용
2. ✅ ingest 파이프라인 가동: GitHub Actions(.github/workflows/ingest.yml) 매시간
3. ✅ apps/web: npm install → .env.local → npm run dev
4. ✅ 인증(Google) + Like + Me — 구독 결제는 미착수
5. ✅ 관리자 페이지 — 기사 작성 에디터는 미착수  ← 0002에서 자리 예약됨
6. (추후) 토스인앱 / 앱 패키징

배포는 Git 연동이 아니라 `cd apps/web && vercel --prod` (README 배포 절 참고).
